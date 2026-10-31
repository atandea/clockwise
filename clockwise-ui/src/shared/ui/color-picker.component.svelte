<script lang="ts">
    import { onMount, onDestroy } from "svelte";

    let {
        id = "",
        value = "#ffffff",
        label = "Color",
        onSelect = () => {},
    }: {
        id?: string;
        value?: string;
        label?: string;
        onSelect?: (color: string) => void;
    } = $props();

    let isOpen = $state(false);
    let draftHex = $state("");
    let hexInputText = $state("");
    let h = $state(0);
    let s = $state(0);
    let v = $state(100);

    let svEl = $state<HTMLDivElement | null>(null);
    let isDraggingSv = $state(false);
    let isDraggingHue = $state(false);

    const PRESETS = [
        "#ffffff",
        "#94a3b8",
        "#ef4444",
        "#f97316",
        "#eab308",
        "#22c55e",
        "#06b6d4",
        "#3b82f6",
        "#a855f7",
        "#ec4899",
    ];

    function hexToHsv(hex: string): { h: number; s: number; v: number } {
        let clean = hex.replace("#", "").trim();
        if (clean.length === 3) {
            clean = clean
                .split("")
                .map((c) => c + c)
                .join("");
        }
        if (clean.length !== 6) {
            return { h: 0, s: 0, v: 100 };
        }
        const r = parseInt(clean.substring(0, 2), 16) / 255;
        const g = parseInt(clean.substring(2, 4), 16) / 255;
        const b = parseInt(clean.substring(4, 6), 16) / 255;

        const max = Math.max(r, g, b);
        const min = Math.min(r, g, b);
        const d = max - min;

        let hue = 0;
        const sat = max === 0 ? 0 : d / max;
        const val = max;

        if (max !== min) {
            switch (max) {
                case r:
                    hue = (g - b) / d + (g < b ? 6 : 0);
                    break;
                case g:
                    hue = (b - r) / d + 2;
                    break;
                case b:
                    hue = (r - g) / d + 4;
                    break;
            }
            hue /= 6;
        }

        return {
            h: Math.round(hue * 360),
            s: Math.round(sat * 100),
            v: Math.round(val * 100),
        };
    }

    function hsvToHex(hue: number, sat: number, val: number): string {
        const hNorm = (hue % 360) / 360;
        const sNorm = Math.max(0, Math.min(100, sat)) / 100;
        const vNorm = Math.max(0, Math.min(100, val)) / 100;

        let r = 0,
            g = 0,
            b = 0;
        const i = Math.floor(hNorm * 6);
        const f = hNorm * 6 - i;
        const p = vNorm * (1 - sNorm);
        const q = vNorm * (1 - f * sNorm);
        const t = vNorm * (1 - (1 - f) * sNorm);

        switch (i % 6) {
            case 0:
                r = vNorm;
                g = t;
                b = p;
                break;
            case 1:
                r = q;
                g = vNorm;
                b = p;
                break;
            case 2:
                r = p;
                g = vNorm;
                b = t;
                break;
            case 3:
                r = p;
                g = q;
                b = vNorm;
                break;
            case 4:
                r = t;
                g = p;
                b = vNorm;
                break;
            case 5:
                r = vNorm;
                g = p;
                b = q;
                break;
        }

        const toHex = (num: number) => {
            const hex = Math.round(num * 255).toString(16);
            return hex.length === 1 ? "0" + hex : hex;
        };

        return `#${toHex(r)}${toHex(g)}${toHex(b)}`;
    }

    function openPicker() {
        draftHex = value;
        hexInputText = value;
        const hsv = hexToHsv(value);
        h = hsv.h;
        s = hsv.s;
        v = hsv.v;
        isOpen = true;
    }

    function closePicker() {
        isOpen = false;
        isDraggingSv = false;
        isDraggingHue = false;
    }

    function confirmSelect() {
        onSelect(draftHex);
        closePicker();
    }

    function applyPreset(color: string) {
        draftHex = color;
        hexInputText = color;
        const hsv = hexToHsv(color);
        h = hsv.h;
        s = hsv.s;
        v = hsv.v;
    }

    function handleHexInput(val: string) {
        hexInputText = val;
        let clean = val.trim();
        if (!clean.startsWith("#")) clean = "#" + clean;
        if (/^#[0-9a-fA-F]{6}$/.test(clean)) {
            draftHex = clean.toLowerCase();
            const hsv = hexToHsv(clean);
            h = hsv.h;
            s = hsv.s;
            v = hsv.v;
        }
    }

    function updateSvFromPointer(e: PointerEvent, el: HTMLElement) {
        const rect = el.getBoundingClientRect();
        const x = Math.max(0, Math.min(rect.width, e.clientX - rect.left));
        const y = Math.max(0, Math.min(rect.height, e.clientY - rect.top));
        s = Math.round((x / rect.width) * 100);
        v = Math.round((1 - y / rect.height) * 100);
        draftHex = hsvToHex(h, s, v);
        hexInputText = draftHex;
    }

    function handleSvPointerDown(e: PointerEvent) {
        const el = e.currentTarget as HTMLElement;
        el.setPointerCapture(e.pointerId);
        isDraggingSv = true;
        updateSvFromPointer(e, el);
    }

    function handleSvPointerMove(e: PointerEvent) {
        if (!isDraggingSv) return;
        const el = e.currentTarget as HTMLElement;
        updateSvFromPointer(e, el);
    }

    function handleSvPointerUp(e: PointerEvent) {
        if (isDraggingSv) {
            const el = e.currentTarget as HTMLElement;
            try {
                el.releasePointerCapture(e.pointerId);
            } catch (_) {}
            isDraggingSv = false;
        }
    }

    function updateHueFromPointer(e: PointerEvent, el: HTMLElement) {
        const rect = el.getBoundingClientRect();
        const x = Math.max(0, Math.min(rect.width, e.clientX - rect.left));
        let newH = Math.round((x / rect.width) * 360);
        if (newH >= 360) newH = 0;
        h = newH;
        draftHex = hsvToHex(h, s, v);
        hexInputText = draftHex;
    }

    function handleHuePointerDown(e: PointerEvent) {
        const el = e.currentTarget as HTMLElement;
        el.setPointerCapture(e.pointerId);
        isDraggingHue = true;
        updateHueFromPointer(e, el);
    }

    function handleHuePointerMove(e: PointerEvent) {
        if (!isDraggingHue) return;
        const el = e.currentTarget as HTMLElement;
        updateHueFromPointer(e, el);
    }

    function handleHuePointerUp(e: PointerEvent) {
        if (isDraggingHue) {
            const el = e.currentTarget as HTMLElement;
            try {
                el.releasePointerCapture(e.pointerId);
            } catch (_) {}
            isDraggingHue = false;
        }
    }

    function handleKeydown(e: KeyboardEvent) {
        if (!isOpen) return;
        if (e.key === "Escape") {
            closePicker();
        } else if (e.key === "Enter") {
            confirmSelect();
        }
    }

    onMount(() => {
        window.addEventListener("keydown", handleKeydown);
    });

    onDestroy(() => {
        window.removeEventListener("keydown", handleKeydown);
    });
