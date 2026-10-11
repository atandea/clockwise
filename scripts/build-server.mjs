import { execFileSync, execSync } from "child_process";
import fs from "fs";
import os from "os";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, "..", "clockwise-ui");
const serverDir = path.resolve(__dirname, "..", "clockwise-server");
const binDir = path.resolve(root, "src-tauri", "bin");

// Determine the target triple. For now, we assume linux x64 as requested.
// In a more robust setup, we could use `rustc -vV` to get the host triple.
let triple = "x86_64-unknown-linux-gnu";
try {
  const rustcOutput = execSync("rustc -vV").toString();
  const hostMatch = rustcOutput.match(/host: (.*)/);
  if (hostMatch) {
    triple = hostMatch[1].trim();
  }
} catch (e) {
  console.warn("Could not determine host triple via rustc, using default:", triple);
}

const sidecarExtension = process.platform === "win32" ? ".exe" : "";
const outputPath = path.join(binDir, `clockwise-server-${triple}${sidecarExtension}`);
const nodeVersion = process.versions.node.split(".").map(Number);
const buildEnv = {
  ...process.env,
  PATH: `${path.dirname(process.execPath)}${path.delimiter}${process.env.PATH || ""}`,
};

if (nodeVersion[0] < 26 || (nodeVersion[0] === 26 && nodeVersion[1] < 9)) {
  throw new Error(`Node.js 26.9 or newer is required to build SEA VFS sidecars (found ${process.version}).`);
}

console.log(`Building clockwise-server for ${triple}...`);

if (!fs.existsSync(binDir)) {
  fs.mkdirSync(binDir, { recursive: true });
}

const clientDir = path.resolve(serverDir, "client");

// Ensure clockwise-server has dependencies and is built
console.log("Installing server dependencies...");
execSync("npm install --include=dev", { cwd: serverDir, stdio: "inherit", env: buildEnv });

console.log("Building dashboard UI...");
execSync("npm run build", { cwd: root, stdio: "inherit", env: buildEnv });

console.log("Cleaning and copying client code...");
if (fs.existsSync(clientDir)) {
  fs.rmSync(clientDir, { recursive: true, force: true });
}
fs.mkdirSync(clientDir, { recursive: true });
fs.cpSync(path.join(root, "build"), clientDir, { recursive: true });

console.log("Building server...");
execSync("npm run build", { cwd: serverDir, stdio: "inherit", env: buildEnv });

console.log("Removing development dependencies before packaging...");
execSync("npm prune --omit=dev", { cwd: serverDir, stdio: "inherit", env: buildEnv });

const stagingDir = fs.mkdtempSync(path.join(os.tmpdir(), "clockwise-sea-"));
const seaMainPath = path.join(stagingDir, "main.cjs");
const seaConfigPath = path.join(stagingDir, "sea-config.json");
const assets = {};

function addDirectoryAssets(sourceDir, virtualPrefix) {
  if (!fs.existsSync(sourceDir)) {
    throw new Error(`Required SEA asset directory not found: ${sourceDir}`);
  }

  for (const entry of fs.readdirSync(sourceDir, { withFileTypes: true })) {
    const sourcePath = path.join(sourceDir, entry.name);
    const virtualPath = path.posix.join(virtualPrefix, entry.name);
    if (entry.isDirectory()) {
      addDirectoryAssets(sourcePath, virtualPath);
    } else if (entry.isFile()) {
      assets[virtualPath] = sourcePath;
    }
  }
}

console.log("Preparing SEA virtual filesystem...");
addDirectoryAssets(path.join(serverDir, "dist"), "dist");
addDirectoryAssets(path.join(serverDir, "node_modules"), "node_modules");
addDirectoryAssets(clientDir, "client");
fs.writeFileSync(seaMainPath, "require('./dist/main.js');\n");
fs.writeFileSync(
  seaConfigPath,
  JSON.stringify(
    {
      main: seaMainPath,
      output: outputPath,
      useVfs: true,
      useSnapshot: false,
      useCodeCache: false,
      disableExperimentalSEAWarning: true,
      assets,
    },
    null,
    2,
  ),
);

console.log("Generating SEA server binary...");
try {
  execFileSync(process.execPath, ["--build-sea", seaConfigPath], { stdio: "inherit" });
} finally {
  fs.rmSync(stagingDir, { recursive: true, force: true });
}

if (process.platform !== "win32") {
  fs.chmodSync(outputPath, 0o755);
}

console.log("Smoke-testing SEA server binary...");
execFileSync(process.execPath, [path.join(__dirname, "smoke-sea-server.mjs"), outputPath], {
  stdio: "inherit",
});

console.log(`Sidecar binary generated at: ${outputPath}`);
