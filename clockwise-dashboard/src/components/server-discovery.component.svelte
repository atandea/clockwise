<script lang="ts">
  import { onMount } from "svelte";
  import { getCleanHostname } from "$lib/api";

  let {
    onServerFound = () => {},
    autoConnect = true,
  }: {
    onServerFound?: (ip: string) => void;
    autoConnect?: boolean;
  } = $props();

  let scanning = $state(true);
  let scanCompleted = $state(false);
  let servers = $state<{ ip: string; version: string }[]>([]);
  let progress = $state(0);

  // Manual entry state
  let showManual = $state(false);
  let manualIp = $state("");
  let isTestingManual = $state(false);
  let manualError = $state("");

  onMount(() => {
    scanNetwork();
  });

  async function scanNetwork() {
    scanning = true;
    scanCompleted = false;
    servers = [];
    progress = 0;

    const currentHostname = getCleanHostname();
    const specificHosts = ["127.0.0.1", "localhost"];
    if (currentHostname !== "localhost") {
      specificHosts.push(currentHostname);
    }

    let subnets: string[] = [];

    // Try to detect subnet from current window location
    const hostname = currentHostname;
    // Simple IPv4 regex check
    if (/^(\d{1,3}\.){3}\d{1,3}$/.test(hostname) && hostname !== "127.0.0.1") {
      const parts = hostname.split(".");
      // Add the current subnet
      subnets.push(`${parts[0]}.${parts[1]}.${parts[2]}`);
    }

    // Fallback if no subnet detected (e.g. localhost, or 127.0.0.1)
    if (subnets.length === 0) {
      subnets.push("192.168.0");
      subnets.push("192.168.1");
      subnets.push("192.168.100");
    }

    // Deduplicate specific hosts
    const uniqueHosts = [...new Set(specificHosts)];

    // Total checks: unique hosts + subnets * 255
    const totalChecks = uniqueHosts.length + subnets.length * 255;
    let checked = 0;

    // Auto-connect flag
    let hasConnected = false;

    const tryConnect = async (ip: string) => {
      // If already connected or stopped scanning, abort early
      if (hasConnected || !scanning) return;

      try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 1000); // 1s timeout

        const response = await fetch(`http://${ip}:4100/discovery`, {
          signal: controller.signal,
        });
        clearTimeout(timeoutId);

        if (response.ok) {
          const data = await response.json();
          if (data.service === "clockwise") {
            // Check race condition again
            if (hasConnected) return;

            // Avoid duplicates
            if (!servers.some((s) => s.ip === ip)) {
              servers = [...servers, { ip, version: data.version }];
            }

            // Auto-connect to the first found
            if (autoConnect) {
              hasConnected = true;
              scanning = false;
              selectServer(ip);
            }
          }
        }
      } catch (e) {
        // Ignore errors
      } finally {
        checked++;
        progress = (checked / totalChecks) * 100;
      }
    };

    // Check specific hosts first
    await Promise.all(uniqueHosts.map((host) => tryConnect(host)));
    if (hasConnected) return;

    // Then scan subnets with batching
    const BATCH_SIZE = 20;

    for (const subnet of subnets) {
      if (hasConnected || !scanning) break;

      let currentBatch = [];
      for (let i = 1; i < 255; i++) {
        if (hasConnected || !scanning) break;

        currentBatch.push(tryConnect(`${subnet}.${i}`));
        if (currentBatch.length >= BATCH_SIZE) {
          await Promise.all(currentBatch);
          currentBatch = [];
        }
      }
      if (currentBatch.length > 0) {
        await Promise.all(currentBatch);
      }
    }

    scanning = false;
    scanCompleted = true;
  }

  async function testManualIp() {
    if (!manualIp) return;
    isTestingManual = true;
    manualError = "";

    try {
      // Strip http/https if user added it
      const cleanIp = manualIp.replace(/^https?:\/\//, "").split(":")[0]; // extremely basic cleanup

      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 2000); // 2s timeout for manual

      const response = await fetch(`http://${cleanIp}:4100/discovery`, {
        signal: controller.signal,
      });
      clearTimeout(timeoutId);

      if (response.ok) {
        const data = await response.json();
        if (data.service === "clockwise") {
          onServerFound(cleanIp);
          return;
        }
      }
      manualError = "Server not found or invalid response";
    } catch (e) {
      manualError = "Connection failed";
    } finally {
      isTestingManual = false;
    }
  }

  function selectServer(ip: string) {
    onServerFound(ip);
  }
