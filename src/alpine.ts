import { renderSVG } from "uqr";
import {
    blinkDurationSec,
    DEFAULTS,
    decodeQuery,
    encodeQuery,
    MARQUEE_SIZE_DEFAULT,
    MODES,
    type ModeDef,
    marqueeDurationSec,
    marqueeFillRatio,
    morseTimeline,
    morseUnitMs,
    type Orientation,
    SPEED_DEFAULT,
    textToMorse,
    type VisualizerMode,
} from "./modes";

/**
 * Wrap an initial value with Alpine's `$persist` so it's mirrored to
 * localStorage. Falls back to the plain value when Alpine/persist isn't present
 * (e.g. the Node unit-test environment), keeping the factory testable without a
 * DOM. The plugin is registered in src/app.ts.
 */
function persisted<T>(value: T, key: string): T {
    if (
        typeof window !== "undefined" &&
        window.Alpine &&
        typeof window.Alpine.$persist === "function"
    ) {
        return window.Alpine.$persist(value).as(`tv-${key}`);
    }
    return value;
}

/** Text modes that scale to fill the viewport → their `x-ref` element name. */
const TEXT_REFS = {
    large: "largeText",
    mirror: "mirrorText",
    blink: "blinkText",
} as const satisfies Partial<Record<VisualizerMode, string>>;

/** Default visualization orientation: vertical on small/phone screens. */
function defaultOrientation(): Orientation {
    if (typeof window !== "undefined" && window.matchMedia) {
        return window.matchMedia("(max-width: 640px)").matches
            ? "vertical"
            : "horizontal";
    }
    return DEFAULTS.orientation;
}

export interface TextVisualizerState {
    // Persisted, user-controlled (all live on the home page).
    text: string;
    speed: number;
    /** Marquee glyph height as a % of the cross-axis (see marqueeFillRatio). */
    marqueeSize: number;
    color: string;
    bg: string;
    orientation: Orientation;
    // Transient view state.
    activeMode: VisualizerMode | null;
    qrSvg: string;
    marqueeDist: number;
    marqueeFontPx: number;
    morseOn: boolean;
    morseCode: string;
    // Static reference data for the template.
    readonly modes: ModeDef[];
    // Derived timings (reactive getters).
    readonly marqueeDuration: number;
    readonly blinkDuration: number;
    // Behaviour.
    init(): void;
    open(m: VisualizerMode, fromUser?: boolean): void;
    close(): void;
    swapColors(): void;
    updateQr(): void;
    relayout(): void;
    fitText(el: HTMLElement): void;
    fitMarqueeFont(el: HTMLElement): void;
    measureMarquee(): void;
    startMorse(): void;
    stopMorse(): void;
    syncUrl(): void;
}

/** The full object the factory returns — public state plus private internals. */
interface TextVisualizerData extends TextVisualizerState {
    morseTimer: ReturnType<typeof setTimeout> | null;
    wakeLock: WakeLockSentinel | null;
    enterFullscreen(): void;
    exitFullscreen(): void;
    requestWakeLock(): Promise<void>;
    releaseWakeLock(): void;
}

/** `this` inside methods — the data plus the magics Alpine injects at runtime. */
type AlpineThis = TextVisualizerData & {
    $watch: (k: string, cb: () => void) => void;
    $nextTick: (cb: () => void) => void;
    $refs: Record<string, HTMLElement>;
};

