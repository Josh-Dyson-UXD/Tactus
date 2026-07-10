import { Car } from "lucide-react";
import type { TeslaState } from "@/types";
import { withAlpha } from "@/lib/helpers";

const TESLA_COLOR = "#3B82F6";

type ControlStatus = "idle" | "pending" | "error";

export function TeslaCard({ tesla, climateControl, lockControl, onToggleClimate, onToggleLock }: {
  tesla: TeslaState;
  climateControl: ControlStatus;
  lockControl: ControlStatus;
  onToggleClimate: () => void;
  onToggleLock: () => void;
}) {
  const isCharging = tesla.status === "charging";
  const r = 54, circ = 2 * Math.PI * r;
  const filled = circ * (tesla.batteryPct / 100);

  const climateError = climateControl === "error";
  const climatePending = climateControl === "pending";
  const lockError = lockControl === "error";
  const lockPending = lockControl === "pending";

  return (
    <div className="relative flex flex-col p-6 rounded-tactus-2xl" style={{ background: "var(--tactus-bg-raised)", border: "1px solid var(--tactus-border-default)", boxShadow: `0 20px 40px 0 ${withAlpha(TESLA_COLOR, 0.04)}` }}>
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <div className="flex items-center justify-center rounded-tactus-md size-[40px]" style={{ background: withAlpha(TESLA_COLOR, 0.12) }}>
            <Car size={18} color={TESLA_COLOR} />
          </div>
          <div>
            <p className="text-[16px] font-semibold leading-none" style={{ fontFamily: "var(--tactus-font-sans)", color: "var(--tactus-text-primary)" }}>{tesla.model}</p>
            <p className="text-[12px] mt-1" style={{ fontFamily: "var(--tactus-font-sans)", color: "var(--tactus-text-muted)" }}>{tesla.location}</p>
          </div>
        </div>
        <div className="px-3 py-1 rounded-full" style={{ background: withAlpha(TESLA_COLOR, 0.1), border: `1px solid ${withAlpha(TESLA_COLOR, 0.25)}` }}>
          <p className="text-[11px] font-bold uppercase" style={{ fontFamily: "var(--tactus-font-sans)", color: TESLA_COLOR }}>{tesla.status}</p>
        </div>
      </div>

      {/* Ring + range */}
      <div className="flex items-center gap-6 mb-5">
        <div className="relative shrink-0" style={{ width: 128, height: 128 }}>
          <svg viewBox="0 0 128 128" className="size-full -rotate-90 overflow-visible">
            <circle cx="64" cy="64" r={r} fill="none" stroke="var(--tactus-bg-track)" strokeWidth="9" />
            <circle cx="64" cy="64" r={r} fill="none" stroke={isCharging ? "var(--tactus-green)" : TESLA_COLOR} strokeWidth="9" strokeLinecap="round"
              strokeDasharray={`${filled} ${circ - filled}`} style={{ filter: `drop-shadow(0 0 6px ${isCharging ? "var(--tactus-green)" : TESLA_COLOR})` }} />
          </svg>
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-0.5">
            <p style={{ fontFamily: "var(--tactus-font-mono)", color: isCharging ? "var(--tactus-green)" : TESLA_COLOR, fontSize: 26, fontWeight: 700, lineHeight: 1 }}>{tesla.batteryPct}%</p>
            <p style={{ fontFamily: "var(--tactus-font-sans)", color: "var(--tactus-text-muted)", fontSize: 11 }}>{tesla.rangeKm} km</p>
          </div>
        </div>

        <div className="flex flex-col gap-3 flex-1">
          {isCharging && (
            <div>
              <p className="text-[10px] uppercase tracking-wider mb-1" style={{ fontFamily: "var(--tactus-font-sans)", color: "var(--tactus-text-faint)" }}>Charging</p>
              <p style={{ fontFamily: "var(--tactus-font-mono)", color: "var(--tactus-green)", fontSize: 18, fontWeight: 600 }}>{tesla.chargingKw?.toFixed(1)}<span style={{ fontSize: 12, color: "var(--tactus-text-muted)" }}> kW</span></p>
            </div>
          )}
          <div>
            <p className="text-[10px] uppercase tracking-wider mb-1" style={{ fontFamily: "var(--tactus-font-sans)", color: "var(--tactus-text-faint)" }}>Interior</p>
            <p style={{ fontFamily: "var(--tactus-font-mono)", color: "var(--tactus-text-secondary)", fontSize: 16, fontWeight: 600 }}>{tesla.tempC}°C</p>
          </div>
        </div>
      </div>

      {/* Controls */}
      <div className="flex gap-3 pt-4" style={{ borderTop: "1px solid var(--tactus-bg-overlay)" }}>
        {/* Climate */}
        <button onClick={onToggleClimate} disabled={climatePending}
          className="flex items-center gap-2 flex-1 px-3 py-2.5 rounded-tactus-md cursor-pointer transition-opacity hover:opacity-80"
          style={{
            background: climateError ? withAlpha("#EF4444", 0.1) : tesla.climateOn ? withAlpha("#3B82F6", 0.12) : "var(--tactus-bg-overlay)",
            border: `1px solid ${climateError ? withAlpha("#EF4444", 0.3) : tesla.climateOn ? withAlpha("#3B82F6", 0.25) : "var(--tactus-border-overlay)"}`,
            animation: climatePending ? "tactus-pulse var(--tactus-motion-pending-pulse)" : undefined,
          }}>
          <svg viewBox="0 0 24 24" fill="none" className="size-4 shrink-0">
            <path d="M12 2v20M4.93 4.93l14.14 14.14M2 12h20M4.93 19.07l14.14-14.14" stroke={climateError ? "var(--tactus-red)" : tesla.climateOn ? "var(--tactus-blue)" : "var(--tactus-text-muted)"} strokeLinecap="round" strokeWidth="1.5" />
          </svg>
          <p className="text-[12px] font-semibold" style={{ fontFamily: "var(--tactus-font-sans)", color: climateError ? "var(--tactus-red)" : tesla.climateOn ? "var(--tactus-blue)" : "var(--tactus-text-muted)" }}>
            {climatePending ? "Syncing…" : climateError ? "Unreachable" : "Climate"}
          </p>
        </button>
        {/* Lock */}
        <button onClick={onToggleLock} disabled={lockPending}
          className="flex items-center gap-2 flex-1 px-3 py-2.5 rounded-tactus-md cursor-pointer transition-opacity hover:opacity-80"
          style={{
            background: lockError ? withAlpha("#EF4444", 0.1) : "var(--tactus-bg-overlay)",
            border: `1px solid ${lockError ? withAlpha("#EF4444", 0.3) : "var(--tactus-border-overlay)"}`,
            animation: lockPending ? "tactus-pulse var(--tactus-motion-pending-pulse)" : undefined,
          }}>
          <svg viewBox="0 0 24 24" fill="none" className="size-4 shrink-0">
            {lockError
              ? <><rect x="3" y="11" width="18" height="11" rx="2" stroke="var(--tactus-red)" strokeWidth="1.5" /><path d="M7 11V7a5 5 0 0 1 9.9-1" stroke="var(--tactus-red)" strokeLinecap="round" strokeWidth="1.5" /></>
              : tesla.locked
              ? <><rect x="3" y="11" width="18" height="11" rx="2" stroke="var(--tactus-green)" strokeWidth="1.5" /><path d="M7 11V7a5 5 0 0 1 10 0v4" stroke="var(--tactus-green)" strokeLinecap="round" strokeWidth="1.5" /></>
              : <><rect x="3" y="11" width="18" height="11" rx="2" stroke="var(--tactus-text-muted)" strokeWidth="1.5" /><path d="M7 11V7a5 5 0 0 1 9.9-1" stroke="var(--tactus-text-muted)" strokeLinecap="round" strokeWidth="1.5" /></>}
          </svg>
          <p className="text-[12px] font-semibold" style={{ fontFamily: "var(--tactus-font-sans)", color: lockError ? "var(--tactus-red)" : tesla.locked ? "var(--tactus-green)" : "var(--tactus-text-muted)" }}>
            {lockPending ? "Syncing…" : lockError ? "Unreachable" : tesla.locked ? "Locked" : "Unlocked"}
          </p>
        </button>
      </div>
    </div>
  );
}
