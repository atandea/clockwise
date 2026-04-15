export const versionInfo = {
  "appVersion": "0.1.0",
  "nodeEngine": "24",
  "svelteKit": "2.57.1",
  "tauriApi": "2.10.1",
  "buildDate": "Apr 15, 2026, 5:35:46 PM UTC"
} as const;

export const aboutItems = [
  { label: "App version", value: versionInfo.appVersion, href: undefined },
  { label: "Node engine", value: versionInfo.nodeEngine, href: undefined },
  { label: "SvelteKit", value: versionInfo.svelteKit, href: undefined },
  { label: "Tauri API", value: versionInfo.tauriApi, href: undefined },
  { label: "Build date", value: versionInfo.buildDate, href: undefined },
  { label: "GitHub", value: "https://github.com/atandea/clockwise", href: "https://github.com/atandea/clockwise" },
] as const;
