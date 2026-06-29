import { describe, it, expect } from 'vitest';
import { mapLanguageToRegion, REGIONS, REGION_GROUPS } from '../regions';

describe('mapLanguageToRegion', () => {
  it('maps zh-CN to CN', () => {
    expect(mapLanguageToRegion('zh-CN')).toBe('CN');
  });

  it('maps zh-TW to TW', () => {
    expect(mapLanguageToRegion('zh-TW')).toBe('TW');
  });

  it('maps zh-HK to HK', () => {
    expect(mapLanguageToRegion('zh-HK')).toBe('HK');
  });

  it('maps ja-JP to JP', () => {
    expect(mapLanguageToRegion('ja-JP')).toBe('JP');
  });

  it('maps ko-KR to KR', () => {
    expect(mapLanguageToRegion('ko-KR')).toBe('KR');
  });

  it('maps en-US to US', () => {
    expect(mapLanguageToRegion('en-US')).toBe('US');
  });

  it('falls back to CN for unknown language codes', () => {
    expect(mapLanguageToRegion('th-TH')).toBe('CN');
    expect(mapLanguageToRegion('fr-FR')).toBe('CN');
    expect(mapLanguageToRegion('de-DE')).toBe('CN');
    expect(mapLanguageToRegion('auto')).toBe('CN');
    expect(mapLanguageToRegion('')).toBe('CN');
  });
});
