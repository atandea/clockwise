export const versionInfo = {
  "appVersion": "0.1.0",
  "nodeEngine": "24",
  "svelteKit": "2.56.1",
  "tauriApi": "2.10.1",
  "buildDate": "Apr 6, 2026, 7:48:54 PM UTC"
} as const;

export const aboutItems = [
  { label: "App version", value: versionInfo.appVersion },
  { label: "Node engine", value: versionInfo.nodeEngine },
  { label: "SvelteKit", value: versionInfo.svelteKit },
  { label: "Tauri API", value: versionInfo.tauriApi },
  { label: "Build date", value: versionInfo.buildDate },
] as const;
