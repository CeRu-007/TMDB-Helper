import { describe, it, expect } from 'vitest';
import { tmdbItemToRow, rowToTMDBItem, type ItemRow } from '@/lib/database/types';
import type { TMDBItem, TMDBNetwork } from '@/types/tmdb-item';

function makeItem(overrides: Partial<TMDBItem> = {}): TMDBItem {
  return {
    id: 'test-1',
    title: '测试剧集',
    mediaType: 'tv',
    status: 'ongoing',
    completed: false,
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
    ...overrides,
  } as TMDBItem;
}

function makeRow(overrides: Partial<ItemRow> = {}): ItemRow {
  return {
    id: 'test-1',
    tmdbId: null,
    imdbId: null,
    title: '测试剧集',
    originalTitle: null,
    overview: null,
    year: null,
    releaseDate: null,
    genres: null,
    runtime: null,
    voteAverage: null,
    mediaType: 'tv',
    posterPath: null,
    posterUrl: null,
    backdropPath: null,
    backdropUrl: null,
    logoPath: null,
    logoUrl: null,
    networkId: null,
    networkName: null,
    networkLogoUrl: null,
    status: null,
    completed: 0,
    platformUrl: null,
    platformUrls: null,
    defaultPlatformUrl: null,
    networks: null,
    totalEpisodes: null,
    manuallySetEpisodes: 0,
    weekday: null,
    secondWeekday: null,
    airTime: null,
    category: null,
    tmdbUrl: null,
    notes: null,
    isDailyUpdate: 0,
    blurIntensity: null,
    rating: null,
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
    deletedAt: null,
    ...overrides,
  };
}

describe('tmdbItemToRow - networks serialization', () => {
  it('serializes networks to JSON string', () => {
    const networks: TMDBNetwork[] = [
      {
        id: 1,
        name: 'Netflix',
        logoPath: '/netflix.png',
        logoUrl: 'https://image.tmdb.org/t/p/original/netflix.png',
      },
      {
        id: 2,
        name: 'HBO',
        logoPath: '/hbo.png',
        logoUrl: 'https://image.tmdb.org/t/p/original/hbo.png',
      },
    ];
    const item = makeItem({ networks });
    const row = tmdbItemToRow(item);

    expect(row.networks).toBe(JSON.stringify(networks));
  });

  it('sets networks to null when item has no networks', () => {
    const item = makeItem({ networks: undefined });
    const row = tmdbItemToRow(item);

    expect(row.networks).toBeNull();
  });

  it('serializes empty networks array', () => {
    const item = makeItem({ networks: [] });
    const row = tmdbItemToRow(item);

    expect(row.networks).toBe('[]');
  });

  it('handles networks with only required fields', () => {
    const networks: TMDBNetwork[] = [{ id: 3, name: 'Amazon Prime' }];
    const item = makeItem({ networks });
    const row = tmdbItemToRow(item);

    expect(row.networks).toBe(JSON.stringify(networks));
  });
});

describe('rowToTMDBItem - networks deserialization', () => {
  it('deserializes networks from JSON string', () => {
    const networks: TMDBNetwork[] = [
      {
        id: 1,
        name: 'Netflix',
        logoPath: '/netflix.png',
        logoUrl: 'https://image.tmdb.org/t/p/original/netflix.png',
      },
    ];
    const row = makeRow({ networks: JSON.stringify(networks) });
    const item = rowToTMDBItem(row);

    expect(item.networks).toEqual(networks);
  });

  it('sets networks to undefined when row has null', () => {
    const row = makeRow({ networks: null });
    const item = rowToTMDBItem(row);

    expect(item.networks).toBeUndefined();
  });

  it('preserves platformUrls alongside networks', () => {
    const networks: TMDBNetwork[] = [{ id: 1, name: 'Netflix' }];
    const platformUrls = ['https://netflix.com/title/123'];
    const row = makeRow({
      networks: JSON.stringify(networks),
      platformUrls: JSON.stringify(platformUrls),
    });
    const item = rowToTMDBItem(row);

    expect(item.networks).toEqual(networks);
    expect(item.platformUrls).toEqual(platformUrls);
  });
});

describe('round-trip: tmdbItemToRow -> rowToTMDBItem', () => {
  it('preserves networks through full round-trip', () => {
    const networks: TMDBNetwork[] = [
      { id: 1, name: 'Netflix', logoPath: '/netflix.png' },
      { id: 2, name: 'HBO' },
    ];
    const original = makeItem({ networks });
    const row = tmdbItemToRow(original);
    const restored = rowToTMDBItem(row);

    expect(restored.networks).toEqual(original.networks);
  });

  it('preserves undefined networks through round-trip', () => {
    const original = makeItem({ networks: undefined });
    const row = tmdbItemToRow(original);
    const restored = rowToTMDBItem(row);

    expect(restored.networks).toBeUndefined();
  });

  it('preserves defaultPlatformUrl alongside networks', () => {
    const networks: TMDBNetwork[] = [{ id: 1, name: 'Netflix' }];
    const original = makeItem({
      networks,
      defaultPlatformUrl: 'https://netflix.com/title/123',
      platformUrls: ['https://netflix.com/title/123', 'https://hbo.com/title/456'],
    });
    const row = tmdbItemToRow(original);
    const restored = rowToTMDBItem(row);

    expect(restored.networks).toEqual(networks);
    expect(restored.defaultPlatformUrl).toBe('https://netflix.com/title/123');
    expect(restored.platformUrls).toEqual([
      'https://netflix.com/title/123',
      'https://hbo.com/title/456',
    ]);
  });
});
