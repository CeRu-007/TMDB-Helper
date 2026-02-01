/**
 * 更新相关类型定义
 */

export interface GitHubRelease {
  tag_name: string;
  name: string;
  body: string;
  html_url: string;
  published_at: string;
  prerelease: boolean;
  draft: boolean;
}

export interface UpdateCheckResult {
  hasUpdate: boolean;
  currentVersion: string;
  latestVersion: string;
  releaseInfo: GitHubRelease | null;
  lastChecked: string;
  isCached: boolean;
}

export interface UpdateCache {
  lastChecked: string;
  latestVersion: string;
  releaseInfo: GitHubRelease;
}

export interface UpdateCheckOptions {
  force?: boolean;
  showToast?: boolean;
}