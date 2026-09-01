/**
 * Pure, browser-free logic for the Text Visualizer: the mode registry, Morse
 * conversion, the single "speed" knob → per-mode timing mappers, and URL
 * (deep-link) encode/decode. Kept free of DOM/Alpine so it's unit-testable in a
 * plain Node environment (see modes.test.ts) and importable by both the Alpine
 * component (src/alpine.ts) and the bootstrap (src/app.ts).
 */

export type VisualizerMode =
    | "qr"
    | "large"
    | "marquee"
    | "blink"
    | "mirror"
    | "morse";

export interface ModeDef {
    id: VisualizerMode;
    label: string;
    /** Whether the mode animates and therefore honours the speed control. */
    animated: boolean;
    /** Full inline `<svg>` markup for the selector button (rendered via x-html). */
    icon: string;
}

const icon = (paths: string) =>
    `<svg xmlns="http://www.w3.org/2000/svg" class="h-6 w-6 opacity-70" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.5" aria-hidden="true">${paths}</svg>`;

/**
 * The single source of truth for the available modes. Adding a mode is data,
 * not markup: append here, then add a matching `x-show` view in home.html.
 */
export const MODES: ModeDef[] = [
    {
        id: "qr",
        label: "QR Code",
        animated: false,
        icon: icon(
            '<path stroke-linecap="round" stroke-linejoin="round" d="M3.75 4.875c0-.621.504-1.125 1.125-1.125h4.5c.621 0 1.125.504 1.125 1.125v4.5c0 .621-.504 1.125-1.125 1.125h-4.5A1.125 1.125 0 013.75 9.375v-4.5zM3.75 14.625c0-.621.504-1.125 1.125-1.125h4.5c.621 0 1.125.504 1.125 1.125v4.5c0 .621-.504 1.125-1.125 1.125h-4.5a1.125 1.125 0 01-1.125-1.125v-4.5zM13.5 4.875c0-.621.504-1.125 1.125-1.125h4.5c.621 0 1.125.504 1.125 1.125v4.5c0 .621-.504 1.125-1.125 1.125h-4.5A1.125 1.125 0 0113.5 9.375v-4.5z" /><path stroke-linecap="round" stroke-linejoin="round" d="M6.75 6.75h.75v.75h-.75v-.75zM6.75 16.5h.75v.75h-.75V16.5zM16.5 6.75h.75v.75h-.75v-.75zM13.5 13.5h.75v.75h-.75v-.75zM13.5 18.75h.75v.75h-.75v-.75zM18.75 13.5h.75v.75h-.75v-.75zM18.75 18.75h.75v.75h-.75v-.75zM16.5 16.5h.75v.75h-.75V16.5z" />',
        ),
    },
    {
        id: "large",
        label: "Large Text",
        animated: false,
        icon: icon(
            '<path stroke-linecap="round" stroke-linejoin="round" d="M7.5 8.25h9m-9 3H12m-9.75 1.51c0 1.6 1.123 2.994 2.707 3.227 1.129.166 2.27.293 3.423.379.35.026.67.21.865.501L12 21l2.755-4.133a1.14 1.14 0 01.865-.501 48.172 48.172 0 003.423-.379c1.584-.233 2.707-1.626 2.707-3.228V6.741c0-1.602-1.123-2.995-2.707-3.228A48.394 48.394 0 0012 3c-2.392 0-4.744.175-7.043.513C3.373 3.746 2.25 5.14 2.25 6.741v6.018z" />',
        ),
    },
    {
        id: "marquee",
        label: "Marquee",
        animated: true,
        icon: icon(
            '<path stroke-linecap="round" stroke-linejoin="round" d="M7.5 21L3 16.5m0 0L7.5 12M3 16.5h13.5m0-13.5L21 7.5m0 0L16.5 12M21 7.5H7.5" />',
        ),
    },
    {
        id: "blink",
        label: "Blink",
        animated: true,
        icon: icon(
            '<path stroke-linecap="round" stroke-linejoin="round" d="M3.75 13.5l10.5-11.25L12 10.5h8.25L9.75 21.75 12 13.5H3.75z" />',
        ),
    },
    {
        id: "mirror",
        label: "Mirror",
        animated: false,
        icon: icon(
            '<path stroke-linecap="round" stroke-linejoin="round" d="M12 3v18M7.5 7.5L3 12l4.5 4.5M16.5 7.5L21 12l-4.5 4.5" />',
        ),
    },
    {
        id: "morse",
        label: "Morse",
        animated: true,
        icon: icon(
            '<path stroke-linecap="round" stroke-linejoin="round" d="M4.5 12h.008M9 12h6M19.5 12h.008" />',
        ),
    },
];

