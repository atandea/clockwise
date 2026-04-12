<script lang="ts">
    interface Props {
        apiBase: string;
        onSuccess: (pin: string) => void;
    }
    let { apiBase, onSuccess }: Props = $props();

    let pinInput = $state("");
    let error = $state("");
    let loading = $state(false);

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
                error = "Access Denied: Invalid PIN";
            }
        } catch (err) {
            error = "Connection failed";
        } finally {
            loading = false;
        }
    }

    function handleInput(e: Event) {
        const target = e.target as HTMLInputElement;
        target.value = target.value.replace(/\D/g, "").slice(0, 4);
        pinInput = target.value;
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

        <form onsubmit={handleSubmit} class="space-y-6">
            <div class="relative">
                <input
                    type="text"
                    inputmode="numeric"
                    autocomplete="one-time-code"
                    value={pinInput}
                    oninput={handleInput}
                    placeholder="0000"
                    class="block w-full rounded-lg border border-gray-700 bg-gray-800/50 py-4 text-center text-4xl font-black font-mono tracking-[0.75em] pl-[0.75em] text-white outline-none ring-blue-500/50 transition-all placeholder:opacity-20 focus:border-blue-500 focus:ring-4"
                    disabled={loading}
                />
            </div>

            {#if error}
                <p class="text-center text-sm font-medium text-red-400">
                    {error}
                </p>
            {/if}

            <button
                type="submit"
                class="flex w-full items-center justify-center rounded-lg bg-blue-600 py-3 font-bold text-white transition-all hover:bg-blue-500 active:scale-[0.98] disabled:opacity-50"
                disabled={loading || pinInput.length !== 4}
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
