export const versionInfo = {
  "appVersion": "0.1.0",
  "nodeEngine": "24",
  "svelte": "5.55.4",
  "tauriApi": "2.10.1",
  "buildDate": "Apr 23, 2026, 1:37:27 PM UTC"
} as const;

export const aboutItems = [
  { label: "App version", value: versionInfo.appVersion },
  { label: "Node engine", value: versionInfo.nodeEngine },
  { label: "Svelte", value: versionInfo.svelte },
  { label: "Tauri API", value: versionInfo.tauriApi },
  { label: "Build date", value: versionInfo.buildDate },
  { label: "GitHub", value: "https://github.com/atandea/clockwise", href: "https://github.com/atandea/clockwise" },
] as const;
