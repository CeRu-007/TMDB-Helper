// 平台特定的解析器
import type { ExtractedMetadata } from './metadata-extractor';

// Netflix 数据类型
interface NetflixModel {
  type?: string;
  summary?: {
    type?: string;
    title?: string;
    originalTitle?: string;
    synopsis?: string;
    logline?: string;
    releaseYear?: number;
    runtime?: number;
    userRating?: {
      average?: number;
    };
    genres?: Array<{ name?: string } | string>;
    cast?: Array<{ name?: string }>;
    creators?: Array<{ name?: string }>;
  };
}

// 以下类型定义保留以供将来使用
// interface DisneyContentData {
//   title?: string;
//   description?: string;
//   genres?: Array<{ name?: string } | string>;
//   director?: Array<{ name?: string } | string>;
//   actor?: Array<{ name?: string } | string>;
//   images?: Array<{
//     purpose?: string;
//     url?: string;
//   }>;
// }

// interface PrimeContentData {
//   title?: string;
//   description?: string;
//   genres?: Array<{ name?: string } | string>;
//   credits?: Array<{
//     role?: string;
//     displayName?: string;
//   }>;
//   images?: Array<{
//     type?: string;
//     url?: string;
//   }>;
// }

// interface SpotifyAlbumInfo {
//   directors?: Array<{ name?: string }>;
//   actors?: Array<{ name?: string }>;
// }

// interface AppleCoverInfo {
//   director_list?: Array<{ name?: string }>;
//   leading_actor_list?: Array<{ name?: string }>;
// }

// interface HBOContent {
//   genres?: Array<{ name?: string }>;
//   credits?: Array<{
//     role?: string;
//     name?: string;
//   }>;
//   images?: Array<{
//     type?: string;
//     url?: string;
//   }>;
// }

// 通用状态对象类型
interface StateObject {
  [key: string]: unknown;
}

export interface PlatformParser {
  name: string;
  domains: string[];
  parse: (html: string, url: string) => Partial<ExtractedMetadata>;
}

// Netflix 解析器
export const NetflixParser: PlatformParser = {
  name: 'Netflix',
  domains: ['netflix.com'],
  parse: (html: string, _url: string) => {
    const metadata: Partial<ExtractedMetadata> = {};

    try {
      // 提取 Netflix 特有的 JSON 数据
      const reactContextMatch = html.match(
        /netflix\.reactContext\s*=\s*({.+?});/,
      );
      if (reactContextMatch) {
        const reactContext = JSON.parse(reactContextMatch[1]!);
        const models = reactContext?.models;

        if (models) {
          // 查找视频数据
          const videoData = Object.values(models).find(
            (model): model is NetflixModel =>
              typeof model === 'object' && model !== null &&
              ((model as NetflixModel).type === 'video' ||
               (model as NetflixModel).summary?.type === 'show' ||
               (model as NetflixModel).summary?.type === 'movie'),
          ) as NetflixModel | undefined;

          if (videoData) {
            const summary = videoData.summary || videoData;

            metadata.title = (summary as any).title;
            metadata.originalTitle = (summary as any).originalTitle;
            metadata.description = (summary as any).synopsis || (summary as any).logline;
            metadata.year = (summary as any).releaseYear;
            metadata.duration = (summary as any).runtime;
            metadata.rating = (summary as any).userRating?.average;

            // 类型信息
            if ((summary as any).genres) {
              metadata.genre = (summary as any).genres.map((g: any) =>
                typeof g === 'object' && g !== null && 'name' in g
                  ? g.name || String(g)
                  : String(g)
              );
            }

            // 演员信息
            if ((summary as any).cast) {
              metadata.cast = (summary as any).cast.map((c: any) =>
                typeof c === 'object' && c !== null && 'name' in c
                  ? c.name || String(c)
                  : String(c)
              );
            }

            // 导演信息
            if ((summary as any).creators) {
              metadata.director = (summary as any).creators.map((c: any) =>
                typeof c === 'object' && c !== null && 'name' in c
                  ? c.name || String(c)
                  : String(c)
              );
            }

            // 剧集信息
            if ((summary as any).type === 'show') {
              metadata.episodeCount = (summary as any).episodeCount;
              metadata.seasonCount = (summary as any).seasonCount;
            }

            // 图片
            if ((summary as any).boxart) {
              metadata.posterUrl = (summary as any).boxart.url;
            }
            if ((summary as any).storyart) {
              metadata.backdropUrl = (summary as any).storyart.url;
            }
          }
        }
      }

      // 备用解析：从页面标题提取
      if (!metadata.title) {
        const titleMatch = html.match(/<title[^>]*>([^|]+)\s*\|\s*Netflix/i);
        if (titleMatch) {
          metadata.title = titleMatch[1].trim();
        }
      }

      // 提取成熟度评级
      const maturityMatch = html.match(/maturity[^>]*>([^<]+)</i);
      if (maturityMatch) {
        metadata.rating = Number.parseFloat(maturityMatch[1]!);
      }

      // 提取语言信息
      const audioMatch = html.match(/audio[^>]*language[^>]*>([^<]+)</i);
      if (audioMatch) {
        metadata.language = audioMatch[1]!.trim();
      }
    } catch (error) {}

    return metadata;
  },
};

