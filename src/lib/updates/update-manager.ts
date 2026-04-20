import { GitHubRelease, UpdateCheckResult, UpdateCache } from '@/types/updates';
import * as semver from 'semver';
import * as fs from 'fs';
import * as path from 'path';

const GITHUB_REPO = 'CeRu-007/TMDB-Helper';
const GITHUB_API_BASE = 'https://api.github.com';

function getCacheFilePath(): string {
  const dataDir = process.env.TMDB_DATA_DIR || path.join(process.cwd(), 'data');
  return path.join(dataDir, 'updates', 'cache.json');
}

const CACHE_DURATION = 60 * 60 * 1000;

interface UpdateManagerConfig {
  githubToken?: string;
}

export class UpdateManager {
  private config: UpdateManagerConfig;
  private memoryCache: UpdateCheckResult | null = null;

  constructor(config: UpdateManagerConfig = {}) {
    this.config = config;
    this.ensureCacheDirectory();
  }

  async checkForUpdates(currentVersion: string, force: boolean = false): Promise<UpdateCheckResult> {
    if (!force && this.memoryCache && !this.isCacheExpired(this.memoryCache.lastChecked)) {
      return this.memoryCache;
    }

    if (!force) {
      const cached = this.getCachedResult(currentVersion);
      if (cached && !this.isCacheExpired(cached.lastChecked)) {
        this.memoryCache = cached;
        return cached;
      }
    }

    try {
      const release = await this.getLatestRelease();
      
      if (!release) {
        throw new Error('无法获取最新版本信息');
      }

      if (release.prerelease || release.draft) {
        return {
          hasUpdate: false,
          currentVersion,
          latestVersion: currentVersion,
          releaseInfo: null,
          lastChecked: new Date().toISOString(),
          isCached: false,
        };
      }

      const latestVersion = this.normalizeVersion(release.tag_name);
      const hasUpdate = this.compareVersions(currentVersion, latestVersion);

      const result: UpdateCheckResult = {
        hasUpdate,
        currentVersion,
        latestVersion,
        releaseInfo: release,
        lastChecked: new Date().toISOString(),
        isCached: false,
      };

      this.saveCache(result);
      this.memoryCache = result;

      return result;
    } catch (error) {
      const cached = this.getCachedResult(currentVersion);
      if (cached) {
        return { ...cached, isCached: true };
      }

      return {
        hasUpdate: false,
        currentVersion,
        latestVersion: currentVersion,
        releaseInfo: null,
        lastChecked: new Date().toISOString(),
        isCached: false,
      };
    }
  }

  private async getLatestRelease(): Promise<GitHubRelease | null> {
    const url = `${GITHUB_API_BASE}/repos/${GITHUB_REPO}/releases/latest`;
    
    const headers: Record<string, string> = {
      'User-Agent': 'TMDB-Helper/1.0',
      'Accept': 'application/vnd.github.v3+json',
    };

    if (this.config.githubToken) {
      headers['Authorization'] = `Bearer ${this.config.githubToken}`;
    }

    try {
      const response = await fetch(url, { headers });

      if (response.status === 403) {
        throw new Error('GitHub API rate limit exceeded');
      }

      if (response.status === 404) {
        return null;
      }

      if (!response.ok) {
        throw new Error(`GitHub API error: ${response.status}`);
      }

      const release: GitHubRelease = await response.json();
      return release;
    } catch (error) {
      console.error('Failed to fetch latest release:', error);
      throw error;
    }
  }

  private compareVersions(current: string, latest: string): boolean {
    const currentNormalized = this.normalizeVersion(current);
    const latestNormalized = this.normalizeVersion(latest);
    const currentMajorMinor = this.getMajorMinor(currentNormalized);
    const latestMajorMinor = this.getMajorMinor(latestNormalized);

    return semver.gt(latestMajorMinor, currentMajorMinor);
  }

  private normalizeVersion(version: string): string {
    return version.replace(/^v/i, '');
  }

  private getMajorMinor(version: string): string {
    const parsed = semver.parse(version);
    if (!parsed) return version;

    return `${parsed.major}.${parsed.minor}.0`;
  }

  private isCacheExpired(lastChecked: string): boolean {
    const checkedTime = new Date(lastChecked).getTime();
    const now = Date.now();
    return now - checkedTime > CACHE_DURATION;
  }

  private saveCache(result: UpdateCheckResult): void {
    try {
      const cacheData: UpdateCache = {
        lastChecked: result.lastChecked,
        latestVersion: result.latestVersion,
        releaseInfo: result.releaseInfo!,
      };

      fs.writeFileSync(getCacheFilePath(), JSON.stringify(cacheData, null, 2), 'utf-8');
    } catch (error) {
      console.error('Failed to save cache:', error);
    }
  }

  private getCachedResult(currentVersion: string): UpdateCheckResult | null {
    try {
      const cacheFilePath = getCacheFilePath();
      if (!fs.existsSync(cacheFilePath)) {
        return null;
      }

      const cacheData: UpdateCache = JSON.parse(fs.readFileSync(cacheFilePath, 'utf-8'));

      return {
        hasUpdate: false,
        currentVersion,
        latestVersion: cacheData.latestVersion,
        releaseInfo: cacheData.releaseInfo,
        lastChecked: cacheData.lastChecked,
        isCached: true,
      };
    } catch (error) {
      console.error('Failed to read cache:', error);
      return null;
    }
  }

  private ensureCacheDirectory(): void {
    const cacheDir = path.dirname(getCacheFilePath());
    if (!fs.existsSync(cacheDir)) {
      fs.mkdirSync(cacheDir, { recursive: true });
    }
  }
}

let updateManagerInstance: UpdateManager | null = null;

export function getUpdateManager(): UpdateManager {
  if (!updateManagerInstance) {
    const config: UpdateManagerConfig = {};
    if (process.env.GITHUB_TOKEN) {
      config.githubToken = process.env.GITHUB_TOKEN;
    }
    updateManagerInstance = new UpdateManager(config);
  }
  return updateManagerInstance;
}