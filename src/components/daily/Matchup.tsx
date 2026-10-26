"use client";

// The "which is bigger?" matchup card and its reveal, shared by the daily challenge and endless mode.
import { useEffect, useRef, useState } from "react";
import dataVersion from "@/data/data-version.json";
import { gapText, sizeLine, stretch, times, type PoolEntry, type Question } from "@/lib/daily";
import { dailyContext } from "@/content/daily-context";
import { formatArea, type AreaUnit } from "@/lib/format";
import { preferredUnit } from "@/lib/units";
import { mapUrl } from "@/lib/share";
import { setSound, soundOn } from "@/lib/sound";
import { mainBox, mainPart, withMapDrawing, type Outline, type ShapeFile } from "@/lib/outline";
import { dailyCopy } from "@/content/daily";
import { SpeakerIcon, TickIcon } from "@/components/site/Icons";

const reveal = dailyCopy.reveal;
export const reducedMotion = () => typeof matchMedia !== "undefined" && matchMedia("(prefers-reduced-motion: reduce)").matches;
// where a new round lines up: just under the sticky site header
export const ROUND_TOP = 88;
// square tiles, a little flatter on short laptop screens so both shapes fit on the first screen (the drawing stays centred
// at its own proportions)
const TILE = "aspect-square [@media(min-width:768px)_and_(max-height:820px)]:aspect-[5/4]";

// the two shapes on the game tiles: bright fills (they are drawings, not text); a pale tint of the same colour for how a
// web map draws them, so the two read as before and after of one shape
const COLORS = ["#FF5B4A", "#2F6BFF"];
/** a web map stretches land by less than this: "about right" (and never "1.1× too big") */
const ABOUT_RIGHT = 1.15;
const V = `?v=${dataVersion.v}`;

let poolPromise: Promise<PoolEntry[]> | null = null;
export const loadPool = () =>
  (poolPromise ??= fetch(`/data/daily/index.json${V}`)
    .then((r) => {
      if (!r.ok) throw new Error("pool");
      return r.json() as Promise<PoolEntry[]>;
    })
    .catch((e) => {
      // let "Try again" fetch it afresh
      poolPromise = null;
      throw e;
    }));

/** The drawings for every shape in these questions, keyed by shape id. */
export async function loadShapes(questions: Question[]): Promise<Record<string, ShapeFile>> {
  const ids = [...new Set(questions.flatMap((q) => q.options.map((o) => o.id)))];
  const files = await Promise.all(
    ids.map((id) =>
      fetch(`/data/daily/shapes/${id}.json${V}`).then((r) => {
        if (!r.ok) throw new Error(id);
        return r.json() as Promise<ShapeFile>;
      }),
    ),
  );
  const entry = new Map(questions.flatMap((q) => q.options).map((o) => [o.id, o]));
  return Object.fromEntries(ids.map((id, i) => [id, withMapDrawing(files[i], entry.get(id)!)]));
}

/** Same height as the progress dots plus the first question card, so nothing below jumps when the game appears. */
export function Skeleton({ label, pills }: { label: string; /** room for a row of pills above the bar (endless mode) */ pills?: boolean }) {
  return (
    <div aria-busy="true" aria-label={label}>
      {pills ? <div aria-hidden="true" className="mb-2 h-9" /> : null}
      <div aria-hidden="true" className="mb-3 h-3 sm:mb-4" />
      <div className="min-h-[calc(50vw+208px)] rounded-[22px] border-2 border-line bg-white px-4 pb-5 pt-4 shadow-[0_8px_0_0_var(--color-line)] sm:min-h-[540px] sm:p-6 [@media(min-width:768px)_and_(max-height:820px)]:min-h-[476px]">
        <div className="h-5 w-1/2 animate-pulse rounded-full bg-beige" />
        <div className="mt-5 grid grid-cols-2 gap-3">
          <div className={`${TILE} animate-pulse rounded-2xl bg-tile`} />
          <div className={`${TILE} animate-pulse rounded-2xl bg-tile`} />
        </div>
      </div>
    </div>
  );
}