// Prime Video 解析器
export const PrimeVideoParser: PlatformParser = {
  name: 'Prime Video',
  domains: ['primevideo.com', 'amazon.com', 'amazon.cn'],
  parse: (html: string, _url: string) => {
    const metadata: Partial<ExtractedMetadata> = {};

    try {
      // 提取 Prime Video 的 JSON-LD 数据
      const jsonLdMatches = html.match(
        /<script[^>]*type="application\/ld\+json"[^>]*>([^<]+)<\/script>/gi,
      );

      if (jsonLdMatches) {
        for (const _match of jsonLdMatches) {
          try {
            const jsonContent = match
              .replace(/<script[^>]*>/, '')
              .replace(/<\/script>/, '');
            const data = JSON.parse(jsonContent);

            if (data['@type'] === 'Movie' || data['@type'] === 'TVSeries') {
              metadata.title = data.name;
              metadata.description = data.description;
              metadata.year = data.datePublished
                ? new Date(data.datePublished).getFullYear()
                : undefined;

              if (data.genre) {
                metadata.genre = Array.isArray(data.genre)
                  ? data.genre
                  : [data.genre];
              }

              if (data.director) {
                metadata.director = Array.isArray(data.director)
                  ? data.director.map((d: any) =>
                      typeof d === 'object' && d !== null && 'name' in d
                        ? (d as { name?: string }).name || String(d)
                        : String(d)
                    )
                  : [typeof data.director === 'object' && data.director !== null && 'name' in data.director
                      ? (data.director as { name?: string }).name || String(data.director)
                      : String(data.director)];
              }

              if (data.actor) {
                metadata.cast = Array.isArray(data.actor)
                  ? data.actor.map((a: any) =>
                      typeof a === 'object' && a !== null && 'name' in a
                        ? (a as { name?: string }).name || String(a)
                        : String(a)
                    )
                  : [typeof data.actor === 'object' && data.actor !== null && 'name' in data.actor
                      ? (data.actor as { name?: string }).name || String(data.actor)
                      : String(data.actor)];
              }

              if (data.aggregateRating) {
                metadata.rating = data.aggregateRating.ratingValue;
              }

              if (data.image) {
                metadata.posterUrl = Array.isArray(data.image)
                  ? data.image[0]
                  : data.image;
              }
            }
          } catch (e) {
            // 忽略解析错误
          }
        }
      }

      // Prime Video 特有的数据提取
      const primeDataMatch = html.match(/window\.ue_pti\s*=\s*({.+?});/);
      if (primeDataMatch) {
        try {
          const _primeData = JSON.parse(primeDataMatch[1]!);
          // 处理 Prime Video 特有的数据结构
        } catch (e) {
          // 忽略解析错误
        }
      }

      // 从页面元素提取
      const runtimeMatch = html.match(/(\d+)\s*(?:min|分钟)/i);
      if (runtimeMatch) {
        metadata.duration = Number.parseInt(runtimeMatch[1]!);
      }
    } catch (error) {}

    return metadata;
  },
};