export const MODE_IDS: VisualizerMode[] = MODES.map((m) => m.id);

export function isMode(value: string | null): value is VisualizerMode {
    return value !== null && (MODE_IDS as string[]).includes(value);
}

// ── Morse ────────────────────────────────────────────────────────────────────

const MORSE_MAP: Record<string, string> = {
    a: ".-",
    b: "-...",
    c: "-.-.",
    d: "-..",
    e: ".",
    f: "..-.",
    g: "--.",
    h: "....",
    i: "..",
    j: ".---",
    k: "-.-",
    l: ".-..",
    m: "--",
    n: "-.",
    o: "---",
    p: ".--.",
    q: "--.-",
    r: ".-.",
    s: "...",
    t: "-",
    u: "..-",
    v: "...-",
    w: ".--",
    x: "-..-",
    y: "-.--",
    z: "--..",
    0: "-----",
    1: ".----",
    2: "..---",
    3: "...--",
    4: "....-",
    5: ".....",
    6: "-....",
    7: "--...",
    8: "---..",
    9: "----.",
    ".": ".-.-.-",
    ",": "--..--",
    "?": "..--..",
    "'": ".----.",
    "!": "-.-.--",
    "/": "-..-.",
    "(": "-.--.",
    ")": "-.--.-",
    "&": ".-...",
    ":": "---...",
    ";": "-.-.-.",
    "=": "-...-",
    "+": ".-.-.",
    "-": "-....-",
    _: "..--.-",
    '"': ".-..-.",
    $: "...-..-",
    "@": ".--.-.",
};

/** Human-readable Morse: dots/dashes, single space between letters, ` / ` between words. */
export function textToMorse(text: string): string {
    return text
        .trim()
        .toLowerCase()
        .split(/\s+/)
        .filter(Boolean)
        .map((word) =>
            word
                .split("")
                .map((ch) => MORSE_MAP[ch] ?? "")
                .filter(Boolean)
                .join(" "),
        )
        .filter(Boolean)
        .join(" / ");
}

export interface MorseSegment {
    on: boolean;
    /** Length of this segment in Morse time units. */
    units: number;
}

/**
 * Build a flat on/off timeline (in time units) for the whole message, ready to
 * be played by stepping with `unitMs` per unit. Standard timing: dot=1, dash=3,
 * intra-character gap=1, inter-letter gap=3, inter-word gap=7. A trailing 7-unit
 * gap separates loops.
 */
export function morseTimeline(text: string): MorseSegment[] {
    const words = text.trim().toLowerCase().split(/\s+/).filter(Boolean);
    const segs: MorseSegment[] = [];
    words.forEach((word, wi) => {
        const letters = word
            .split("")
            .map((ch) => MORSE_MAP[ch] ?? "")
            .filter(Boolean);
        letters.forEach((code, li) => {
            code.split("").forEach((sym, si) => {
                segs.push({ on: true, units: sym === "-" ? 3 : 1 });
                if (si < code.length - 1) segs.push({ on: false, units: 1 });
            });
            if (li < letters.length - 1) segs.push({ on: false, units: 3 });
        });
        if (wi < words.length - 1) segs.push({ on: false, units: 7 });
    });
    if (segs.length > 0) segs.push({ on: false, units: 7 });
    return segs;
}

// ── Speed → per-mode timing ────────────────────────────────────────────────

/** Centralised speed knob: integer 1 (slowest) … 10 (fastest). */
export const SPEED_MIN = 1;
export const SPEED_MAX = 10;
export const SPEED_DEFAULT = 5;

const clampSpeed = (s: number) =>
    Math.min(SPEED_MAX, Math.max(SPEED_MIN, Math.round(s) || SPEED_DEFAULT));

