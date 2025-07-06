import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';

// TMDB API配置
const BASE_URL = 'https://api.themoviedb.org/3';
// 备用代理服务器
const PROXY_URLS = [
  'https://api.themoviedb.org/3', // 直连
  'https://api.tmdb.org/3', // 官方备用域名
];

// 添加超时处理的fetch函数
const fetchWithTimeout = async (url: string, options = {}, timeout = 20000) => {
  const controller = new AbortController();
  const id = setTimeout(() => controller.abort(), timeout);
  
  try {
    const response = await fetch(url, {
      ...options,
      signal: controller.signal,
      // 添加更多的请求选项
      cache: 'no-store', // 禁用缓存
      next: { revalidate: 0 },
    });
    clearTimeout(id);
    return response;
  } catch (error) {
    clearTimeout(id);
    throw error;
  }
};

// 带重试和多服务器故障转移的TMDB API请求函数
const fetchTMDBWithRetry = async (endpoint: string, params: Record<string, string> = {}, apiKey: string, maxRetries = 3) => {
  let lastError;

  // 尝试所有可能的代理服务器
  for (const baseUrl of PROXY_URLS) {
    console.log(`[TMDB API] 尝试代理服务器: ${baseUrl}`);

    // 每个代理尝试多次
    for (let attempt = 0; attempt < maxRetries; attempt++) {
      try {
        // 构建查询参数
        const queryParams = new URLSearchParams({
          api_key: apiKey,
          ...params
        }).toString();

        const url = `${baseUrl}${endpoint}?${queryParams}`;

        // 增加重试间隔时间
        if (attempt > 0) {
          const delay = Math.pow(2, attempt) * 1000; // 指数退避算法: 1s, 2s, 4s
          console.log(`[TMDB API] 等待 ${delay}ms 后重试...`);
          await new Promise(resolve => setTimeout(resolve, delay));
        }

        // 使用带超时的fetch，超时时间随着尝试次数增加
        const timeout = 15000 + (attempt * 5000); // 从15秒开始，每次增加5秒
        console.log(`[TMDB API] 发送请求 (尝试 ${attempt + 1}/${maxRetries}): ${url.substring(0, 100)}...`);

        const response = await fetchWithTimeout(url, {
          headers: {
            'Content-Type': 'application/json',
            'User-Agent': 'TMDB-Helper/1.0',
            'Accept': 'application/json',
          }
        }, timeout);

        console.log(`[TMDB API] 响应状态: ${response.status} (尝试 ${attempt + 1})`);

        // 如果成功，直接返回
        if (response.ok) {
          console.log(`[TMDB API] 请求成功`);
          return response;
        }

        // 如果遇到特定错误码，可能需要立即跳到下一个代理
        if (response.status === 401 || response.status === 404) {
          console.error(`[TMDB API] 致命错误 ${response.status}，跳到下一个代理`);
          throw new Error(`API请求失败: ${response.status} ${response.statusText}`);
        }

        // 如果是限流，等待更长时间
        if (response.status === 429) {
          const retryAfter = response.headers.get('Retry-After') || '10';
          const waitTime = parseInt(retryAfter, 10) * 1000;
          console.warn(`[TMDB API] 遇到限流，等待 ${waitTime}ms`);
          await new Promise(resolve => setTimeout(resolve, waitTime));
          continue; // 继续尝试当前代理
        }

        // 对于500错误，记录详细信息
        if (response.status === 500) {
          console.error(`[TMDB API] 服务器内部错误 (500)，尝试 ${attempt + 1}/${maxRetries}`);
          const errorText = await response.text().catch(() => '无法读取错误响应');
          console.error(`[TMDB API] 错误详情:`, errorText.substring(0, 200));
        }

        lastError = new Error(`API请求失败: ${response.status} ${response.statusText}`);
      } catch (error) {
        // 记录最后一个错误
        lastError = error;
        console.error(`[TMDB API] 请求异常 (尝试 ${attempt + 1}):`, error instanceof Error ? error.message : String(error));

        // 如果是网络错误或超时，尝试下一个代理
        if (error instanceof TypeError ||
            (error instanceof Error && (error.message.includes('network') || error.name === 'AbortError'))) {
          console.warn(`[TMDB API] 网络错误，跳到下一个代理`);
          break; // 跳出当前代理的循环，尝试下一个代理
        }
      }
    }
  }

  // 如果所有尝试都失败了，抛出最后一个错误
  console.error(`[TMDB API] 所有代理服务器都失败了`);
  throw lastError || new Error('无法连接到TMDB API');
};

