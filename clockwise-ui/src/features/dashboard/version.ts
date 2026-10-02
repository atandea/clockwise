export const versionInfo = {
  "appVersion": "1.1.5",
  "nodeEngine": "26.5.1",
  "svelte": "5.57.1",
  "tauriApi": "2.12.0",
  "rust": "1.98.1",
  "nest": "12.0.3",
  "buildDate": "Sep 30, 2026, 2:01:25 PM UTC"
} as const;

export const aboutItems = [
  { label: "App version", value: versionInfo.appVersion },
  { label: "Node engine", value: versionInfo.nodeEngine },
  { label: "Svelte", value: versionInfo.svelte },
  { label: "NestJS", value: versionInfo.nest },
  { label: "Rust version", value: versionInfo.rust },
  { label: "Tauri API", value: versionInfo.tauriApi },
  { label: "Build date", value: versionInfo.buildDate },
  { label: "GitHub", value: "https://github.com/atandea/clockwise", href: "https://github.com/atandea/clockwise" },
] as const;
