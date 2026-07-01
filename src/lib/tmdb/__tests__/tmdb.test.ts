import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { TMDBService } from '@/lib/tmdb/tmdb';

const mockTVData = {
  id: 12345,
  name: 'Test Show',
  poster_path: null,
  backdrop_path: null,
  homepage: null,
  number_of_episodes: null,
  number_of_seasons: null,
  first_air_date: null,
  vote_average: null,
  overview: 'Test overview',
  seasons: [],
  networks: [],
  genres: [],
};

const mockImagesData = { id: 12345, backdrops: [], logos: [], posters: [] };

const mockEmptyListData = {
  id: 1,
  name: 'list',
  description: '',
  item_count: 0,
  page: 1,
  total_pages: 1,
  total_results: 0,
  items: [],
};

function findLanguageInUrls(language: string): boolean {
  const urls = vi.mocked(fetch).mock.calls.map(c => c[0] as string);
  return urls.some(url => {
    try {
      const u = new URL(url);
      return u.searchParams.get('language') === language;
    } catch {
      return url.includes(`language=${language}`);
    }
  });
}

function findLanguageForEndpoint(endpointFragment: string, language: string): boolean {
  const urls = vi.mocked(fetch).mock.calls.map(c => c[0] as string);
  const matching = urls.filter(url => url.includes(endpointFragment));
  return matching.length > 0 && matching.every(url => url.includes(`language=${language}`));
}

function findLanguageForTVDetail(language: string): boolean {
  const urls = vi.mocked(fetch).mock.calls.map(c => c[0] as string);
  const tvDetailUrls = urls.filter(url => /\/tv\/\d+\?/.test(url));
  return tvDetailUrls.length > 0 && tvDetailUrls.every(url => url.includes(`language=${language}`));
}

describe('TMDBService language parameter', () => {
  beforeEach(() => {
    vi.stubEnv('TMDB_API_KEY', 'test-api-key');
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('search()', () => {
    it('默认使用 zh-CN', async () => {
      vi.spyOn(globalThis, 'fetch').mockResolvedValue(
        new Response(JSON.stringify({ results: [] }), { status: 200, headers: { 'Content-Type': 'application/json' } })
      );
      await TMDBService.search('test');
      expect(findLanguageInUrls('zh-CN')).toBe(true);
    });

    it('不传 language 参数时 URL 不含第二个 language 参数', async () => {
      vi.spyOn(globalThis, 'fetch').mockResolvedValue(
        new Response(JSON.stringify({ results: [] }), { status: 200, headers: { 'Content-Type': 'application/json' } })
      );
      await TMDBService.search('test');
      const urls = vi.mocked(fetch).mock.calls.map(c => c[0] as string);
      for (const url of urls) {
        const matches = url.match(/language=/g);
        expect(matches?.length ?? 0).toBe(1);
      }
    });

    it('传入 en-US 时所有请求 URL 包含 language=en-US', async () => {
      vi.spyOn(globalThis, 'fetch').mockResolvedValue(
        new Response(JSON.stringify({ results: [] }), { status: 200, headers: { 'Content-Type': 'application/json' } })
      );
      await TMDBService.search('test', 1, 'en-US');
      expect(findLanguageForEndpoint('/search/multi', 'en-US')).toBe(true);
    });

    it('传入 ja-JP 时所有请求 URL 包含 language=ja-JP', async () => {
      vi.spyOn(globalThis, 'fetch').mockResolvedValue(
        new Response(JSON.stringify({ results: [] }), { status: 200, headers: { 'Content-Type': 'application/json' } })
      );
      await TMDBService.search('test', 1, 'ja-JP');
      expect(findLanguageForEndpoint('/search/multi', 'ja-JP')).toBe(true);
    });

    it('传入 zh-TW 时所有请求 URL 包含 language=zh-TW', async () => {
      vi.spyOn(globalThis, 'fetch').mockResolvedValue(
        new Response(JSON.stringify({ results: [] }), { status: 200, headers: { 'Content-Type': 'application/json' } })
      );
      await TMDBService.search('test', 1, 'zh-TW');
      expect(findLanguageForEndpoint('/search/multi', 'zh-TW')).toBe(true);
    });
  });

  describe('getListItems()', () => {
    it('默认使用 zh-CN', async () => {
      vi.spyOn(globalThis, 'fetch').mockResolvedValue(
        new Response(JSON.stringify(mockEmptyListData), { status: 200, headers: { 'Content-Type': 'application/json' } })
      );
      await TMDBService.getListItems('123');
      expect(findLanguageForEndpoint('/list/', 'zh-CN')).toBe(true);
    });

    it('传入 en-US 时所有请求 URL 包含 language=en-US', async () => {
      vi.spyOn(globalThis, 'fetch').mockResolvedValue(
        new Response(JSON.stringify(mockEmptyListData), { status: 200, headers: { 'Content-Type': 'application/json' } })
      );
      await TMDBService.getListItems('123', 'en-US');
      expect(findLanguageForEndpoint('/list/', 'en-US')).toBe(true);
    });

    it('不传 language 时默认值向下兼容', async () => {
      vi.spyOn(globalThis, 'fetch').mockResolvedValue(
        new Response(JSON.stringify(mockEmptyListData), { status: 200, headers: { 'Content-Type': 'application/json' } })
      );
      await TMDBService.getListItems('123');
      expect(findLanguageForEndpoint('/list/', 'zh-CN')).toBe(true);
    });
  });

  describe('getItemFromUrl()', () => {
    function mockFetch() {
      vi.spyOn(globalThis, 'fetch')
        .mockResolvedValueOnce(new Response(JSON.stringify(mockTVData), { status: 200, headers: { 'Content-Type': 'application/json' } }))
        .mockResolvedValueOnce(new Response(JSON.stringify(mockTVData), { status: 200, headers: { 'Content-Type': 'application/json' } }))
        .mockResolvedValue(new Response(JSON.stringify(mockImagesData), { status: 200, headers: { 'Content-Type': 'application/json' } }));
    }

    it('默认使用 zh-CN', async () => {
      mockFetch();
      await TMDBService.getItemFromUrl('https://www.themoviedb.org/tv/12345');
      expect(findLanguageForTVDetail('zh-CN')).toBe(true);
    });

    it('传入 en-US 时 TV 详情请求 URL 包含 language=en-US', async () => {
      mockFetch();
      await TMDBService.getItemFromUrl('https://www.themoviedb.org/tv/12345', false, 'en-US');
      expect(findLanguageForTVDetail('en-US')).toBe(true);
    });

    it('传入 ko-KR 时 TV 详情请求 URL 包含 language=ko-KR', async () => {
      mockFetch();
      await TMDBService.getItemFromUrl('https://www.themoviedb.org/tv/12345', false, 'ko-KR');
      expect(findLanguageForTVDetail('ko-KR')).toBe(true);
    });

    it('不传 language 时默认值向下兼容', async () => {
      mockFetch();
      const result = await TMDBService.getItemFromUrl('https://www.themoviedb.org/tv/12345');
      expect(result).not.toBeNull();
      expect(findLanguageForTVDetail('zh-CN')).toBe(true);
    });
  });
});
