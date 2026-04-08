export const versionInfo = {
  "appVersion": "0.1.0",
  "nodeEngine": "24",
  "svelteKit": "2.57.0",
  "tauriApi": "2.10.1",
  "buildDate": "Apr 8, 2026, 6:32:31 PM UTC"
} as const;

export const aboutItems = [
  { label: "App version", value: versionInfo.appVersion },
  { label: "Node engine", value: versionInfo.nodeEngine },
  { label: "SvelteKit", value: versionInfo.svelteKit },
  { label: "Tauri API", value: versionInfo.tauriApi },
  { label: "Build date", value: versionInfo.buildDate },
  { label: "GitHub", value: "https://github.com/atandea/clockwise", href: "https://github.com/atandea/clockwise" },
] as const;
