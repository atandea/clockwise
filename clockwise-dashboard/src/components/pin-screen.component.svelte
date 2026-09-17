<script lang="ts">
    import { onMount } from "svelte";

    const PIN_LOCK_STORAGE_KEY = "clockwise_pin_lock_until";
    const PIN_LOCK_DURATION_MS = 60_000;

    interface Props {
        apiBase: string;
        initialLockoutMs?: number;
        onSuccess: (pin: string) => void;
    }
    let { apiBase, initialLockoutMs = 0, onSuccess }: Props = $props();

    let pinInput = $state("");
    let pinDigits = $state<string[]>(["", "", "", ""]);
    let error = $state("");
    let loading = $state(false);
    let lockUntil = $state(0);
    let remainingSeconds = $state(0);
    let pinRefs: HTMLInputElement[] = [];

    function applyLockUntil(nextLockUntil: number) {
        lockUntil = nextLockUntil;
        const remainingMs = Math.max(0, nextLockUntil - Date.now());
        remainingSeconds = Math.ceil(remainingMs / 1000);

        if (remainingMs === 0) {
            lockUntil = 0;
            localStorage.removeItem(PIN_LOCK_STORAGE_KEY);
        } else {
            localStorage.setItem(PIN_LOCK_STORAGE_KEY, nextLockUntil.toString());
        }
    }

    function updateLockout() {
        const storedLockUntil = Number(localStorage.getItem(PIN_LOCK_STORAGE_KEY));
        if (storedLockUntil > Date.now()) {
            applyLockUntil(storedLockUntil);
            return;
        }

        lockUntil = 0;
        remainingSeconds = 0;
        localStorage.removeItem(PIN_LOCK_STORAGE_KEY);
    }

    function startLockout(durationMs = PIN_LOCK_DURATION_MS) {
        const now = Date.now();
        const storedLockUntil = Number(localStorage.getItem(PIN_LOCK_STORAGE_KEY) ?? 0);
        const nextLockUntil = Math.max(storedLockUntil, now + durationMs);
        applyLockUntil(nextLockUntil);
    }

    onMount(() => {
        const startFromServer = Number(initialLockoutMs ?? 0);
        if (startFromServer > 0) {
            startLockout(startFromServer);
        } else {
            const storedLockUntil = Number(
                localStorage.getItem(PIN_LOCK_STORAGE_KEY),
            );
            if (storedLockUntil > Date.now()) {
                applyLockUntil(storedLockUntil);
            } else {
                localStorage.removeItem(PIN_LOCK_STORAGE_KEY);
            }
        }

        const handleStorage = (event: StorageEvent) => {
            if (event.key !== PIN_LOCK_STORAGE_KEY) return;
            updateLockout();
        };

        const interval = window.setInterval(updateLockout, 1000);
        window.addEventListener("storage", handleStorage);

        return () => {
            window.clearInterval(interval);
            window.removeEventListener("storage", handleStorage);
        };
    });

    async function handleSubmit(e: Event) {
        e.preventDefault();
        if (pinInput.length !== 4) {
            error = "Enter 4 digits";
            return;
        }

        loading = true;
        error = "";
        try {
            const res = await fetch(`${apiBase}/security/verify`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ pin: pinInput }),
            });

            if (res.ok) {
                onSuccess(pinInput);
            } else {
                const body = await res.json().catch(() => null);
                const retryAfterMs =
                    typeof body?.retryAfterMs === "number" &&
                    body.retryAfterMs > 0
                        ? body.retryAfterMs
                        : null;

                if (res.status === 429 || (res.status === 403 && body?.disabled)) {
                    startLockout(retryAfterMs ?? PIN_LOCK_DURATION_MS);
                    return;
                }

                error = "Access Denied: Invalid PIN";
            }
        } catch (err) {
            error = "Connection failed";
        } finally {
            loading = false;
        }
    }

    function updatePinValue() {
        pinInput = pinDigits.join("");
    }

    function handleDigitInput(index: number, e: Event) {
        const target = e.target as HTMLInputElement;
        const value = target.value.replace(/\D/g, "").slice(0, 1);
        pinDigits[index] = value;
        target.value = value;
        updatePinValue();

        if (value && index < pinDigits.length - 1) {
            pinRefs[index + 1]?.focus();
        }
    }

    function handleDigitKeydown(index: number, e: KeyboardEvent) {
        if (e.key === "Backspace" && !pinDigits[index] && index > 0) {
            pinRefs[index - 1]?.focus();
            return;
        }

        if (e.key === "ArrowLeft" && index > 0) {
            e.preventDefault();
            pinRefs[index - 1]?.focus();
        }

        if (e.key === "ArrowRight" && index < pinDigits.length - 1) {
            e.preventDefault();
            pinRefs[index + 1]?.focus();
        }
    }