/** Sound effects on or off (on by default). */
function SoundToggle() {
  // on by default, so the first paint already says "Sound on" for almost everyone
  const [on, setOn] = useState(true);
  useEffect(() => queueMicrotask(() => setOn(soundOn())), []);
  return (
    <button
      type="button"
      aria-pressed={on}
      onClick={() => {
        setSound(!on);
        setOn(!on);
      }}
      className="inline-flex h-11 items-center gap-1.5 rounded-full border-2 border-line bg-white px-3 text-xs font-bold text-ink-soft hover:text-ink"
    >
      <SpeakerIcon on={on} /> Sound
    </button>
  );
}

export function QuestionCard({
  eyebrow,
  q,
  shapes,
  picked,
  verdict,
  nextLabel,
  busy,
  onPick,
  onNext,
}: {
  /** "Round 2 of 5" */
  eyebrow: string;
  q: Question;
  shapes: Record<string, ShapeFile>;
  picked: number | undefined;
  /** the reveal's headline for a right or a wrong answer */
  verdict: (correct: boolean) => string;
  nextLabel: string;
  /** the next round is loading: Next is disabled until it's ready */
  busy?: boolean;
  onPick: (i: number) => void;
  onNext: () => void;
}) {
  const answered = picked !== undefined;
  const correct = picked === q.answer;
  const nextRef = useRef<HTMLButtonElement>(null);
  // one scale for both tiles and both drawings (a web map's and the real one are in the same units), so the shapes
  // compare fairly side by side, and each real shape shrinks from its map version by exactly what the strip says. A
  // web map never draws land smaller than it is, so the map drawings set the scale and frame the tiles before answering.
  const span = Math.max(...q.options.flatMap((o) => [size(shapes[o.id].merc), size(shapes[o.id].ea)])) * 1.12;

  const big = q.options[q.answer];
  const small = q.options[1 - q.answer];
  // the strip's title: did the map show the smaller one as bigger?
  const stripTitle =
    small.m >= big.m
      ? correct
        ? reveal.stretchTitleRight
        : reveal.stretchTitle
      : q.options.every((o) => stretch(o) < ABOUT_RIGHT)
        ? reveal.stretchTitleBoth
        : reveal.stretchTitleHonest;
  // the cards only show after the first load, in the browser, so this never runs on the server
  const [unit] = useState<AreaUnit>(preferredUnit);
  const sectionRef = useRef<HTMLElement>(null);
  // "Replay": jump both tiles back to the map's drawing for a frame, then let the shrink run again
  const [rewind, setRewind] = useState(false);
  const replay = () => {
    setRewind(true);
    requestAnimationFrame(() => requestAnimationFrame(() => setRewind(false)));
  };
  const verdictRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!answered) return;
    // keyboard users land on "Next"; preventScroll keeps the page where it is (the reveal is the thing to watch)
    nextRef.current?.focus({ preventScroll: true });
    // once the shapes have settled, bring the verdict into view on short screens ("Next" sticks to the bottom of the
    // screen), but never so far that the top of the card (the round and level) slides under the header
    const id = setTimeout(
      () => {
        const card = sectionRef.current?.getBoundingClientRect();
        const verdict = verdictRef.current?.getBoundingClientRect();
        if (!card || !verdict) return;
        const want = Math.min(verdict.bottom - (innerHeight - 88), card.top - ROUND_TOP);
        if (want > 0) scrollTo({ top: scrollY + want, behavior: reducedMotion() ? "auto" : "smooth" });
      },
      reducedMotion() ? 0 : 1400,
    );
    return () => clearTimeout(id);
  }, [answered]);

  return (
    <section
      ref={sectionRef}
      aria-labelledby="daily-q"
      className="rounded-[22px] border-2 border-line bg-white px-4 pb-5 pt-4 shadow-[0_8px_0_0_var(--color-line)] sm:p-6"
    >
      <div className="flex items-center justify-between gap-2">
        <p className="text-xs font-extrabold uppercase tracking-[0.14em] text-primary">{eyebrow}</p>
        <SoundToggle />
      </div>
      <h2 id="daily-q" className="mt-1 text-center font-display text-[1.7rem] leading-[1.1] text-ink sm:text-4xl">
        {q.prompt}
      </h2>
      {/* the same height before and after answering (the Replay button is 44px), so the tiles don't jump */}
      <div className="mt-1.5 flex min-h-11 items-center justify-center gap-2 text-center text-sm text-muted">
        {answered ? (
          <>
            <p className="min-w-0">{reveal.watch}</p>
            <button
              type="button"
              onClick={replay}
              aria-label={reveal.replaySr}
              className="inline-flex min-h-11 shrink-0 items-center gap-1 rounded-full border-2 border-line bg-white px-3 text-xs font-bold text-ink-soft hover:border-primary hover:text-ink"
            >
              <span aria-hidden="true" className="text-base leading-none">
                ↻
              </span>
              {reveal.replay}
            </button>
          </>
        ) : (
          <p>{reveal.ask}</p>
        )}
      </div>

      <div className="relative mt-4 grid grid-cols-2 gap-3 sm:gap-5">
        {q.options.map((o, i) => {
          const isAnswer = i === q.answer;
          const look = !answered
            ? "hover:border-primary"
            : isAnswer
              ? "reveal-win border-green [--press-shadow:var(--color-green-shadow)]"
              : picked === i
                ? "reveal-shake border-red [--press-shadow:var(--color-red-shadow)]"
                : "opacity-70";
          return (
            <button
              key={o.id}
              type="button"
              disabled={answered}
              onClick={() => onPick(i)}
              aria-label={answered ? undefined : `${o.n}, ${o.sub}`}
              className={`press-card relative flex min-w-0 flex-col rounded-[20px] p-2 text-left disabled:cursor-default sm:p-3 ${look}`}
            >
              {answered && (isAnswer || picked === i) ? (
                <span
                  className={`pop-in absolute -top-3.5 right-2 z-10 rounded-full px-3 py-1 text-[11px] font-extrabold uppercase tracking-wider text-white ${isAnswer ? "reveal-late bg-green-text" : "bg-red"}`}
                >
                  {isAnswer ? reveal.bigger : reveal.yourPick}
                </span>
              ) : null}
              <RevealTile
                map={shapes[o.id].merc}
                real={shapes[o.id].ea}
                span={span}
                revealed={answered}
                rewind={rewind}
                stretchBy={stretch(o)}
                color={COLORS[i]}
              />
              <span className="mt-2 block text-base font-bold leading-tight text-ink [overflow-wrap:anywhere] sm:text-lg">{o.n}</span>
              <span className="mt-0.5 block text-xs leading-snug text-muted">{o.sub}</span>
              {answered ? (
                <>
                  <TrueArea from={o.m} to={o.a} unit={unit} />
                  {/* the result in plain words, so it reads without comparing the numbers */}
                  <span
                    className={`pop-in reveal-late mt-1.5 block w-fit rounded-full px-2.5 py-0.5 text-[11px] font-bold leading-tight ${isAnswer ? "bg-green-soft text-green-text" : "bg-beige text-ink-soft"}`}
                  >
                    {isAnswer ? reveal.biggerBy(gapText(big, small)) : reveal.smaller}
                  </span>
                </>
              ) : null}
            </button>
          );
        })}
        {/* the gold VS coin between the cards; it fades once answered, so it doesn't sit on the shapes */}
        <span
          aria-hidden="true"
          className={`pointer-events-none absolute left-1/2 top-[38%] z-10 grid size-12 -translate-x-1/2 -translate-y-1/2 place-items-center rounded-full border-4 border-white bg-gold font-display text-sm text-ink shadow-[0_4px_0_0_var(--color-gold-shadow)] transition-opacity duration-300 ${answered ? "opacity-0" : ""}`}
        >
          {reveal.vs}
        </span>
      </div>

      <WhoIsWho options={q.options} />

      {/* the verdict, read out by screen readers: soft green when you're right, soft red when the map fooled you */}
      <div ref={verdictRef} aria-live="polite">
        {answered ? (
          <div
            className={`pop-in reveal-late mt-5 rounded-[22px] p-4 text-ink ring-1 sm:p-5 ${correct ? "bg-green-soft ring-green/40" : "bg-red-soft ring-red/40"}`}
          >
            <p className="flex items-center gap-2.5 font-display text-2xl leading-tight">
              <span
                aria-hidden="true"
                className={`grid size-8 shrink-0 place-items-center rounded-full text-base text-white ${correct ? "bg-green-text" : "bg-danger"}`}
              >
                <TickIcon right={correct} className="size-4" />
              </span>
              {verdict(correct)}
            </p>
            <p className="mt-2 font-semibold leading-snug">{sizeLine(big, small)}</p>
            <StretchStrip options={q.options} title={stripTitle} />
          </div>
        ) : null}
      </div>
      {answered ? (
        // stays at the bottom of the screen while the reveal is longer than the screen, so moving on is always one tap
        <div className="sticky bottom-3 z-20 mt-4">
          <button ref={nextRef} type="button" onClick={onNext} disabled={busy} aria-busy={busy} className="btn btn-primary btn-lg w-full disabled:opacity-100">
            {nextLabel} <span aria-hidden="true">→</span>
          </button>
        </div>
      ) : null}
    </section>
  );
}

