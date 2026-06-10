import { versionInfo } from "./version";

export interface ChangelogEntry {
  type: string;
  scope: string | null;
  message: string;
  hash: string;
  author?: string;
  date?: string;
}

export interface ReleaseAsset {
  name: string;
  browser_download_url: string;
  size: number;
}

export interface ReleaseInfo {
  tag_name: string;
  name: string;
  body: string;
  html_url: string;
  published_at: string;
  assets: ReleaseAsset[];
}

const GITHUB_API = "https://api.github.com/repos/atandea/clockwise/releases/latest";
const DISMISSED_VERSION_KEY = "clockwise_dismissed_update";
const LAST_CHECK_KEY = "clockwise_last_update_check";
const CHECK_COOLDOWN_MS = 60 * 60 * 1000; // 1 hour cooldown between checks

/**
 * Simple semver comparison.
 * Returns 1 if a > b, -1 if a < b, 0 if equal.
 */
function compareSemver(a: string, b: string): number {
  const pa = a.replace(/^v/, "").split(".").map(Number);
  const pb = b.replace(/^v/, "").split(".").map(Number);
  for (let i = 0; i < 3; i++) {
    const na = pa[i] || 0;
    const nb = pb[i] || 0;
    if (na > nb) return 1;
    if (na < nb) return -1;
  }
  return 0;
}

/**
 * Detect current platform for asset matching.
 */
function detectPlatform(): "linux" | "windows" | "unknown" {
  if (typeof navigator === "undefined") return "unknown";
  const ua = navigator.userAgent.toLowerCase();
  if (ua.includes("linux")) return "linux";
  if (ua.includes("win")) return "windows";
  return "unknown";
}

/**
 * Find the best matching download asset for the current platform.
 */
function findPlatformAsset(assets: ReleaseAsset[]): ReleaseAsset | null {
  const platform = detectPlatform();
  if (platform === "linux") {
    return assets.find(a => a.name.endsWith(".deb")) || null;
  }
  if (platform === "windows") {
    return assets.find(a => a.name.endsWith(".msi")) || null;
  }
  return null;
}

/**
 * Parse the changelog.json asset from a release, if available.
 */
async function fetchChangelog(assets: ReleaseAsset[]): Promise<ChangelogEntry[] | null> {
  const changelogAsset = assets.find(a => a.name === "changelog.json");
  if (!changelogAsset) return null;
  try {
    const res = await fetch(changelogAsset.browser_download_url);
    if (!res.ok) return null;
    const data = await res.json();
    return data.entries || null;
  } catch {
    return null;
  }
}

/**
 * Group changelog entries by type, in display order.
 */
export function groupChangelog(entries: ChangelogEntry[]): Map<string, ChangelogEntry[]> {
  const TYPE_ORDER = ["feat", "fix", "refactor", "perf", "style", "other"];
  const HIDDEN = new Set(["chore", "ci", "docs", "test"]);

  const grouped = new Map<string, ChangelogEntry[]>();
  for (const entry of entries) {
    if (HIDDEN.has(entry.type)) continue;
    const type = TYPE_ORDER.includes(entry.type) ? entry.type : "other";
    if (!grouped.has(type)) grouped.set(type, []);
    grouped.get(type)!.push(entry);
  }

  // Sort by TYPE_ORDER
  const sorted = new Map<string, ChangelogEntry[]>();
  for (const type of TYPE_ORDER) {
    if (grouped.has(type)) sorted.set(type, grouped.get(type)!);
  }
  return sorted;
}

export const TYPE_LABELS: Record<string, { emoji: string; heading: string }> = {
  feat: { emoji: "🚀", heading: "New Features" },
  fix: { emoji: "🐛", heading: "Bug Fixes" },
  refactor: { emoji: "🔧", heading: "Improvements" },
  perf: { emoji: "⚡", heading: "Performance" },
  style: { emoji: "🎨", heading: "Styling" },
  other: { emoji: "📦", heading: "Other Changes" },
};

class UpdateCheckerState {
  updateAvailable = $state(false);
  latestVersion = $state<string | null>(null);
  releaseUrl = $state<string | null>(null);
  releaseBody = $state<string | null>(null);
  changelog = $state<ChangelogEntry[] | null>(null);
  checking = $state(false);
  lastChecked = $state<Date | null>(null);
  error = $state<string | null>(null);
  downloadUrl = $state<string | null>(null);
  downloadAssetName = $state<string | null>(null);