</script>

<div class="inline-flex items-center">
    <!-- Color Swatch Trigger Button -->
    <button
        type="button"
        {id}
        class="w-8 h-8 rounded-lg border-2 border-white/20 shadow-md cursor-pointer transition-transform hover:scale-105 active:scale-95 focus:outline-none focus:ring-2 focus:ring-blue-500/50"
        style="background-color: {value};"
        onclick={openPicker}
        title="Choose {label}"
        aria-label="Choose {label}"
    ></button>
</div>

{#if isOpen}
    <div
        class="fixed inset-0 z-50 flex items-center justify-center p-4"
        role="dialog"
        aria-modal="true"
        aria-label="Color Picker"
    >
        <!-- Backdrop -->
        <div
            class="absolute inset-0 bg-black/60 backdrop-blur-xs transition-opacity animate-in fade-in duration-150"
            onclick={closePicker}
            aria-hidden="true"
        ></div>

        <!-- Dialog Container -->
        <div
            class="relative z-10 w-80 rounded-2xl border border-gray-700/80 bg-gray-900 p-4 shadow-2xl transition-all animate-in fade-in zoom-in-95 duration-150 flex flex-col gap-3.5 select-none"
        >
            <!-- Header -->
            <div class="flex items-center justify-between pb-1 border-b border-gray-800">
                <span class="text-xs font-bold uppercase tracking-wider text-gray-300">
                    {label}
                </span>
                <button
                    type="button"
                    class="text-gray-400 hover:text-white transition-colors text-xs font-medium p-1"
                    onclick={closePicker}
                >
                    ✕
                </button>
            </div>

            <!-- Saturation & Value (Brightness) 2D Picker -->
            <div
                class="relative w-full h-40 rounded-xl overflow-hidden cursor-crosshair touch-none"
                style="background-color: hsl({h}, 100%, 50%);"
                role="slider"
                tabindex="0"
                aria-label="Color saturation and brightness"
                aria-valuenow={s}
                aria-valuemin="0"
                aria-valuemax="100"
                bind:this={svEl}
                onpointerdown={handleSvPointerDown}
                onpointermove={handleSvPointerMove}
                onpointerup={handleSvPointerUp}
                onpointercancel={handleSvPointerUp}
            >
                <!-- White gradient (Saturation: Left to Right) -->
                <div
                    class="absolute inset-0 pointer-events-none"
                    style="background: linear-gradient(to right, #ffffff, transparent);"
                ></div>
                <!-- Black gradient (Brightness: Bottom to Top) -->
                <div
                    class="absolute inset-0 pointer-events-none"
                    style="background: linear-gradient(to top, #000000, transparent);"
                ></div>

                <!-- Cursor Indicator -->
                <div
                    class="absolute w-4 h-4 rounded-full border-2 border-white shadow-[0_0_4px_rgba(0,0,0,0.8)] -translate-x-1/2 -translate-y-1/2 pointer-events-none transition-transform"
                    style="left: {s}%; top: {100 - v}%; background-color: {draftHex};"
                ></div>
            </div>

            <!-- Hue Rainbow Slider -->
            <div
                class="relative w-full h-4 rounded-full cursor-pointer touch-none shadow-inner"
                style="background: linear-gradient(to right, #f00 0%, #ff0 17%, #0f0 33%, #0ff 50%, #00f 67%, #f0f 83%, #f00 100%);"
                role="slider"
                tabindex="0"
                aria-label="Color hue"
                aria-valuenow={h}
                aria-valuemin="0"
                aria-valuemax="360"
                onpointerdown={handleHuePointerDown}
                onpointermove={handleHuePointerMove}
                onpointerup={handleHuePointerUp}
                onpointercancel={handleHuePointerUp}
            >
                <!-- Slider Thumb -->
                <div
                    class="absolute top-1/2 -translate-y-1/2 -translate-x-1/2 w-4 h-4 rounded-full border-2 border-white bg-gray-900 shadow-md pointer-events-none"
                    style="left: {(h / 360) * 100}%;"
                ></div>
            </div>

            <!-- Preset Swatches -->
            <div class="flex items-center justify-between gap-1 pt-0.5">
                {#each PRESETS as preset}
                    <button
                        type="button"
                        class="w-5 h-5 rounded-md border border-white/10 hover:scale-125 transition-transform cursor-pointer {draftHex.toLowerCase() === preset.toLowerCase() ? 'ring-2 ring-white ring-offset-1 ring-offset-gray-900' : ''}"
                        style="background-color: {preset};"
                        onclick={() => applyPreset(preset)}
                        title={preset}
                    ></button>
                {/each}
            </div>

            <!-- Preview Swatches & Hex Input -->
            <div class="flex items-center gap-2.5 pt-1">
                <!-- Current vs New Color Comparison -->
                <div class="flex items-center rounded-lg overflow-hidden border border-gray-700 h-8 shrink-0 shadow-inner">
                    <div
                        class="w-6 h-full"
                        style="background-color: {value};"
                        title="Current: {value}"
                    ></div>
                    <div
                        class="w-6 h-full"
                        style="background-color: draftHex;"
                        style:background-color={draftHex}
                        title="New: {draftHex}"
                    ></div>
                </div>

                <!-- Hex text input -->
                <div class="flex-1 relative">
                    <input
                        type="text"
                        class="w-full bg-gray-800/80 border border-gray-700 rounded-lg px-2.5 py-1 text-xs font-mono text-white tracking-wider focus:outline-none focus:ring-1 focus:ring-blue-500 uppercase"
                        value={hexInputText}
                        oninput={(e) => handleHexInput(e.currentTarget.value)}
                        placeholder="#FFFFFF"
                        maxlength="7"
                    />
                </div>
            </div>

            <!-- Footer Action Buttons: Cancel and Select -->
            <div class="flex items-center justify-end gap-2 pt-2 border-t border-gray-800">
                <button
                    type="button"
                    class="rounded-xl px-4 py-1.5 text-xs font-medium text-gray-400 hover:text-white hover:bg-gray-800 transition-colors"
                    onclick={closePicker}
                >
                    Cancel
                </button>
                <button
                    type="button"
                    class="rounded-xl bg-blue-600 hover:bg-blue-500 px-5 py-1.5 text-xs font-bold text-white transition-all shadow-md shadow-blue-900/30 active:scale-95"
                    onclick={confirmSelect}
                >
                    Select
                </button>
            </div>
        </div>
    </div>
{/if}

