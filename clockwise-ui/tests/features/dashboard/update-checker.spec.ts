import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { versionInfo } from "../../../src/lib/version";
import {
    isNewerVersion,
    updateChecker,
} from "../../../src/features/dashboard/update-checker.svelte";

describe("isNewerVersion", () => {
    beforeEach(() => {
        const values = new Map<string, string>();
        vi.stubGlobal("localStorage", {
            getItem: (key: string) => values.get(key) ?? null,
            setItem: (key: string, value: string) => values.set(key, value),
            removeItem: (key: string) => values.delete(key),
            clear: () => values.clear(),
        });
    });

    afterEach(() => {
        vi.unstubAllGlobals();
    });

    it("does not report a missing release version", () => {
        expect(isNewerVersion(null)).toBe(false);
        expect(isNewerVersion(undefined)).toBe(false);
    });

    it("does not report the installed version or an older version", () => {
        expect(isNewerVersion(versionInfo.appVersion)).toBe(false);
        expect(isNewerVersion("1.0.0")).toBe(false);
    });

    it("reports only a strictly newer release", () => {
        const [major, minor, patch] = versionInfo.appVersion.split(".").map(Number);
        expect(isNewerVersion(`${major}.${minor}.${patch + 1}`)).toBe(true);
    });

    it("ignores stale cache entries without a release version", async () => {
        localStorage.setItem("clockwise_last_update_check", Date.now().toString());
        localStorage.setItem(
            "clockwise_update_cache",
            JSON.stringify({ updateAvailable: true }),
        );

        await updateChecker.checkForUpdate();

        expect(updateChecker.updateAvailable).toBe(false);
        expect(updateChecker.showBadge).toBe(false);
    });

    it("does not show a cached update matching the installed version", async () => {
        localStorage.setItem("clockwise_last_update_check", Date.now().toString());
        localStorage.setItem(
            "clockwise_update_cache",
            JSON.stringify({
                updateAvailable: true,
                latestVersion: versionInfo.appVersion,
            }),
        );

        await updateChecker.checkForUpdate();

        expect(updateChecker.updateAvailable).toBe(false);
        expect(updateChecker.showBadge).toBe(false);
    });
});