  private _dismissed = $state(false);

  get showBadge(): boolean {
    return this.updateAvailable && !this._dismissed;
  }

  async checkForUpdate(): Promise<void> {
    // Prevent concurrent checks
    if (this.checking) return;

    // Check cooldown (skip if forced by user)
    const lastCheck = localStorage.getItem(LAST_CHECK_KEY);
    if (lastCheck) {
      const elapsed = Date.now() - parseInt(lastCheck, 10);
      if (elapsed < CHECK_COOLDOWN_MS) {
        // Restore last state from storage
        this._restoreFromCache();
        return;
      }
    }

    this.checking = true;
    this.error = null;

    try {
      const res = await fetch(GITHUB_API, {
        headers: { Accept: "application/vnd.github.v3+json" },
        cache: "no-store",
      });

      if (!res.ok) {
        if (res.status === 404) {
          // No releases yet
          this.updateAvailable = false;
          return;
        }
        throw new Error(`GitHub API responded with ${res.status}`);
      }

      const release: ReleaseInfo = await res.json();
      const remoteVersion = release.tag_name.replace(/^app-v/, "");
      const currentVersion = versionInfo.appVersion;

      this.latestVersion = remoteVersion;
      this.releaseUrl = release.html_url;
      this.releaseBody = release.body || null;

      if (compareSemver(remoteVersion, currentVersion) > 0) {
        this.updateAvailable = true;

        // Check if this version was dismissed
        const dismissed = localStorage.getItem(DISMISSED_VERSION_KEY);
        this._dismissed = dismissed === remoteVersion;

        // Find platform-specific download
        const asset = findPlatformAsset(release.assets);
        if (asset) {
          this.downloadUrl = asset.browser_download_url;
          this.downloadAssetName = asset.name;
        }

        // Try to fetch structured changelog
        this.changelog = await fetchChangelog(release.assets);
      } else {
        this.updateAvailable = false;
      }

      // Cache the check time
      this.lastChecked = new Date();
      localStorage.setItem(LAST_CHECK_KEY, Date.now().toString());
      this._saveToCache();
    } catch (err: any) {
      console.error("Update check failed:", err);
      this.error = err.message || "Failed to check for updates";
    } finally {
      this.checking = false;
    }
  }

  dismissUpdate(): void {
    if (this.latestVersion) {
      localStorage.setItem(DISMISSED_VERSION_KEY, this.latestVersion);
      this._dismissed = true;
    }
  }

  /** Force a fresh check, bypassing cooldown. */
  async forceCheck(): Promise<void> {
    localStorage.removeItem(LAST_CHECK_KEY);
    await this.checkForUpdate();
  }

  private _saveToCache(): void {
    try {
      const cache = {
        updateAvailable: this.updateAvailable,
        latestVersion: this.latestVersion,
        releaseUrl: this.releaseUrl,
        releaseBody: this.releaseBody,
        downloadUrl: this.downloadUrl,
        downloadAssetName: this.downloadAssetName,
      };
      localStorage.setItem("clockwise_update_cache", JSON.stringify(cache));
    } catch {
      // localStorage might be unavailable
    }
  }

  private _restoreFromCache(): void {
    try {
      const raw = localStorage.getItem("clockwise_update_cache");
      if (!raw) return;
      const cache = JSON.parse(raw);
      this.updateAvailable = cache.updateAvailable ?? false;
      this.latestVersion = cache.latestVersion ?? null;
      this.releaseUrl = cache.releaseUrl ?? null;
      this.releaseBody = cache.releaseBody ?? null;
      this.downloadUrl = cache.downloadUrl ?? null;
      this.downloadAssetName = cache.downloadAssetName ?? null;

      if (this.latestVersion) {
        const dismissed = localStorage.getItem(DISMISSED_VERSION_KEY);
        this._dismissed = dismissed === this.latestVersion;
      }
    } catch {
      // Ignore cache parsing errors
    }
  }
}

export const updateChecker = new UpdateCheckerState();