// Disney+ 解析器
export const DisneyPlusParser: PlatformParser = {
  name: 'Disney+',
  domains: ['disneyplus.com'],
  parse: (html: string, _url: string) => {
    const metadata: Partial<ExtractedMetadata> = {};

    try {
      // Disney+ 通常使用 React 应用，数据在 window.__INITIAL_STATE__ 中
      const initialStateMatch = html.match(
        /window\.__INITIAL_STATE__\s*=\s*({.+?});/,
      );
      if (initialStateMatch) {
        const initialState = JSON.parse(initialStateMatch[1]!);

        // 查找内容数据
        const contentData = findContentInState(initialState);
        if (contentData) {
          metadata.title = contentData.title as string;
          metadata.originalTitle = contentData.originalTitle as string;
          metadata.description =
            contentData.description || contentData.synopsis;
          metadata.year = contentData.releaseYear as number;
          metadata.duration = contentData.runtimeMillis
            ? Math.round(contentData.runtimeMillis / 60000)
            : undefined;

          if (contentData.genres) {
            metadata.genre = (contentData.genres as any[]).map((g: any) =>
              typeof g === 'object' && g !== null && 'name' in g
                ? (g as { name?: string }).name || String(g)
                : String(g)
            );
          }

          if (contentData.participants) {
            const directors = (contentData.participants as any[]).filter(
              (p): p is { role?: string; displayName?: string } =>
                typeof p === 'object' && p !== null && (p as { role?: string }).role === 'Director',
            );
            const actors = (contentData.participants as any[]).filter(
              (p): p is { role?: string; displayName?: string } =>
                typeof p === 'object' && p !== null && (p as { role?: string }).role === 'Actor',
            );

            if (directors.length > 0) {
              metadata.director = directors.map((d) => d.displayName || String(d));
            }

            if (actors.length > 0) {
              metadata.cast = actors.map((a) => a.displayName || String(a));
            }
          }

          if (contentData.images) {
            const poster = (contentData.images as any[]).find(
              (img): img is { purpose?: string; url?: string } =>
                typeof img === 'object' && img !== null && (img as { purpose?: string }).purpose === 'poster',
            );
            const backdrop = (contentData.images as any[]).find(
              (img): img is { purpose?: string; url?: string } =>
                typeof img === 'object' && img !== null && (img as { purpose?: string }).purpose === 'hero',
            );

            if (poster) metadata.posterUrl = poster.url;
            if (backdrop) metadata.backdropUrl = backdrop.url;
          }
        }
      }

      // 备用解析方法
      if (!metadata.title) {
        const titleMatch = html.match(/<h1[^>]*>([^<]+)<\/h1>/);
        if (titleMatch) {
          metadata.title = titleMatch[1].trim();
        }
      }
    } catch (error) {}

    return metadata;
  },
};

