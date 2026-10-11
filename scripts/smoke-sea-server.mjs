import { spawn } from "child_process";
import fs from "fs";
import os from "os";
import path from "path";
import { createServer } from "net";

const sidecarPath = path.resolve(process.argv[2] || "");
if (!sidecarPath || !fs.existsSync(sidecarPath)) {
  throw new Error(`SEA server executable not found: ${sidecarPath}`);
}

const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), "clockwise-sea-smoke-"));
const dataFile = path.join(tempDir, "data.json");
const settingsFile = path.join(tempDir, "settings.json");
const port = await new Promise((resolve, reject) => {
  const server = createServer();
  server.once("error", reject);
  server.listen(0, "127.0.0.1", () => {
    const address = server.address();
    server.close((error) => (error ? reject(error) : resolve(address.port)));
  });
});

const child = spawn(sidecarPath, [], {
  env: { ...process.env, APP_DATA_FILE: dataFile, PORT: String(port) },
  stdio: ["ignore", "pipe", "pipe"],
});
let childOutput = "";
for (const stream of [child.stdout, child.stderr]) {
  stream.setEncoding("utf8");
  stream.on("data", (chunk) => {
    childOutput = `${childOutput}${chunk}`.slice(-8000);
  });
}

const delay = (milliseconds) => new Promise((resolve) => setTimeout(resolve, milliseconds));

try {
  const deadline = Date.now() + 20_000;
  let apiResponse;
  while (Date.now() < deadline) {
    if (child.exitCode !== null) {
      throw new Error(`SEA server exited with code ${child.exitCode}.\n${childOutput}`);
    }

    try {
      apiResponse = await fetch(`http://127.0.0.1:${port}/api/v1/security/status`, {
        signal: AbortSignal.timeout(1000),
      });
      if (apiResponse.ok) break;
    } catch {}
    await delay(200);
  }

  if (!apiResponse?.ok) {
    throw new Error(`SEA server did not become ready.\n${childOutput}`);
  }
  await apiResponse.json();

  const uiResponse = await fetch(`http://127.0.0.1:${port}/`, {
    signal: AbortSignal.timeout(3000),
  });
  if (!uiResponse.ok || !(await uiResponse.text()).includes("<html")) {
    throw new Error(`SEA server did not serve the embedded dashboard (HTTP ${uiResponse.status}).`);
  }

  const settingsResponse = await fetch(`http://127.0.0.1:${port}/api/v1/settings`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ seaSmokeTest: "passed" }),
    signal: AbortSignal.timeout(3000),
  });
  if (!settingsResponse.ok) {
    throw new Error(`SEA server could not write settings (HTTP ${settingsResponse.status}).`);
  }

  const settings = JSON.parse(fs.readFileSync(settingsFile, "utf8"));
  if (settings.seaSmokeTest !== "passed") {
    throw new Error("SEA server did not persist settings to APP_DATA_FILE's directory.");
  }

  console.log("SEA smoke test passed: API, embedded dashboard, and writable settings.");
} finally {
  if (child.exitCode === null) {
    child.kill();
    await new Promise((resolve) => child.once("exit", resolve));
  }
  fs.rmSync(tempDir, { recursive: true, force: true });
}