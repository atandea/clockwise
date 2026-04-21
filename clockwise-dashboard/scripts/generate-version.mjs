import { readFile, writeFile } from "fs/promises";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, "..");
const packageJsonPath = path.join(root, "package.json");
const lockJsonPath = path.join(root, "package-lock.json");
const outputPath = path.join(root, "src", "lib", "version.ts");

const readJson = async (file) => JSON.parse(await readFile(file, "utf8"));
const pkg = await readJson(packageJsonPath);
const lock = await readJson(lockJsonPath);
const lockPackages = lock.packages || {};
const getResolvedVersion = (name, fallback = "-") =>
  lockPackages[`node_modules/${name}`]?.version || fallback;

const buildDate = new Date();
const localizedBuildDate = new Intl.DateTimeFormat(undefined, {
  year: "numeric",
  month: "short",
  day: "numeric",
  hour: "numeric",
  minute: "numeric",
  second: "numeric",
  timeZone: "UTC",
  timeZoneName: "short",
}).format(buildDate);
const versionInfo = {
  appVersion: pkg.version || "-",
  nodeEngine: lockPackages[""]?.engines?.node || pkg.engines?.node || "-",
  svelte: getResolvedVersion("svelte", pkg.devDependencies?.["svelte"] || "-"),
  tauriApi: getResolvedVersion("@tauri-apps/api", pkg.dependencies?.["@tauri-apps/api"] || "-"),
  buildDate: localizedBuildDate,
};

const contents = `export const versionInfo = ${JSON.stringify(versionInfo, null, 2)} as const;

export const aboutItems = [
  { label: "App version", value: versionInfo.appVersion },
  { label: "Node engine", value: versionInfo.nodeEngine },
  { label: "Svelte", value: versionInfo.svelte },
  { label: "Tauri API", value: versionInfo.tauriApi },
  { label: "Build date", value: versionInfo.buildDate },
  { label: "GitHub", value: "https://github.com/atandea/clockwise", href: "https://github.com/atandea/clockwise" },
] as const;
`;

await writeFile(outputPath, contents, "utf8");
console.log(`Generated ${path.relative(root, outputPath)}`);
