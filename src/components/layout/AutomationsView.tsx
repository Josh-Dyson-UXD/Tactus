import { useEffect, useRef, useState } from "react";
import { Sparkles, Play, Check } from "lucide-react";
import type { AutomationState, SceneState } from "@/types";
import { withAlpha, relativeTime } from "@/lib/helpers";

// "Last run" is rendered from relativeTime() at render time, so on the
// always-on wall display it would freeze between renders. A light periodic
// tick forces a re-render of this view (cheap — a handful of rows) to keep
// it current without lifting a live clock into app state.
const RELATIVE_TIME_TICK_MS = 60_000;
const RUN_PULSE_DURATION = 900;

const AMBER_HEX = "#F59E0B";
const GREEN_HEX = "#22C55E";
const RED_HEX   = "#EF4444";

const eyebrow: React.CSSProperties = {
  fontFamily: "var(--tactus-font-sans)", fontSize: 10, fontWeight: 700,
  letterSpacing: "0.16em", textTransform: "uppercase", color: "var(--tactus-text-faint)",
};

// Fire-and-forget one-tap tile — scenes carry no persistent state, so the
// only feedback is a brief local glow pulse, cleared automatically (same
// pattern the old SceneCard used, restyled).
function SceneTile({ scene, onActivate }: { scene: SceneState; onActivate: () => void }) {
  const [pulsing, setPulsing] = useState(false);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => () => { if (timerRef.current) clearTimeout(timerRef.current); }, []);

  const handleTap = () => {
    onActivate();
    setPulsing(true);
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => setPulsing(false), RUN_PULSE_DURATION);
  };

  return (
    <button onClick={handleTap}
      className="flex items-center gap-3 rounded-tactus-xl cursor-pointer transition-opacity hover:opacity-90"
      style={{
        padding: "14px 18px", background: "var(--tactus-bg-raised)",
        border: `1px solid ${pulsing ? withAlpha(AMBER_HEX, 0.4) : "var(--tactus-border-subtle)"}`,
        boxShadow: pulsing ? `0 0 16px 0 ${withAlpha(AMBER_HEX, 0.2)}` : "none",
        transition: "border 0.3s ease, box-shadow 0.3s ease",
      }}>
      <div className="flex items-center justify-center rounded-tactus-md size-[32px]" style={{ background: withAlpha(AMBER_HEX, pulsing ? 0.2 : 0.12) }}>
        <Sparkles size={15} color="var(--tactus-amber)" />
      </div>
      <p style={{ fontFamily: "var(--tactus-font-sans)", fontSize: 14, fontWeight: 500, color: "var(--tactus-text-primary)" }}>{scene.name}</p>
    </button>
  );
}