// Bilibili 解析器
export const BilibiliParser: PlatformParser = {
  name: 'Bilibili',
  domains: ['bilibili.com'],
  parse: (html: string, url: string) => {
    const metadata: Partial<ExtractedMetadata> = {};

    try {
      // Bilibili 的初始数据通常在 window.__INITIAL_STATE__ 中
      const initialStateMatch = html.match(
        /window\.__INITIAL_STATE__\s*=\s*({.+?});/,
      );
      if (initialStateMatch) {
        const initialState = JSON.parse(initialStateMatch[1]);

        // 番剧/影视数据
        if (initialState.mediaInfo) {
          const mediaInfo = initialState.mediaInfo;

          metadata.title = mediaInfo.title;
          metadata.originalTitle = mediaInfo.origin_name;
          metadata.description = mediaInfo.evaluate;
          metadata.year = mediaInfo.publish?.pub_year;

          // 评分
          if (mediaInfo.rating) {
            metadata.rating = mediaInfo.rating.score;
          }

          // 类型
          if (mediaInfo.style) {
            metadata.genre = mediaInfo.style
              .split(',')
              .map((s: string) => s.trim());
          }

          // 演员
          if (mediaInfo.actors) {
            metadata.cast = mediaInfo.actors
              .split(',')
              .map((a: string) => a.trim());
          }

          // 制作信息
          if (mediaInfo.staff) {
            metadata.director = mediaInfo.staff
              .split(',')
              .map((s: string) => s.trim());
          }

          // 集数信息
          if (mediaInfo.total_ep) {
            metadata.episodeCount = mediaInfo.total_ep;
          }

          // 图片
          if (mediaInfo.cover) {
            metadata.posterUrl = mediaInfo.cover;
          }

          // 地区
          if (mediaInfo.areas) {
            metadata.country = mediaInfo.areas
              .map((a) =>
                typeof a === 'object' && a !== null && 'name' in a
                  ? (a as { name?: string }).name || String(a)
                  : String(a)
              )
              .join(', ');
          }

          // 状态
          if (mediaInfo.publish) {
            metadata.status =
              mediaInfo.publish.is_finish === 1 ? '已完结' : '连载中';
          }
        }

        // 视频数据（普通视频）
        if (initialState.videoData) {
          const videoData = initialState.videoData;

          metadata.title = videoData.title;
          metadata.description = videoData.desc;
          metadata.duration = Math.round(videoData.duration / 60); // 转换为分钟

          if (videoData.pic) {
            metadata.posterUrl = videoData.pic;
          }

          // UP主信息
          if (videoData.owner) {
            metadata.director = [videoData.owner.name];
          }
        }
      }

      // 从页面标题提取
      if (!metadata.title) {
        const titleMatch = html.match(/<title[^>]*>([^_]+)_[^<]*<\/title>/);
        if (titleMatch) {
          metadata.title = titleMatch[1].trim();
        }
      }

      // 提取播放数等统计信息
      const viewMatch = html.match(/播放量[^>]*>([^<]+)</i);
      if (viewMatch) {
        // 可以用于其他用途
      }
    } catch (error) {}

    return metadata;
  },
};

// 爱奇艺解析器
export const IqiyiParser: PlatformParser = {
  name: '爱奇艺',
  domains: ['iqiyi.com'],
  parse: (html: string, url: string) => {
    const metadata: Partial<ExtractedMetadata> = {};

    try {
      // 爱奇艺的数据通常在 window.Q 或特定的 script 标签中
      const qDataMatch = html.match(/window\.Q\s*=\s*({.+?});/);
      if (qDataMatch) {
        const qData = JSON.parse(qDataMatch[1]);

        if (qData.albumInfo) {
          const albumInfo = qData.albumInfo;

          metadata.title = albumInfo.name;
          metadata.description = albumInfo.desc;
          metadata.year = albumInfo.year;

          if (albumInfo.score) {
            metadata.rating = Number.parseFloat(albumInfo.score);
          }

          if (albumInfo.genres) {
            metadata.genre = albumInfo.genres;
          }

          if (albumInfo.directors) {
            metadata.director = albumInfo.directors.map((d) =>
              typeof d === 'object' && d !== null && 'name' in d
                ? (d as { name?: string }).name || String(d)
                : String(d)
            );
          }

          if (albumInfo.actors) {
            metadata.cast = albumInfo.actors.map((a) =>
              typeof a === 'object' && a !== null && 'name' in a
                ? (a as { name?: string }).name || String(a)
                : String(a)
            );
          }

          if (albumInfo.episodeCount) {
            metadata.episodeCount = albumInfo.episodeCount;
          }

          if (albumInfo.poster) {
            metadata.posterUrl = albumInfo.poster;
          }

          if (albumInfo.regions) {
            metadata.country = albumInfo.regions.join(', ');
          }
        }
      }

      // 从页面元素提取
      const titleMatch = html.match(
        /<h1[^>]*class="[^"]*title[^"]*"[^>]*>([^<]+)<\/h1>/i,
      );
      if (titleMatch && !metadata.title) {
        metadata.title = titleMatch[1].trim();
      }

      // 提取评分
      const scoreMatch = html.match(/评分[^>]*>([0-9.]+)/i);
      if (scoreMatch && !metadata.rating) {
        metadata.rating = Number.parseFloat(scoreMatch[1]);
      }
    } catch (error) {}

    return metadata;
  },
};