export async function GET(request: Request) {
  try {
    // 从请求头中获取API密钥和区域参数
    const url = new URL(request.url);
    const apiKey = url.searchParams.get('api_key');
    const region = url.searchParams.get('region') || 'CN';
    const language = url.searchParams.get('language') || 'zh-CN';
    const type = 'recent'; // 固定为recent类型
    
    // 如果没有API密钥，返回错误
    if (!apiKey) {
      return NextResponse.json(
        { success: false, error: 'TMDB API密钥未提供，请在设置中配置并保存' },
        { status: 400 }
      );
    }
    
    // 获取当前日期
    const today = new Date();
    let fromDate, toDate;

    // 近期开播 - 30天前到昨天（不包括今天）
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(today.getDate() - 30);
    fromDate = thirtyDaysAgo.toISOString().split('T')[0];
    
    const yesterday = new Date();
    yesterday.setDate(today.getDate() - 1);
    toDate = yesterday.toISOString().split('T')[0];

    try {
      // 并行请求电影和电视剧数据，添加超时处理
      const [moviesResponse, tvShowsResponse] = await Promise.all([
        fetchTMDBWithRetry('/discover/movie', {
          language: language,
          region: region,
          sort_by: 'release_date.desc',
          'release_date.gte': fromDate,
          'release_date.lte': toDate,
          ...(region === 'CN' || region === 'HK' || region === 'TW' ? { with_original_language: 'zh' } : {}),
          page: '1'
        }, apiKey, 3), // 最多重试3次
        fetchTMDBWithRetry('/discover/tv', {
          language: language,
          sort_by: 'first_air_date.desc',
          'first_air_date.gte': fromDate,
          'first_air_date.lte': toDate,
          ...(region === 'CN' || region === 'HK' || region === 'TW' ? { with_original_language: 'zh' } : {}),
          with_origin_country: region,
          page: '1'
        }, apiKey, 3) // 最多重试3次
      ]);

      // 检查响应状态
      if (!moviesResponse.ok) {
        throw new Error(`电影数据请求失败: ${moviesResponse.status} ${moviesResponse.statusText}`);
      }
      
      if (!tvShowsResponse.ok) {
        throw new Error(`电视剧数据请求失败: ${tvShowsResponse.status} ${tvShowsResponse.statusText}`);
      }

      // 解析响应数据
      const moviesData = await moviesResponse.json();
      const tvShowsData = await tvShowsResponse.json();

      // 处理电影数据
      const movies = moviesData.results.map((movie: any) => ({
        id: movie.id,
        title: movie.title,
        posterPath: movie.poster_path,
        releaseDate: movie.release_date,
        mediaType: 'movie',
        overview: movie.overview,
        voteAverage: movie.vote_average,
        popularity: movie.popularity,
        originalLanguage: movie.original_language,
        genreIds: movie.genre_ids,
        region: region
      }));

      // 处理电视剧数据
      const tvShows = tvShowsData.results.map((show: any) => ({
        id: show.id,
        title: show.name,
        posterPath: show.poster_path,
        releaseDate: show.first_air_date,
        mediaType: 'tv',
        overview: show.overview,
        voteAverage: show.vote_average,
        popularity: show.popularity,
        originalLanguage: show.original_language,
        genreIds: show.genre_ids,
        region: region
      }));

      // 合并并按日期排序，只保留过去30天的内容（不包括今天）
      const todayStart = new Date().setHours(0, 0, 0, 0);
      const thirtyDaysAgoStart = new Date();
      thirtyDaysAgoStart.setDate(thirtyDaysAgoStart.getDate() - 30);
      
      const combinedResults = [...movies, ...tvShows]
        .filter(item => {
          const releaseTime = new Date(item.releaseDate).getTime();
          // 过去30天内的内容，但不包括今天
          return releaseTime >= thirtyDaysAgoStart.setHours(0, 0, 0, 0) && releaseTime < todayStart;
        })
        .sort((a, b) => new Date(b.releaseDate).getTime() - new Date(a.releaseDate).getTime()); // 降序排列

      // 返回结果
      return NextResponse.json({
        success: true,
        results: combinedResults,
        region: region,
        language: language,
        type: type,
        timestamp: new Date().toISOString()
      });
    } catch (apiError: any) {
      // API请求过程中的错误
      console.error('TMDB API请求失败:', apiError);
      
      // 提供更详细的错误信息
      let errorMessage = `TMDB API请求失败: ${apiError.message}`;
      let statusCode = 500;
      
      // 区分不同类型的错误
      if (apiError.name === 'AbortError') {
        errorMessage = 'TMDB API请求超时，请稍后再试';
        statusCode = 504; // Gateway Timeout
      } else if (apiError.message.includes('fetch failed') || apiError.message.includes('无法连接')) {
        errorMessage = 'TMDB API连接失败，请检查网络连接';
        statusCode = 503; // Service Unavailable
      } else if (apiError.message.includes('401')) {
        errorMessage = 'TMDB API密钥无效，请检查API密钥配置';
        statusCode = 401; // Unauthorized
      } else if (apiError.message.includes('429')) {
        errorMessage = 'TMDB API请求次数超限，请稍后再试';
        statusCode = 429; // Too Many Requests
      }
      
      return NextResponse.json(
        { success: false, error: errorMessage },
        { status: statusCode }
      );
    }
  } catch (error: any) {
    // 其他一般性错误
    console.error('获取TMDB近期开播内容失败:', error);
    return NextResponse.json(
      { success: false, error: `获取TMDB近期开播内容失败: ${error.message}` },
      { status: 500 }
    );
  }
} 