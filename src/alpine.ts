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
    /** Vertical shift (px) that centres the marquee's glyph ink, not its em box. */
    marqueeOffsetPx: number;
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
        marqueeOffsetPx: 0,
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
        // the cross-axis (marqueeSize %, 90% by default), and work out the
        // shift that centres that ink — see marqueeOffsetPx below.
        fitMarqueeFont(this: TextVisualizerState, el: HTMLElement) {
            const vertical = this.orientation === "vertical";
            const availH = vertical ? window.innerWidth : window.innerHeight;
            const computed = getComputedStyle(el);
            const probe = 100;
            const font = `${computed.fontWeight} ${probe}px ${computed.fontFamily}`;
            const text = this.text || " ";

            // Where the browser will actually put the baseline, measured from
            // the DOM rather than from canvas font metrics: an empty zero-size
            // inline-block sits its bottom edge exactly on the baseline of the
            // line it's in. Everything here scales linearly with font-size, so
            // one measurement at `probe` px covers every size. (Canvas's
            // fontBoundingBox* would answer the same question, but it's absent
            // on older engines — Firefox only got it in 116 — and falling back
            // to "no correction" is what let descenders clip.)
            const probeEl = document.createElement("span");
            probeEl.style.cssText = [
                "position:fixed",
                "left:-9999px",
                "top:-9999px",
                "white-space:pre",
                // The `font` shorthand resets line-height, so it must come
                // before the line-height we actually want to measure in.
                `font:${font}`,
                "line-height:1",
            ].join(";");
            probeEl.textContent = text;
            const baselineMarker = document.createElement("span");
            baselineMarker.style.cssText =
                "display:inline-block;width:0;height:0";
            probeEl.appendChild(baselineMarker);
            document.body.appendChild(probeEl);
            const boxTop = probeEl.getBoundingClientRect().top;
            // Baseline offset inside a line-height:1 box, at `probe` px.
            const baseline =
                baselineMarker.getBoundingClientRect().bottom - boxTop;
            // Fallback ink bound: the font's own line box always contains it.
            probeEl.style.lineHeight = "normal";
            const normalBox = probeEl.getBoundingClientRect();
            const normalLineH = normalBox.height;
            const normalBaseline =
                baselineMarker.getBoundingClientRect().bottom - normalBox.top;
            document.body.removeChild(probeEl);

            // Ink height (ascent+descent of the actual glyphs) via canvas.
            const ctx = document.createElement("canvas").getContext("2d");
            let inkAsc = Number.NaN;
            let inkDesc = Number.NaN;
            if (ctx) {
                ctx.font = font;
                const m = ctx.measureText(text);
                inkAsc = m.actualBoundingBoxAscent;
                inkDesc = m.actualBoundingBoxDescent;
            }
            const inkOk =
                Number.isFinite(inkAsc) &&
                Number.isFinite(inkDesc) &&
                inkAsc + inkDesc > 0;
            // Without ink metrics, fit the font's line box instead: bigger
            // than the ink, so the text comes out a little smaller but can
            // never hang over the edge.
            const measured = inkOk ? inkAsc + inkDesc : normalLineH;
            if (measured <= 0) return;

            // 2px of slack keeps the largest size off the edge despite the
            // rounding below.
            const fill = marqueeFillRatio(this.marqueeSize);
            const px = Math.max(
                1,
                Math.floor((availH * fill - 2) / (measured / probe)),
            );
            this.marqueeFontPx = px;

            // What the flex stage centres is the line box, whose centre sits
            // above the ink's centre (the ink hangs below the baseline by less
            // than the box does). Shift by the difference so the ink itself is
            // centred — otherwise a "g"/"p" tail runs past the bottom edge.
            // Same idea on the fallback path, centring the font's line box
            // (positioned off the same baseline) instead of the ink.
            const k = px / probe;
            const inkCentre = inkOk
                ? baseline * k + ((inkDesc - inkAsc) * k) / 2
                : (baseline - normalBaseline + normalLineH / 2) * k;
            this.marqueeOffsetPx = Math.round(px / 2 - inkCentre);
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