function AutomationRow({ automation, isLast, onToggle, onRun }: {
  automation: AutomationState; isLast: boolean;
  onToggle: (enable: boolean) => void; onRun: () => void;
}) {
  const { name, state, lastTriggered, status } = automation;
  const isOn = state === "on";
  const isUnavailable = state === "unavailable";
  const isPending = status === "pending";

  // "Run now" has no HA confirmation to wait on (fire-and-forget), so the
  // only feedback is a brief local pulse, cleared automatically — same
  // pattern SceneTile uses above, not lifted to app state.
  const [runPulsing, setRunPulsing] = useState(false);
  const runTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => () => { if (runTimerRef.current) clearTimeout(runTimerRef.current); }, []);
  const handleRun = () => {
    onRun();
    setRunPulsing(true);
    if (runTimerRef.current) clearTimeout(runTimerRef.current);
    runTimerRef.current = setTimeout(() => setRunPulsing(false), RUN_PULSE_DURATION);
  };

  const dotColor = isOn ? "var(--tactus-green)" : isUnavailable ? "var(--tactus-red)" : "var(--tactus-border-default)";
  const subtitle = isUnavailable ? "Unavailable" : !isOn ? "Disabled" : relativeTime(lastTriggered);
  const subtitleColor = isUnavailable ? "var(--tactus-red)" : "var(--tactus-text-muted)";

  return (
    <div className="flex items-center gap-3 w-full" style={{ padding: "14px 20px", borderBottom: isLast ? "none" : "1px solid var(--tactus-border-subtle)" }}>
      <div className="rounded-full shrink-0" style={{ width: 10, height: 10, background: dotColor, boxShadow: isOn ? `0 0 8px 0 ${withAlpha(GREEN_HEX, 0.5)}` : "none" }} />
      <div className="flex-1 min-w-0 flex flex-col gap-[2px]">
        <p className="truncate" style={{ fontFamily: "var(--tactus-font-sans)", fontSize: 14, fontWeight: 500, color: isOn ? "var(--tactus-text-primary)" : "var(--tactus-text-secondary)" }}>{name}</p>
        <p style={{ fontFamily: "var(--tactus-font-sans)", fontSize: 11, color: subtitleColor }}>{subtitle}</p>
      </div>

      {/* Run now — circular, fire-and-forget */}
      <button onClick={handleRun} disabled={isUnavailable}
        className="flex items-center justify-center rounded-full shrink-0 cursor-pointer transition-opacity hover:opacity-80 disabled:cursor-default disabled:opacity-30"
        style={{ width: 30, height: 30, background: runPulsing ? withAlpha(AMBER_HEX, 0.15) : "var(--tactus-bg-base)", border: `1px solid ${runPulsing ? withAlpha(AMBER_HEX, 0.4) : "var(--tactus-border-default)"}` }}>
        {runPulsing ? <Check size={13} color="var(--tactus-amber)" /> : <Play size={12} color="var(--tactus-text-secondary)" />}
      </button>

      {/* Enable toggle — same sliding-toggle grammar as DevicesView's plug
          rows / RoomView's switch rows, riding AutomationState.status'
          pending → confirmed cycle. */}
      <button onClick={() => onToggle(!isOn)} disabled={isPending || isUnavailable}
        className="relative shrink-0 cursor-pointer disabled:cursor-default"
        style={{ width: 40, height: 24, borderRadius: 9999, background: isUnavailable ? withAlpha(RED_HEX, 0.15) : isOn ? withAlpha(GREEN_HEX, 0.5) : "var(--tactus-border-default)", opacity: isUnavailable ? 0.5 : 1 }}>
        <span className="absolute rounded-full" style={{
          width: 18, height: 18, top: 3, left: isOn ? 19 : 3,
          background: "#fff", transition: "left 0.18s ease",
          animation: isPending ? "tactus-pulse var(--tactus-motion-pending-pulse)" : undefined,
        }} />
      </button>
    </div>
  );
}

// Redesign Phase 4b (final phase) — the minimal shell language applied to
// Automations & Scenes. No back button (the persistent NavRail handles
// navigation, same as every other tab). Data + control wiring is unchanged
// from before the restyle: App.tsx passes the same automations/scenes/
// onToggleAutomation/onRunAutomation/onActivateScene it always has.
export function AutomationsView({ automations, scenes, onToggleAutomation, onRunAutomation, onActivateScene }: {
  automations: AutomationState[];
  scenes: SceneState[];
  onToggleAutomation: (id: string, enable: boolean) => void;
  onRunAutomation: (id: string) => void;
  onActivateScene: (id: string) => void;
}) {
  const [, setTick] = useState(0);
  useEffect(() => {
    const id = setInterval(() => setTick((t) => t + 1), RELATIVE_TIME_TICK_MS);
    return () => clearInterval(id);
  }, []);

  return (
    <div className="min-h-screen" style={{ background: "var(--tactus-bg-base)" }}>
      <div className="p-8 flex flex-col gap-6">
        <h1 style={{ fontFamily: "var(--tactus-font-sans)", fontSize: 22, fontWeight: 500, color: "var(--tactus-text-primary)" }}>Automations</h1>

        {/* Scenes — hidden entirely when there are none, rather than an
            empty section header. */}
        {scenes.length > 0 && (
          <div>
            <p style={{ ...eyebrow, marginBottom: 10 }}>Scenes</p>
            <div className="flex flex-wrap gap-3">
              {scenes.map((s) => (
                <SceneTile key={s.id} scene={s} onActivate={() => onActivateScene(s.id)} />
              ))}
            </div>
          </div>
        )}

        <div>
          <p style={{ ...eyebrow, marginBottom: 10 }}>Automations</p>
          {automations.length > 0 ? (
            <div className="rounded-tactus-xl overflow-hidden" style={{ background: "var(--tactus-bg-recessed)", border: "1px solid var(--tactus-border-subtle)" }}>
              {automations.map((a, i) => (
                <AutomationRow key={a.id} automation={a} isLast={i === automations.length - 1}
                  onToggle={(enable) => onToggleAutomation(a.id, enable)}
                  onRun={() => onRunAutomation(a.id)} />
              ))}
            </div>
          ) : (
            <p style={{ fontFamily: "var(--tactus-font-sans)", fontSize: 13, color: "var(--tactus-text-muted)" }}>No automations found in Home Assistant.</p>
          )}
        </div>
      </div>
    </div>
  );
}