/**
 * Why a web map gets the sizes wrong: each place's distance from the equator on a line from the equator to the pole,
 * and how much a web map stretches it there.
 */
function StretchStrip({ options, title }: { options: Question["options"]; title: string }) {
  // where the land sits as a web map sees it: a web map stretches area by 1 / cos²(latitude), so this latitude gives
  // exactly the stretch shown, and the farther dot is always the more stretched place
  const lat = (o: PoolEntry) => Math.round((Math.acos(Math.sqrt(Math.min(1, 1 / stretch(o)))) * 180) / Math.PI);
  const drawn = (o: PoolEntry) =>
    stretch(o) >= ABOUT_RIGHT ? reveal.drawnTooBig(times(Math.max(1.2, stretch(o)))) : reveal.drawnAboutRight;
  // two dots this close would cover each other: lift one and drop the other a little
  const close = Math.abs(lat(options[0]) - lat(options[1])) < 6;
  return (
    <div className="mt-3 rounded-2xl bg-white/80 p-3 ring-1 ring-ink/10">
      <p className="text-xs font-extrabold uppercase tracking-wide text-ink-soft">{title}</p>
      <div aria-hidden="true" className="mt-3 flex items-center gap-3 text-[11px] font-semibold text-muted">
        <span>{reveal.equator}</span>
        <span className="relative h-2 flex-1 rounded-full bg-[linear-gradient(90deg,var(--color-line),var(--color-gold))]">
        {options.map((o, i) => (
          <span
            key={o.id}
            className="absolute top-1/2 size-4 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-white shadow-[0_1px_2px_rgba(29,33,64,0.4)]"
            style={{ left: `${(lat(o) / 90) * 100}%`, background: COLORS[i], marginTop: close ? (i ? 5 : -5) : 0 }}
          />
        ))}
        </span>
        <span>{reveal.pole}</span>
      </div>
      <ul className="mt-2 space-y-1 text-[13px] leading-snug text-ink-soft sm:text-sm">
        {options.map((o, i) => (
          <li key={o.id} className="flex items-baseline gap-2">
            <span aria-hidden="true" className="size-2.5 shrink-0 translate-y-px rounded-full" style={{ background: COLORS[i] }} />
            <span>
              <strong className="text-ink">{o.n}</strong>: {reveal.stretchRow(lat(o), drawn(o))}
            </span>
          </li>
        ))}
      </ul>
      <p className="mt-1.5 text-xs text-muted">{reveal.stretchNote}</p>
    </div>
  );
}

