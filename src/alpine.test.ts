import { describe, expect, it } from "vitest";
import { textVisualizer } from "./alpine";
import { blinkDurationSec, marqueeDurationSec } from "./modes";

// Alpine injects $nextTick at runtime; in Node we stub it as a noop so the
// DOM-touching callbacks inside open() never run (they're unreachable here).
const make = () =>
    Object.assign(textVisualizer(), { $nextTick: (_cb: () => void) => {} });

describe("textVisualizer", () => {
    it("initializes with empty text, no active mode, default settings", () => {
        const v = textVisualizer();
        expect(v.text).toBe("");
        expect(v.activeMode).toBeNull();
        expect(v.qrSvg).toBe("");
        expect(v.color).toBe("#000000");
        expect(v.bg).toBe("#ffffff");
    });

    it("open() sets the active mode", () => {
        const v = make();
        v.open("large");
        expect(v.activeMode).toBe("large");
        v.open("mirror");
        expect(v.activeMode).toBe("mirror");
    });

    it("close() clears the active mode", () => {
        const v = make();
        v.open("marquee");
        v.close();
        expect(v.activeMode).toBeNull();
    });

    it("open('qr') with text generates an SVG using the chosen colors", () => {
        const v = make();
        v.text = "hello";
        v.open("qr");
        expect(v.qrSvg).toContain("<svg");
    });

    it("updateQr leaves qrSvg empty for blank text", () => {
        const v = textVisualizer();
        v.text = "   ";
        v.updateQr();
        expect(v.qrSvg).toBe("");
    });

    it("swapColors swaps foreground and background", () => {
        const v = textVisualizer();
        v.color = "#111111";
        v.bg = "#eeeeee";
        v.swapColors();
        expect(v.color).toBe("#eeeeee");
        expect(v.bg).toBe("#111111");
    });

    it("derived durations follow the centralized speed", () => {
        const v = textVisualizer();
        v.speed = 2;
        expect(v.marqueeDuration).toBe(marqueeDurationSec(2));
        expect(v.blinkDuration).toBe(blinkDurationSec(2));
    });
});