// 优酷解析器
export const YoukuParser: PlatformParser = {
  name: '优酷',
  domains: ['youku.com'],
  parse: (html: string, url: string) => {
    const metadata: Partial<ExtractedMetadata> = {};

    try {
      // 优酷的数据通常在特定的 script 标签中
      const dataMatch = html.match(/window\.YOUKU_INITIAL_DATA\s*=\s*({.+?});/);
      if (dataMatch) {
        const data = JSON.parse(dataMatch[1]);

        if (data.data && data.data.show) {
          const show = data.data.show;

          metadata.title = show.title;
          metadata.description = show.summary;
          metadata.year = show.year;

          if (show.score) {
            metadata.rating = Number.parseFloat(show.score);
          }

          if (show.genre) {
            metadata.genre = show.genre.split(',').map((g: string) => g.trim());
          }

          if (show.director) {
            metadata.director = show.director
              .split(',')
              .map((d: string) => d.trim());
          }

          if (show.actor) {
            metadata.cast = show.actor.split(',').map((a: string) => a.trim());
          }

          if (show.total) {
            metadata.episodeCount = Number.parseInt(show.total);
          }

          if (show.img) {
            metadata.posterUrl = show.img;
          }

          if (show.area) {
            metadata.country = show.area;
          }
        }
      }

      // 备用解析
      if (!metadata.title) {
        const titleMatch = html.match(/<title[^>]*>([^-]+)-[^<]*<\/title>/);
        if (titleMatch) {
          metadata.title = titleMatch[1].trim();
        }
      }
    } catch (error) {}

    return metadata;
  },
};

// 腾讯视频解析器
export const TencentVideoParser: PlatformParser = {
  name: '腾讯视频',
  domains: ['v.qq.com'],
  parse: (html: string, url: string) => {
    const metadata: Partial<ExtractedMetadata> = {};

    try {
      // 腾讯视频的数据通常在 window.COVER_INFO 中
      const coverInfoMatch = html.match(/window\.COVER_INFO\s*=\s*({.+?});/);
      if (coverInfoMatch) {
        const coverInfo = JSON.parse(coverInfoMatch[1]);

        metadata.title = coverInfo.title;
        metadata.description = coverInfo.description;
        metadata.year = coverInfo.year;

        if (coverInfo.score) {
          metadata.rating = Number.parseFloat(coverInfo.score);
        }

        if (coverInfo.type_name) {
          metadata.genre = [coverInfo.type_name];
        }

        if (coverInfo.director_list) {
          metadata.director = coverInfo.director_list.map((d) =>
            typeof d === 'object' && d !== null && 'name' in d
              ? (d as { name?: string }).name || String(d)
              : String(d)
          );
        }

        if (coverInfo.leading_actor_list) {
          metadata.cast = coverInfo.leading_actor_list.map((a) =>
            typeof a === 'object' && a !== null && 'name' in a
              ? (a as { name?: string }).name || String(a)
              : String(a)
          );
        }

        if (coverInfo.episode_all) {
          metadata.episodeCount = Number.parseInt(coverInfo.episode_all);
        }

        if (coverInfo.vertical_pic_url) {
          metadata.posterUrl = coverInfo.vertical_pic_url;
        }

        if (coverInfo.area_list) {
          metadata.country = coverInfo.area_list
            .map((a) =>
              typeof a === 'object' && a !== null && 'name' in a
                ? (a as { name?: string }).name || String(a)
                : String(a)
            )
            .join(', ');
        }
      }
    } catch (error) {}

    return metadata;
  },
};