</script>

<div
    class="fixed inset-0 z-50 flex items-center justify-center bg-[#020617] p-4"
>
    <div
        class="w-full max-w-sm rounded-xl border border-gray-800 bg-gray-900/50 p-8 shadow-2xl backdrop-blur-xl"
    >
        <div class="mb-8 flex flex-col items-center text-center">
            <div
                class="mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-blue-500/10 text-blue-500"
            >
                <svg
                    xmlns="http://www.w3.org/2000/svg"
                    viewBox="0 0 24 24"
                    fill="currentColor"
                    class="h-8 w-8"
                >
                    <path
                        fill-rule="evenodd"
                        d="M12 1.5a5.25 5.25 0 00-5.25 5.25v3a3 3 0 00-3 3v6.75a3 3 0 003 3h10.5a3 3 0 003-3v-6.75a3 3 0 00-3-3v-3c0-2.9-2.35-5.25-5.25-5.25zm3.75 8.25v-3a3.75 3.75 0 10-7.5 0v3h7.5z"
                        clip-rule="evenodd"
                    />
                </svg>
            </div>
            <h2 class="text-xl font-bold text-white">Security Required</h2>
            <p class="mt-2 text-sm text-gray-400">
                Network access requires a 4-digit PIN. Look at the Clockwise Dashboard on the host machine to reveal it.
            </p>
        </div>

        <form onsubmit={handleSubmit} class="space-y-8">
            <div class="relative">
                <div class="grid grid-cols-4 gap-3">
                    {#each pinDigits as digit, index}
                        <input
                            bind:this={pinRefs[index]}
                            type="text"
                            inputmode="numeric"
                            autocomplete="one-time-code"
                            maxlength="1"
                            value={digit}
                            oninput={(e) => handleDigitInput(index, e)}
                            onkeydown={(e) => handleDigitKeydown(index, e)}
                            placeholder="0"
                            aria-label={`PIN digit ${index + 1}`}
                            aria-invalid={Boolean(error)}
                            class:border-red-500={Boolean(error)}
                            class="h-16 w-full rounded-lg border border-gray-700 bg-gray-800/50 text-center text-4xl font-black font-mono text-white outline-none ring-blue-500/50 transition-all placeholder:text-slate-600 focus:border-blue-500 focus:ring-4 caret-transparent"
                            disabled={loading || remainingSeconds > 0}
                        />
                    {/each}
                </div>
                {#if error}
                    <p
                        class="absolute left-1/2 top-full z-10 -translate-x-1/2 translate-y-2 whitespace-nowrap text-center text-sm font-medium text-red-400"
                        role="alert"
                    >
                        {error}
                    </p>
                {/if}
                {#if remainingSeconds > 0}
                    <div
                        class="absolute inset-0 flex items-center justify-center rounded-lg bg-gray-950/95 text-center text-sm font-semibold text-amber-300"
                        aria-live="polite"
                    >
                        Try again in {remainingSeconds}s
                    </div>
                {/if}
            </div>

            <button
                type="submit"
                class="flex w-full items-center justify-center rounded-lg bg-blue-600 py-3 font-bold text-white transition-all hover:bg-blue-500 active:scale-[0.98] disabled:opacity-50"
                disabled={
                    loading || remainingSeconds > 0 || pinInput.length !== 4
                }
            >
                {#if loading}
                    <div
                        class="h-5 w-5 animate-spin rounded-full border-2 border-white/20 border-t-white"
                    ></div>
                {:else}
                    Unlock Dashboard
                {/if}
            </button>
        </form>
    </div>
</div>
