import { readFile, writeFile } from "fs/promises";
import { execSync } from "child_process";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, "..");
const packageJsonPath = path.join(root, "package.json");
const lockJsonPath = path.join(root, "package-lock.json");
const outputPath = path.join(root, "src", "lib", "version.ts");

const readJson = async (file) => JSON.parse(await readFile(file, "utf8"));

const getVersion = (command) => {
  try {
    return execSync(command).toString().trim().split(" ")[1];
  } catch (e) {
    return "-";
  }
};

const pkg = await readJson(packageJsonPath);
const serverPkgPath = path.join(root, "..", "clockwise-server", "package.json");
const serverPkg = await readJson(serverPkgPath).catch(() => ({}));

const lock = await readJson(lockJsonPath);
const lockPackages = lock.packages || {};
const getResolvedVersion = (name, fallback = "-") =>
  lockPackages[`node_modules/${name}`]?.version || fallback;

// Statically extract the exact Node version packaged by @yao-pkg/pkg from pkg-fetch metadata
const targetMajor = pkg.engines?.node || "24";
let nodeEngineVersion = "-";
try {
  const serverRoot = path.resolve(root, "..", "clockwise-server");
  const shasJsonPath = path.join(serverRoot, "node_modules", "@yao-pkg", "pkg-fetch", "lib-es5", "expected-shas.json");
  const shas = await readJson(shasJsonPath);
  const prefix = `node-v${targetMajor}.`;
  const matchedKey = Object.keys(shas).find(k => k.startsWith(prefix));
  if (matchedKey) {
    const match = matchedKey.match(/node-v([^-]+)/);
    if (match) {
      nodeEngineVersion = match[1];
    }
  }
} catch (e) {
  nodeEngineVersion = process.version.replace(/^v/, "");
}

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
  nodeEngine: nodeEngineVersion,
  svelte: getResolvedVersion("svelte", pkg.devDependencies?.["svelte"] || "-"),
  tauriApi: getResolvedVersion("@tauri-apps/api", pkg.dependencies?.["@tauri-apps/api"] || "-"),
  rust: getVersion("rustc --version"),
  nest: serverPkg.dependencies?.["@nestjs/core"]?.replace("^", "") || "-",
  buildDate: localizedBuildDate,
};

const contents = `export const versionInfo = ${JSON.stringify(versionInfo, null, 2)} as const;

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
`;

await writeFile(outputPath, contents, "utf8");
console.log(`Generated ${path.relative(root, outputPath)}`);
