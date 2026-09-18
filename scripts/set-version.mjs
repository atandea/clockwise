import { readFile, writeFile } from "fs/promises";
import path from "path";
import { fileURLToPath } from "url";

const rootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const version = process.argv[2];

if (!version || !/^\d+\.\d+\.\d+(-[0-9A-Za-z.-]+)?$/.test(version)) {
  console.error("Usage: node scripts/set-version.mjs <version>");
  process.exit(1);
}

const jsonFiles = [
  "clockwise-dashboard/package.json",
  "clockwise-dashboard/package-lock.json",
  "clockwise-dashboard/src-tauri/tauri.conf.json",
  "clockwise-server/package.json",
  "clockwise-server/package-lock.json",
];

for (const relativePath of jsonFiles) {
  const filePath = path.join(rootDir, relativePath);
  const json = JSON.parse(await readFile(filePath, "utf8"));
  json.version = version;
  if (json.packages?.[""]) json.packages[""].version = version;
  await writeFile(filePath, `${JSON.stringify(json, null, 2)}\n`);
}

const cargoPath = path.join(rootDir, "clockwise-dashboard/src-tauri/Cargo.toml");
const cargo = await readFile(cargoPath, "utf8");
await writeFile(cargoPath, cargo.replace(/^version\s*=\s*".*?"/m, `version = "${version}"`));

console.log(version);