/** Short "what was it / where is it today" notes for the historical states in a question. */
function WhoIsWho({ options }: { options: Question["options"] }) {
  const notes = options.filter((o) => o.kind === "history" && dailyContext[o.src]);
  if (!notes.length) return null;
  return (
    <div className="mt-4 space-y-2 rounded-2xl bg-paper p-3 text-sm ring-1 ring-line">
      {notes.map((o) => {
        const c = dailyContext[o.src];
        return (
          <p key={o.id} className="leading-relaxed text-ink-soft">
            <strong className="text-ink">{o.n}</strong> <span className="text-muted">({o.sub})</span>: {c.what}{" "}
            <span className="font-semibold text-ink">Today: {c.today}.</span>
          </p>
        );
      })}
    </div>
  );
}

// framed and drawn on the main landmass, so far-off islands don't shrink a country to a speck
const size = (o: Outline) => {
  const [x0, y0, x1, y1] = mainBox(o);
  return Math.max(x1 - x0, y1 - y0);
};

/**
 * One outline centred in a 100 × 100 tile, at the tile's shared scale. `ghost` draws it as a web map's version: a pale
 * tint of its own colour ("fill"), or a faint outline over the real shape ("line"), so it shows even where the real
 * shape covers it.
 */
function Shape({ outline, span, color, ghost }: { outline: Outline; span: number; color: string; ghost?: "fill" | "line" }) {
  const { d, b: [x0, y0, x1, y1] } = mainPart(outline);
  const k = 100 / span;
  const tiny = size(outline) < span * 0.06;
  return (
    <>
      <path
        d={d}
        transform={`translate(50 50) scale(${k}) translate(${-(x0 + x1) / 2} ${-(y0 + y1) / 2})`}
        fill={ghost === "line" ? "none" : color}
        fillOpacity={ghost ? 0.22 : 0.88}
        stroke={color}
        strokeWidth={ghost === "line" ? 1.25 : 1}
        strokeOpacity={ghost === "fill" ? 0 : ghost ? 0.6 : 1}
        vectorEffect="non-scaling-stroke"
        fillRule="evenodd"
        strokeLinejoin="round"
      />
      {tiny && !ghost ? <circle cx={50} cy={50} r={8} fill="none" stroke={color} strokeWidth={1.2} /> : null}
    </>
  );
}

