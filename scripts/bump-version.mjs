import { readFile, writeFile } from "fs/promises";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.resolve(__dirname, "..");

const newVersion = process.argv[2];

if (!newVersion || !/^\d+\.\d+\.\d+(-[a-zA-Z0-9.]+)?$/.test(newVersion)) {
  console.error("Usage: node scripts/bump-version.mjs <new-version>");
  console.error("Example: node scripts/bump-version.mjs 1.0.2");
  process.exit(1);
}

const filesToUpdate = [
  {
    path: "clockwise-dashboard/package.json",
    type: "json",
  },
  {
    path: "clockwise-dashboard/src-tauri/tauri.conf.json",
    type: "json",
  },
  {
    path: "clockwise-dashboard/src-tauri/Cargo.toml",
    type: "toml",
  },
  {
    path: "clockwise-server/package.json",
    type: "json",
  },
];

async function updateVersion() {
  for (const file of filesToUpdate) {
    const fullPath = path.join(rootDir, file.path);
    try {
      const content = await readFile(fullPath, "utf8");
      let newContent;

      if (file.type === "json") {
        const json = JSON.parse(content);
        if (json.version !== undefined) {
          json.version = newVersion;
        } else {
          console.warn(`No 'version' field found in ${file.path}`);
        }
        newContent = JSON.stringify(json, null, 2) + "\n";
      } else if (file.type === "toml") {
        // Regex to replace version = "..."
        newContent = content.replace(/^version\s*=\s*".*?"/m, `version = "${newVersion}"`);
      }

      await writeFile(fullPath, newContent, "utf8");
      console.log(`Updated ${file.path} to ${newVersion}`);
    } catch (e) {
      console.error(`Failed to update ${file.path}: ${e.message}`);
    }
  }
  
  console.log(`\nSuccessfully bumped version to ${newVersion} across all components.`);
}

updateVersion();