// HBO Max 解析器
export const HBOMaxParser: PlatformParser = {
  name: 'HBO Max',
  domains: ['hbomax.com', 'max.com'],
  parse: (html: string, url: string) => {
    const metadata: Partial<ExtractedMetadata> = {};

    try {
      // HBO Max 的数据通常在 window.__APOLLO_STATE__ 中
      const apolloStateMatch = html.match(
        /window\.__APOLLO_STATE__\s*=\s*({.+?});/,
      );
      if (apolloStateMatch) {
        const apolloState = JSON.parse(apolloStateMatch[1]);

        // 查找内容数据
        const contentKeys = Object.keys(apolloState).filter(
          (key) => key.includes('Content:') && apolloState[key].titles,
        );

        if (contentKeys.length > 0) {
          const content = apolloState[contentKeys[0]];

          if (content.titles) {
            metadata.title = content.titles.full;
            metadata.originalTitle = content.titles.original;
          }

          if (content.summaries) {
            metadata.description =
              content.summaries.full || content.summaries.short;
          }

          if (content.releaseYear) {
            metadata.year = content.releaseYear;
          }

          if (content.genres) {
            metadata.genre = content.genres.map((g) =>
              typeof g === 'object' && g !== null && 'name' in g
                ? (g as { name?: string }).name || String(g)
                : String(g)
            );
          }

          if (content.credits) {
            const directors = content.credits.filter(
              (c): c is { role?: string; name?: string } =>
                typeof c === 'object' && c !== null && (c as { role?: string }).role === 'DIRECTOR',
            );
            const actors = content.credits.filter(
              (c): c is { role?: string; name?: string } =>
                typeof c === 'object' && c !== null && (c as { role?: string }).role === 'ACTOR',
            );

            if (directors.length > 0) {
              metadata.director = directors.map((d) => d.name || String(d));
            }

            if (actors.length > 0) {
              metadata.cast = actors.map((a) => a.name || String(a));
            }
          }

          if (content.images) {
            const poster = content.images.find(
              (img): img is { type?: string; url?: string } =>
                typeof img === 'object' && img !== null && (img as { type?: string }).type === 'POSTER',
            );
            const backdrop = content.images.find(
              (img): img is { type?: string; url?: string } =>
                typeof img === 'object' && img !== null && (img as { type?: string }).type === 'BACKGROUND',
            );

            if (poster) metadata.posterUrl = poster.url;
            if (backdrop) metadata.backdropUrl = backdrop.url;
          }
        }
      }
    } catch (error) {}

    return metadata;
  },
};

// Apple TV+ 解析器
export const AppleTVParser: PlatformParser = {
  name: 'Apple TV+',
  domains: ['tv.apple.com'],
  parse: (html: string, url: string) => {
    const metadata: Partial<ExtractedMetadata> = {};

    try {
      // Apple TV+ 的数据通常在特定的 script 标签中
      const showtimeDataMatch = html.match(
        /window\.showtimeData\s*=\s*({.+?});/,
      );
      if (showtimeDataMatch) {
        const showtimeData = JSON.parse(showtimeDataMatch[1]);

        if (showtimeData.content) {
          const content = showtimeData.content;

          metadata.title = content.title;
          metadata.description = content.description;
          metadata.year = content.releaseYear;

          if (content.genres) {
            metadata.genre = content.genres;
          }

          if (content.directors) {
            metadata.director = content.directors;
          }

          if (content.cast) {
            metadata.cast = content.cast;
          }

          if (content.images) {
            metadata.posterUrl = content.images.poster;
            metadata.backdropUrl = content.images.hero;
          }
        }
      }
    } catch (error) {}

    return metadata;
  },
};

// 辅助函数：在复杂的状态对象中查找内容数据
function findContentInState(state: StateObject): StateObject | null {
  if (!state || typeof state !== 'object') return null;

  // 递归查找包含内容信息的对象
  for (const key in state) {
    const value = state[key];

    if (value && typeof value === 'object') {
      // 检查是否是内容对象
      if (value.title && (value.description || value.synopsis)) {
        return value;
      }

      // 递归查找
      const found = findContentInState(value);
      if (found) return found;
    }
  }

  return null;
}

// 导出所有解析器
export const PlatformParsers: PlatformParser[] = [
  NetflixParser,
  PrimeVideoParser,
  DisneyPlusParser,
  BilibiliParser,
  IqiyiParser,
  YoukuParser,
  TencentVideoParser,
  HBOMaxParser,
  AppleTVParser,
];

// 根据URL获取对应的解析器
export function getPlatformParser(url: string): PlatformParser | null {
  try {
    const hostname = new URL(url).hostname.toLowerCase();

    return (
      PlatformParsers.find((parser) =>
        parser.domains.some((domain) => hostname.includes(domain)),
      ) || null
    );
  } catch (error) {
    return null;
  }
}
