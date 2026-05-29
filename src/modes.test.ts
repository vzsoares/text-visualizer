import { describe, expect, it } from "vitest";
import {
    blinkDurationSec,
    DEFAULTS,
    decodeQuery,
    encodeQuery,
    isMode,
    MODE_IDS,
    marqueeDurationSec,
    morseTimeline,
    morseUnitMs,
    textToMorse,
} from "./modes";

describe("mode registry", () => {
    it("exposes the six modes and recognises them", () => {
        expect(MODE_IDS).toEqual([
            "qr",
            "large",
            "marquee",
            "blink",
            "mirror",
            "morse",
        ]);
        expect(isMode("qr")).toBe(true);
        expect(isMode("nope")).toBe(false);
        expect(isMode(null)).toBe(false);
    });
});

describe("textToMorse", () => {
    it("encodes letters and words", () => {
        expect(textToMorse("SOS")).toBe("... --- ...");
        expect(textToMorse("hi there")).toBe(".... .. / - .... . .-. .");
    });

    it("ignores unknown characters and surrounding whitespace", () => {
        expect(textToMorse("  a~b ")).toBe(".- -...");
        expect(textToMorse("")).toBe("");
    });
});

describe("morseTimeline", () => {
    it("uses 1 unit for dot, 3 for dash, and gaps between symbols", () => {
        // "e" = "." → on:1, then trailing inter-word/loop gap 7
        expect(morseTimeline("e")).toEqual([
            { on: true, units: 1 },
            { on: false, units: 7 },
        ]);
    });

    it("separates letters by 3 units and words by 7", () => {
        const t = morseTimeline("ie"); // i=.. e=.
        // .  gap1  .  lettergap3  .  loopgap7
        expect(t).toEqual([
            { on: true, units: 1 },
            { on: false, units: 1 },
            { on: true, units: 1 },
            { on: false, units: 3 },
            { on: true, units: 1 },
            { on: false, units: 7 },
        ]);
    });

    it("is empty for blank input", () => {
        expect(morseTimeline("   ")).toEqual([]);
    });
});

describe("speed mappers", () => {
    it("marquee gets faster (shorter) as speed rises", () => {
        expect(marqueeDurationSec(1)).toBeGreaterThan(marqueeDurationSec(10));
    });

    it("blink and morse honour bounds and direction", () => {
        expect(blinkDurationSec(1)).toBeCloseTo(2.0);
        expect(blinkDurationSec(10)).toBeCloseTo(0.2);
        expect(morseUnitMs(1)).toBe(360);
        expect(morseUnitMs(10)).toBe(90);
    });

    it("clamps out-of-range speeds", () => {
        expect(marqueeDurationSec(99)).toBe(marqueeDurationSec(10));
        expect(marqueeDurationSec(-5)).toBe(marqueeDurationSec(1));
    });
});

describe("deep-link encode/decode", () => {
    it("round-trips non-default state", () => {
        const state = {
            text: "Casa Comigo",
            mode: "marquee" as const,
            speed: 8,
            color: "#ff0000",
            bg: "#00ff00",
            orientation: "vertical" as const,
        };
        const decoded = decodeQuery(encodeQuery(state));
        expect(decoded).toEqual(state);
    });

    it("omits default values from the query", () => {
        const q = encodeQuery({
            text: "hi",
            speed: DEFAULTS.speed,
            color: DEFAULTS.color,
            bg: DEFAULTS.bg,
            orientation: DEFAULTS.orientation,
        });
        expect(q).toBe("text=hi");
    });

    it("ignores invalid mode and orientation", () => {
        const decoded = decodeQuery("?mode=bogus&orientation=sideways");
        expect(decoded.mode).toBeUndefined();
        expect(decoded.orientation).toBeUndefined();
    });
});
