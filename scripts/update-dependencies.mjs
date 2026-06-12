import { readFile } from "fs/promises";
import { exec } from "child_process";
import { promisify } from "util";
import path from "path";
import { fileURLToPath } from "url";

const execAsync = promisify(exec);
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.resolve(__dirname, "..");

const locations = [
  {
    name: "clockwise-server",
    path: "clockwise-server",
    type: "npm",
    updateCmd: "npm update",
    lockfile: "package-lock.json"
  },
  {
    name: "clockwise-dashboard",
    path: "clockwise-dashboard",
    type: "npm",
    updateCmd: "npm update",
    lockfile: "package-lock.json"
  },
  {
    name: "clockwise-dashboard/src-tauri",
    path: "clockwise-dashboard/src-tauri",
    type: "cargo",
    updateCmd: "cargo update",
    lockfile: "Cargo.lock"
  }
];

async function getLockfileVersions(lockfilePath, type) {
  try {
    const content = await readFile(lockfilePath, "utf8");
    if (type === "npm") {
      const lock = JSON.parse(content);
      const versions = {};
      if (lock.packages) {
        for (const [pkgPath, pkg] of Object.entries(lock.packages)) {
          if (!pkgPath) continue; // Skip root package
          if (pkg.version) {
            const name = pkgPath.replace(/^node_modules\//, "");
            // Only list dependencies, avoid sub-dependencies if they are deeply nested
            // (e.g. node_modules/foo/node_modules/bar) to keep the list short and clean.
            if (!pkgPath.includes("/node_modules/")) {
              versions[name] = pkg.version;
            }
          }
        }
      }
      return versions;
    } else if (type === "cargo") {
      const versions = {};
      const packageBlocks = content.split(/\[\[package\]\]/);
      for (const block of packageBlocks) {
        const nameMatch = block.match(/name\s*=\s*"([^"]+)"/);
        const versionMatch = block.match(/version\s*=\s*"([^"]+)"/);
        if (nameMatch && versionMatch) {
          const name = nameMatch[1];
          const version = versionMatch[1];
          if (!versions[name]) {
            versions[name] = [];
          }
          versions[name].push(version);
        }
      }
      for (const name in versions) {
        versions[name].sort();
      }
      return versions;
    }
  } catch (e) {
    return {};
  }
}

function compareVersionMaps(oldMap, newMap, type) {
  const updates = [];
  const added = [];
  const removed = [];

  const allKeys = new Set([...Object.keys(oldMap), ...Object.keys(newMap)]);

  if (type === "npm") {
    for (const key of allKeys) {
      const oldVer = oldMap[key];
      const newVer = newMap[key];
      if (oldVer && newVer) {
        if (oldVer !== newVer) {
          updates.push({ name: key, from: oldVer, to: newVer });
        }
      } else if (newVer) {
        added.push({ name: key, version: newVer });
      } else if (oldVer) {
        removed.push({ name: key, version: oldVer });
      }
    }
  } else if (type === "cargo") {
    for (const key of allKeys) {
      const oldVers = oldMap[key] || [];
      const newVers = newMap[key] || [];
      
      const oldSet = new Set(oldVers);
      const newSet = new Set(newVers);

      for (const v of newVers) {
        if (!oldSet.has(v)) {
          if (oldVers.length === 1 && newVers.length === 1) {
            updates.push({ name: key, from: oldVers[0], to: newVers[0] });
          } else {
            added.push({ name: key, version: v });
          }
        }
      }
      for (const v of oldVers) {
        if (!newSet.has(v)) {
          if (oldVers.length === 1 && newVers.length === 1) {
            // Handled as update
          } else {
            removed.push({ name: key, version: v });
          }
        }
      }
    }
  }

  return { updates, added, removed };
}

async function main() {
  console.log("Checking git repository status...");
  try {
    const { stdout: statusOut } = await execAsync("git status --porcelain");
    if (statusOut.trim() !== "") {
      console.warn("WARNING: Git working directory is not clean. Proceeding anyway, but only staging dependency changes.");
    }
  } catch (e) {
    console.error("Failed to run git status. Is git installed and is this a git repo?", e.message);
    process.exit(1);
  }

  const reports = {};
  const filesToStage = [];

  for (const loc of locations) {
    const locFullPath = path.join(rootDir, loc.path);
    const lockfilePath = path.join(locFullPath, loc.lockfile);
    
    console.log(`\n--- Processing ${loc.name} ---`);
    console.log("Reading lockfile before update...");
    const oldVersions = await getLockfileVersions(lockfilePath, loc.type);

    console.log(`Running: ${loc.updateCmd} in ${loc.path}`);
    try {
      const { stdout, stderr } = await execAsync(loc.updateCmd, { cwd: locFullPath });
      if (stdout) console.log(stdout);
      if (stderr) console.error(stderr);
    } catch (e) {
      console.error(`Failed to update ${loc.name}:`, e.message);
      continue;
    }

    console.log("Reading lockfile after update...");
    const newVersions = await getLockfileVersions(lockfilePath, loc.type);

    const diff = compareVersionMaps(oldVersions, newVersions, loc.type);
    reports[loc.name] = diff;

    // Track files to stage
    filesToStage.push(path.join(loc.path, loc.lockfile));
    // Also stage package.json / Cargo.toml if they were modified
    if (loc.type === "npm") {
      filesToStage.push(path.join(loc.path, "package.json"));
    } else if (loc.type === "cargo") {
      filesToStage.push(path.join(loc.path, "Cargo.toml"));
    }
  }

  // Construct short list
  let changeSummary = "";
  let hasChanges = false;

  for (const [name, diff] of Object.entries(reports)) {
    const { updates, added, removed } = diff;
    if (updates.length === 0 && added.length === 0 && removed.length === 0) {
      continue;
    }
    hasChanges = true;
    changeSummary += `\n${name}:\n`;
    if (updates.length > 0) {
      changeSummary += "  Updated:\n";
      for (const u of updates) {
        changeSummary += `    - ${u.name}: ${u.from} -> ${u.to}\n`;
      }
    }
    if (added.length > 0) {
      changeSummary += "  Added:\n";
      for (const a of added) {
        changeSummary += `    - ${a.name}: ${a.version}\n`;
      }
    }
    if (removed.length > 0) {
      changeSummary += "  Removed:\n";
      for (const r of removed) {
        changeSummary += `    - ${r.name}: ${r.version}\n`;
      }
    }
  }

  if (!hasChanges) {
    console.log("\nNo dependency updates found.");
    process.exit(0);
  }

  console.log("\n--- Update Summary ---");
  console.log(changeSummary);

  // Stage changes
  console.log("Staging modified dependency files...");
  for (const file of filesToStage) {
    const fullPath = path.join(rootDir, file);
    try {
      await execAsync(`git add "${fullPath}"`);
    } catch (e) {
      // Ignore if file wasn't actually modified
    }
  }

  // Commit changes
  const commitMessage = `chore: dependencies update\n${changeSummary}`;
  console.log("Creating commit...");
  try {
    const { stdout } = await execAsync(`git commit -m "${commitMessage.replace(/"/g, '\\"')}"`);
    console.log("Commit successful!");
    console.log(stdout);
  } catch (e) {
    console.error("Failed to commit:", e.message);
  }
}

main();
