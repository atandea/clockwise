import { execSync } from "child_process";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, "..");
const serverDir = path.resolve(root, "..", "clockwise-server");
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

const outputPath = path.join(binDir, `clockwise-server-${triple}`);

console.log(`Building clockwise-server for ${triple}...`);

if (!fs.existsSync(binDir)) {
  fs.mkdirSync(binDir, { recursive: true });
}

const clientDir = path.resolve(serverDir, "client");

// Ensure clockwise-server has dependencies and is built
console.log("Installing server dependencies...");
execSync("npm install --include=dev", { cwd: serverDir, stdio: "inherit" });

console.log("Building dashboard UI...");
execSync("npm run build", { cwd: root, stdio: "inherit" });

console.log("Cleaning and copying client code...");
if (fs.existsSync(clientDir)) {
  fs.rmSync(clientDir, { recursive: true, force: true });
}
fs.mkdirSync(clientDir, { recursive: true });
fs.cpSync(path.join(root, "build"), clientDir, { recursive: true });

console.log("Building server...");
execSync("npm run build", { cwd: serverDir, stdio: "inherit" });

// Build the binary using pkg
console.log("Generating server binary...");
// Map node version to pkg target
// node 24 -> node24
const pkgTarget = "node24-linux-x64"; // Might need to be more dynamic if we want to support other OSs
execSync(`npx @yao-pkg/pkg . -t ${pkgTarget} --output ${outputPath}`, { cwd: serverDir, stdio: "inherit" });

console.log(`Sidecar binary generated at: ${outputPath}`);