</script>

<div
  class="p-6 bg-gray-800 rounded-xl shadow-2xl text-white max-w-md w-full border border-gray-700"
>
  <h2 class="text-xl font-bold mb-6 text-center">Server Discovery</h2>

  {#if scanning}
    <div class="mb-4 text-center">
      <p class="text-blue-400 mb-2 animate-pulse">Scanning local network...</p>
      <div class="w-full bg-gray-700 rounded-full h-2">
        <div
          class="bg-blue-500 h-2 rounded-full transition-all duration-300"
          style="width: {progress}%"
        ></div>
      </div>
      <p class="text-xs text-gray-500 mt-2">{Math.round(progress)}%</p>
    </div>
  {/if}

  {#if servers.length > 0}
    <div class="space-y-3">
      <p class="text-sm text-gray-400 mb-2">Found Servers:</p>
      <ul class="space-y-2">
        {#each servers as server}
          <li>
            <button
              class="w-full text-left p-3 hover:bg-gray-700 bg-gray-750 border border-gray-600 rounded-lg flex justify-between items-center transition-all hover:border-blue-500 group"
              onclick={() => selectServer(server.ip)}
            >
              <div>
                <div
                  class="font-mono text-lg text-blue-300 group-hover:text-blue-200"
                >
                  {server.ip}
                </div>
                <div class="text-xs text-gray-500">
                  Version {server.version}
                </div>
              </div>
              <span
                class="text-green-400 group-hover:text-green-300 font-semibold text-sm bg-green-900/30 px-2 py-1 rounded"
                >Connect</span
              >
            </button>
          </li>
        {/each}
      </ul>
    </div>
  {:else if scanCompleted && !scanning}
    <div class="text-center py-4">
      <p class="text-red-400 mb-4 font-medium">No servers found.</p>
      <button
        onclick={scanNetwork}
        class="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2 rounded-lg transition-colors font-medium shadow-lg hover:shadow-blue-500/20"
      >
        Retry Scan
      </button>
    </div>
  {/if}

  {#if scanCompleted && servers.length > 0 && !scanning}
    <div class="mt-6 border-t border-gray-700 pt-4 flex justify-center">
      <button
        onclick={scanNetwork}
        class="text-sm text-gray-500 hover:text-gray-300 underline"
      >
        Rescan Network
      </button>
    </div>
  {/if}

  <div class="mt-6 border-t border-gray-700 pt-4">
    <button
      class="flex w-full items-center justify-between text-left text-sm font-medium text-gray-400 hover:text-gray-300 focus:outline-none"
      onclick={() => (showManual = !showManual)}
    >
      <span>Manual Connection</span>
      <span class="text-xs">{showManual ? "▼" : "▶"}</span>
    </button>

    {#if showManual}
      <div class="mt-3 flex gap-2">
        <input
          type="text"
          bind:value={manualIp}
          placeholder="192.168.x.x"
          class="flex-1 rounded border border-gray-600 bg-gray-900 px-3 py-2 text-sm text-white outline-none transition-colors focus:border-blue-500"
          onkeydown={(e) => e.key === "Enter" && testManualIp()}
        />
        <button
          onclick={testManualIp}
          disabled={isTestingManual || !manualIp}
          class="rounded bg-gray-700 px-4 py-2 text-sm text-white transition-colors hover:bg-gray-600 disabled:opacity-50"
        >
          {isTestingManual ? "..." : "Connect"}
        </button>
      </div>
      {#if manualError}
        <p class="mt-2 text-xs text-red-400">{manualError}</p>
      {/if}
    {/if}
  </div>
</div>