/**
 * The shrink reveal: before answering, the shape as a normal map draws it. On answering, it shrinks (or grows) to its
 * real size while a counter ticks down from the map's stretch, then the real shape stays in full colour over a pale tint
 * of the map's version, both tagged. `rewind` jumps back to the map drawing with no animation, so a replay can run again.
 */
function RevealTile({
  map,
  real,
  span,
  revealed,
  rewind,
  stretchBy,
  color,
}: {
  map: Outline;
  real: Outline;
  /** the one scale both tiles and both drawings use */
  span: number;
  revealed: boolean;
  rewind: boolean;
  /** how many times too big a web map draws it */
  stretchBy: number;
  color: string;
}) {
  const area = (o: Outline) => {
    const [x0, y0, x1, y1] = mainBox(o);
    return ((x1 - x0) * (y1 - y0)) / (span * span);
  };
  const grow = Math.sqrt(area(real) / Math.max(area(map), 1e-9)) || 1;
  const shown = revealed && !rewind;
  return (
    <span className="relative block">
      <svg viewBox="0 0 100 100" className={`${TILE} w-full rounded-2xl bg-tile ${rewind ? "[&_*]:!transition-none" : ""}`} aria-hidden="true">
        <g className="reveal-map" style={{ transform: shown ? `scale(${grow})` : "scale(1)", opacity: shown ? 0 : 1 }}>
          <Shape outline={map} span={span} color={color} />
        </g>
        {/* the map's version stays behind as a pale tint from the first moment, so the shape shrinks inside it */}
        <g style={{ opacity: shown ? 1 : 0, transition: shown ? "opacity 0.2s ease" : "none" }}>
          <Shape outline={map} span={span} color={color} ghost="fill" />
        </g>
        <g className="reveal-true" style={{ opacity: shown ? 1 : 0 }}>
          <Shape outline={real} span={span} color={color} />
        </g>
        <g style={{ opacity: shown ? 1 : 0, transition: shown ? "opacity 0.2s ease" : "none" }}>
          <Shape outline={map} span={span} color={color} ghost="line" />
        </g>
      </svg>
      {shown ? (
        <>
          <ShrinkCounter stretchBy={stretchBy} />
          {/* which drawing is which, once the shrink has settled (the text below the tile says it for screen readers) */}
          <span aria-hidden="true" className="pop-in reveal-late pointer-events-none absolute bottom-1.5 left-1.5 flex gap-1 text-[10px] font-bold leading-none">
            <span className="inline-flex items-center gap-1 rounded-full bg-white/90 px-1.5 py-1 text-ink-soft">
              <span className="size-2 rounded-sm border" style={{ borderColor: color, background: `${color}38` }} />
              {reveal.tagMap}
            </span>
            <span className="inline-flex items-center gap-1 rounded-full bg-white/90 px-1.5 py-1 text-ink">
              <span className="size-2 rounded-sm" style={{ background: color }} />
              {reveal.tagReal}
            </span>
          </span>
        </>
      ) : null}
    </span>
  );
}

