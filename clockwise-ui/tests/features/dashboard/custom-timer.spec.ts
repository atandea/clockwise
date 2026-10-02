import { cleanup, fireEvent, render, screen } from "@testing-library/svelte";
import { afterEach, describe, expect, it, vi } from "vitest";
import CustomTimer from "../../../src/features/dashboard/custom-timer.component.svelte";
import { fetchWithPin } from "../../../src/shared/api/api";

vi.mock("../../../src/shared/api/api", () => ({
    fetchWithPin: vi.fn(),
}));

vi.mock("../../../src/shared/ui/toast.svelte.ts", () => ({
    toast: {
        error: vi.fn(),
    },
}));

describe("CustomTimer", () => {
    afterEach(() => {
        cleanup();
        vi.clearAllMocks();
    });

    it("sends local preview durations through the callback without using the API", async () => {
        vi.mocked(fetchWithPin)
            .mockResolvedValueOnce({ ok: true, json: async () => ({ id: "1" }) } as Response)
            .mockResolvedValueOnce({ ok: true } as Response);
        render(CustomTimer, { props: { apiBase: "" } });

        await fireEvent.input(screen.getByLabelText("Custom timer duration"), {
            target: { value: "1:30" },
        });
        await fireEvent.click(screen.getByTitle("Start"));

        expect(fetchWithPin).toHaveBeenCalledTimes(2);
    });

    it("saves a parsed timer through the injected API", async () => {
        vi.mocked(fetchWithPin).mockResolvedValue({ ok: true } as Response);
        render(CustomTimer, { props: { apiBase: "" } });

        expect(screen.getByTitle("Start")).toBeDisabled();
        expect(screen.getByTitle("Save Template")).toBeDisabled();
        await fireEvent.input(screen.getByLabelText("Custom timer duration"), {
            target: { value: "5m" },
        });
        await fireEvent.click(screen.getByTitle("Save Template"));

        expect(fetchWithPin).toHaveBeenCalledWith(
            "/timers",
            expect.objectContaining({ method: "POST" }),
        );
    });
});