export function textVisualizer(): TextVisualizerData {
    return {
        text: persisted("", "text"),
        speed: persisted(SPEED_DEFAULT, "speed"),
        marqueeSize: persisted(MARQUEE_SIZE_DEFAULT, "marqueeSize"),
        color: persisted(DEFAULTS.color, "color"),
        bg: persisted(DEFAULTS.bg, "bg"),
        orientation: persisted(defaultOrientation(), "orientation"),

        activeMode: null,
        qrSvg: "",
        marqueeDist: 0,
        marqueeFontPx: 0,
        morseOn: false,
        morseCode: "",

        modes: MODES,

        get marqueeDuration() {
            return marqueeDurationSec(this.speed);
        },
        get blinkDuration() {
            return blinkDurationSec(this.speed);
        },

        morseTimer: null,
        wakeLock: null,

        init(this: AlpineThis) {
            // A deep link wins over persisted state, and may auto-open a mode.
            const shared = decodeQuery(
                typeof window !== "undefined" ? window.location.search : "",
            );
            if (shared.text !== undefined) this.text = shared.text;
            if (shared.speed !== undefined) this.speed = shared.speed;
            if (shared.marqueeSize !== undefined)
                this.marqueeSize = shared.marqueeSize;
            if (shared.color !== undefined) this.color = shared.color;
            if (shared.bg !== undefined) this.bg = shared.bg;
            if (shared.orientation !== undefined)
                this.orientation = shared.orientation;

            // Keep the URL shareable as state changes.
            for (const key of [
                "text",
                "speed",
                "marqueeSize",
                "color",
                "bg",
                "orientation",
                "activeMode",
            ]) {
                this.$watch(key, () => this.syncUrl());
            }
            // Live-update whatever view is currently open.
            this.$watch("text", () => this.relayout());
            this.$watch("speed", () => {
                if (this.activeMode === "morse") this.startMorse();
            });
            this.$watch("marqueeSize", () => this.relayout());
            this.$watch("orientation", () => this.relayout());
            this.$watch("color", () => {
                if (this.activeMode === "qr") this.updateQr();
            });
            this.$watch("bg", () => {
                if (this.activeMode === "qr") this.updateQr();
            });

            if (typeof window !== "undefined") {
                window.addEventListener("resize", () => this.relayout());
                document.addEventListener("visibilitychange", () => {
                    if (
                        document.visibilityState === "visible" &&
                        this.activeMode &&
                        !this.wakeLock
                    )
                        this.requestWakeLock();
                });
            }

            // Auto-open from a deep link (no user gesture → no fullscreen).
            const sharedMode = shared.mode;
            if (sharedMode && this.text.trim()) {
                this.$nextTick(() => this.open(sharedMode, false));
            }
        },

        open(this: AlpineThis, m: VisualizerMode, fromUser = true) {
            this.activeMode = m;
            if (fromUser) this.enterFullscreen();
            this.requestWakeLock();

            if (m === "qr") this.updateQr();
            if (m === "morse") this.startMorse();
            if (m === "large" || m === "mirror" || m === "blink") {
                this.$nextTick(() => {
                    const el = this.$refs[TEXT_REFS[m]];
                    if (el) this.fitText(el);
                });
            }
            if (m === "marquee") {
                this.$nextTick(() => {
                    const el = this.$refs.marqueeEl;
                    if (el) this.fitMarqueeFont(el);
                    // Measure width only after the new font-size has painted.
                    this.$nextTick(() =>
                        requestAnimationFrame(() => this.measureMarquee()),
                    );
                });
            }
        },

        close(this: AlpineThis) {
            this.stopMorse();
            this.exitFullscreen();
            this.releaseWakeLock();
            this.activeMode = null;
        },

        swapColors(this: TextVisualizerState) {
            [this.color, this.bg] = [this.bg, this.color];
        },

        updateQr(this: TextVisualizerState) {
            this.qrSvg = this.text.trim()
                ? renderSVG(this.text, {
                      blackColor: this.color,
                      whiteColor: this.bg,
                  })
                : "";
        },

        // Re-fit/re-measure the currently open mode (after resize, text or
        // orientation change). No-op for modes that need no measurement.
        relayout(this: AlpineThis) {
            const m = this.activeMode;
            if (!m) return;
            if (m === "qr") this.updateQr();
            if (m === "large" || m === "mirror" || m === "blink") {
                this.$nextTick(() => {
                    const el = this.$refs[TEXT_REFS[m]];
                    if (el) this.fitText(el);
                });
            }
            if (m === "marquee") {
                this.$nextTick(() => {
                    const el = this.$refs.marqueeEl;
                    if (el) this.fitMarqueeFont(el);
                    this.$nextTick(() =>
                        requestAnimationFrame(() => this.measureMarquee()),
                    );
                });
            }
            if (m === "morse") {
                this.morseCode = textToMorse(this.text);
                this.startMorse();
            }
        },

        // Binary-search the largest font-size (px) where the text fits the
        // available box. When vertical the stage is rotated 90°, so the box's
        // width/height are the viewport's height/width.
        fitText(this: TextVisualizerState, el: HTMLElement) {
            const vertical = this.orientation === "vertical";
            const availW = vertical ? window.innerHeight : window.innerWidth;
            const availH = vertical ? window.innerWidth : window.innerHeight;
            const computed = getComputedStyle(el);
            const helper = document.createElement("span");
            helper.style.cssText = [
                "position:fixed",
                "left:-9999px",
                "top:-9999px",
                `max-width:${availW}px`,
                `font-family:${computed.fontFamily}`,
                `font-weight:${computed.fontWeight}`,
                "word-break:break-word",
                "display:block",
            ].join(";");
            helper.textContent = el.textContent ?? "";
            document.body.appendChild(helper);

            let lo = 8;
            let hi = 3000;
            while (hi - lo > 2) {
                const mid = Math.round((lo + hi) / 2);
                helper.style.fontSize = `${mid}px`;
                if (
                    helper.scrollWidth <= availW &&
                    helper.scrollHeight <= availH
                ) {
                    lo = mid;
                } else {
                    hi = mid;
                }
            }
            document.body.removeChild(helper);
            el.style.fontSize = `${lo}px`;
        },

        // Size the marquee font so the glyph ink height (ascent+descent, so
        // descenders like "g" aren't clipped) fits the user-chosen share of
        // the cross-axis (marqueeSize %, 90% by default).
        fitMarqueeFont(this: TextVisualizerState, el: HTMLElement) {
            const vertical = this.orientation === "vertical";
            const availH = vertical ? window.innerWidth : window.innerHeight;
            const computed = getComputedStyle(el);
            const canvas = document.createElement("canvas");
            const ctx = canvas.getContext("2d");
            if (!ctx) return;
            const probe = 100;
            ctx.font = `${computed.fontWeight} ${probe}px ${computed.fontFamily}`;
            const metrics = ctx.measureText(this.text || " ");
            const ink =
                metrics.actualBoundingBoxAscent +
                metrics.actualBoundingBoxDescent;
            if (ink > 0) {
                const fill = marqueeFillRatio(this.marqueeSize);
                this.marqueeFontPx = Math.floor(
                    (availH * fill) / (ink / probe),
                );
            }
        },

        measureMarquee(this: AlpineThis) {
            const span = this.$refs.marqueeSpan;
            if (span && span.offsetWidth > 0) {
                // Reactive state (not an imperative custom prop): the marquee's
                // :style binding re-renders on speed change and would wipe an
                // imperatively-set --marquee-dist, breaking the loop.
                this.marqueeDist = span.offsetWidth;
            }
        },

        startMorse(this: AlpineThis) {
            this.stopMorse();
            this.morseCode = textToMorse(this.text);
            const timeline = morseTimeline(this.text);
            if (timeline.length === 0 || typeof window === "undefined") {
                this.morseOn = false;
                return;
            }
            const unit = morseUnitMs(this.speed);
            let i = 0;
            const step = () => {
                const seg = timeline[i % timeline.length];
                this.morseOn = seg.on;
                this.morseTimer = setTimeout(() => {
                    i++;
                    step();
                }, seg.units * unit);
            };
            step();
        },

        stopMorse(this: AlpineThis) {
            if (this.morseTimer != null) {
                clearTimeout(this.morseTimer);
                this.morseTimer = null;
            }
            this.morseOn = false;
        },

        syncUrl(this: TextVisualizerState) {
            if (typeof window === "undefined" || !window.history) return;
            const q = encodeQuery({
                text: this.text,
                mode: this.activeMode,
                speed: this.speed,
                marqueeSize: this.marqueeSize,
                color: this.color,
                bg: this.bg,
                orientation: this.orientation,
            });
            const url =
                window.location.pathname +
                (q ? `?${q}` : "") +
                window.location.hash;
            window.history.replaceState(window.history.state, "", url);
        },

        // ── Browser-only helpers (guarded so Node tests don't touch them) ──
        enterFullscreen(this: AlpineThis) {
            if (typeof document === "undefined") return;
            const el = this.$refs.overlay ?? document.documentElement;
            if (el?.requestFullscreen && !document.fullscreenElement) {
                el.requestFullscreen().catch(() => {});
            }
        },
        exitFullscreen() {
            if (typeof document === "undefined") return;
            if (document.fullscreenElement && document.exitFullscreen) {
                document.exitFullscreen().catch(() => {});
            }
        },
        async requestWakeLock(this: AlpineThis) {
            if (typeof navigator === "undefined" || !("wakeLock" in navigator))
                return;
            try {
                this.wakeLock = await navigator.wakeLock.request("screen");
            } catch {
                // Permission/visibility denied — non-fatal.
            }
        },
        releaseWakeLock(this: AlpineThis) {
            this.wakeLock?.release().catch(() => {});
            this.wakeLock = null;
        },
    };
}