/**
 * Top-left of a revealed tile: the map's stretch ticking down to the real size as the shape shrinks ("×3.7" … "×1.0"),
 * then "÷3.7". A place a web map draws about right just says so.
 */
function ShrinkCounter({ stretchBy }: { stretchBy: number }) {
  const settle = stretchBy < ABOUT_RIGHT;
  const [v, setV] = useState<number | null>(settle || reducedMotion() ? null : stretchBy);
  useEffect(() => {
    if (settle || reducedMotion()) return;
    // the same timing as the shrink itself (.reveal-map: 1.1s after a 0.15s wait)
    const start = performance.now() + 150;
    let id = 0;
    const tick = (now: number) => {
      const t = Math.min(1, Math.max(0, (now - start) / 1100));
      const ease = 1 - Math.pow(1 - t, 3);
      setV(t < 1 ? stretchBy + (1 - stretchBy) * ease : null);
      if (t < 1) id = requestAnimationFrame(tick);
    };
    id = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(id);
  }, [settle, stretchBy]);
  return (
    <span
      aria-hidden="true"
      className="pointer-events-none absolute left-1.5 top-1.5 rounded-full bg-white/90 px-2 py-1 font-display text-sm leading-none text-ink tabular-nums shadow-[0_1px_2px_rgba(29,33,64,0.2)]"
    >
      {settle ? reveal.aboutSame : v !== null ? `×${v.toFixed(1)}` : reveal.divide(times(Math.max(1.2, stretchBy)))}
    </span>
  );
}

/** The real area, counting down (or up) from the size the map makes it look, as the shapes change size. */
function TrueArea({ from, to, unit }: { from: number; to: number; unit: AreaUnit }) {
  const [v, setV] = useState(from);
  useEffect(() => {
    if (reducedMotion()) {
      const id = requestAnimationFrame(() => setV(to));
      return () => cancelAnimationFrame(id);
    }
    const start = performance.now() + 150;
    let id = 0;
    const tick = (now: number) => {
      const t = Math.min(1, Math.max(0, (now - start) / 1000));
      const ease = 1 - Math.pow(1 - t, 3);
      setV(from + (to - from) * ease);
      if (t < 1) id = requestAnimationFrame(tick);
    };
    id = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(id);
  }, [from, to]);
  return <span className="mt-1.5 block font-display text-base tabular-nums text-ink">{formatArea(v, unit, false)}</span>;
}

/** The two shapes side by side on the real-size map. */
export function mapHref(q: Question) {
  return mapUrl({ era: "present", shapes: q.options.map((o, i) => ({ era: o.era, name: o.src, color: i })) });
}