/** Marquee one-loop duration in seconds (higher speed → shorter → faster). */
export function marqueeDurationSec(speed: number): number {
    const s = clampSpeed(speed);
    // speed 1 → 33s, speed 10 → ~3.3s
    return Math.round((33 / s) * 10) / 10;
}

/** Blink on/off cycle in seconds. */
export function blinkDurationSec(speed: number): number {
    const s = clampSpeed(speed);
    // speed 1 → 2.0s, speed 10 → 0.2s
    return Math.round((2.2 - 0.2 * s) * 100) / 100;
}

/** Morse time-unit length in milliseconds. */
export function morseUnitMs(speed: number): number {
    const s = clampSpeed(speed);
    // speed 1 → 360ms, speed 10 → 90ms
    return Math.round(360 - 30 * (s - 1));
}

// ── Marquee text size ───────────────────────────────────────────────────────

/**
 * Marquee text size, as the percentage of the cross-axis (screen height when
 * horizontal) that the glyph ink should fill. 90% is the default so descenders
 * (g/p/q) keep a little breathing room.
 */
export const MARQUEE_SIZE_MIN = 10;
export const MARQUEE_SIZE_MAX = 100;
export const MARQUEE_SIZE_DEFAULT = 90;

const clampMarqueeSize = (n: number) =>
    Math.min(
        MARQUEE_SIZE_MAX,
        Math.max(MARQUEE_SIZE_MIN, Math.round(n) || MARQUEE_SIZE_DEFAULT),
    );

/** Fraction (0–1) of the cross-axis the marquee glyph ink should occupy. */
export function marqueeFillRatio(size: number): number {
    return clampMarqueeSize(size) / 100;
}

// ── Deep-link (URL) encode / decode ─────────────────────────────────────────

export type Orientation = "horizontal" | "vertical";

export interface ShareState {
    text: string;
    mode: VisualizerMode | null;
    speed: number;
    marqueeSize: number;
    color: string;
    bg: string;
    orientation: Orientation;
}

export const DEFAULTS = {
    speed: SPEED_DEFAULT,
    marqueeSize: MARQUEE_SIZE_DEFAULT,
    color: "#000000",
    bg: "#ffffff",
    orientation: "horizontal" as Orientation,
};

/** Serialise shareable state to a query string (only non-default keys). */
export function encodeQuery(state: Partial<ShareState>): string {
    const p = new URLSearchParams();
    if (state.text) p.set("text", state.text);
    if (state.mode) p.set("mode", state.mode);
    if (state.speed != null && state.speed !== DEFAULTS.speed)
        p.set("speed", String(state.speed));
    if (state.marqueeSize != null && state.marqueeSize !== DEFAULTS.marqueeSize)
        p.set("size", String(state.marqueeSize));
    if (state.color && state.color !== DEFAULTS.color)
        p.set("color", state.color);
    if (state.bg && state.bg !== DEFAULTS.bg) p.set("bg", state.bg);
    if (state.orientation && state.orientation !== DEFAULTS.orientation)
        p.set("orientation", state.orientation);
    return p.toString();
}

/** Parse a query string (e.g. location.search) into a partial ShareState. */
export function decodeQuery(search: string): Partial<ShareState> {
    const p = new URLSearchParams(
        search.startsWith("?") ? search.slice(1) : search,
    );
    const out: Partial<ShareState> = {};
    const text = p.get("text");
    if (text !== null) out.text = text;
    const mode = p.get("mode");
    if (isMode(mode)) out.mode = mode;
    const speed = p.get("speed");
    if (speed !== null && !Number.isNaN(Number(speed)))
        out.speed = clampSpeed(Number(speed));
    const size = p.get("size");
    if (size !== null && !Number.isNaN(Number(size)))
        out.marqueeSize = clampMarqueeSize(Number(size));
    const color = p.get("color");
    if (color) out.color = color;
    const bg = p.get("bg");
    if (bg) out.bg = bg;
    const orientation = p.get("orientation");
    if (orientation === "horizontal" || orientation === "vertical")
        out.orientation = orientation;
    return out;
}
