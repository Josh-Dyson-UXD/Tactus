import { BatteryCharging, ArrowUpRight, ArrowDownLeft } from "lucide-react";
import type { PowerwallState, GridState } from "@/types";
import { withAlpha } from "@/lib/helpers";

const SOLAR_COLOR = "#F59E0B";

export function PowerwallCard({ powerwall, grid }: { powerwall: PowerwallState; grid: GridState }) {
  const isCharging    = powerwall.status === "charging";
  const isDischarging = powerwall.status === "discharging";
  const color = isCharging ? "#22C55E" : isDischarging ? "#F59E0B" : "#3B82F6";

  const r = 54, circ = 2 * Math.PI * r;
  const filled = circ * (powerwall.pct / 100);
  const gap    = circ - filled;

  return (
    <div className="relative flex flex-col p-6 rounded-tactus-2xl" style={{ background: "var(--tactus-bg-raised)", border: "1px solid var(--tactus-border-default)" }}>
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <div className="flex items-center justify-center rounded-tactus-md size-[40px]" style={{ background: withAlpha(color, 0.12) }}>
            <BatteryCharging size={18} color={color} />
          </div>
          <div>
            <p className="text-[16px] font-semibold leading-none" style={{ fontFamily: "var(--tactus-font-sans)", color: "var(--tactus-text-primary)" }}>Powerwall</p>
            <p className="text-[12px] mt-1" style={{ fontFamily: "var(--tactus-font-sans)", color: "var(--tactus-text-muted)" }}>13.5 kWh capacity</p>
          </div>
        </div>
        <div className="px-3 py-1 rounded-full" style={{ background: withAlpha(color, 0.1), border: `1px solid ${withAlpha(color, 0.25)}` }}>
          <p className="text-[11px] font-bold uppercase" style={{ fontFamily: "var(--tactus-font-sans)", color }}>{powerwall.status}</p>
        </div>
      </div>

      {/* Ring + percentage */}
      <div className="flex items-center gap-6 mb-4">
        <div className="relative shrink-0" style={{ width: 128, height: 128 }}>
          <svg viewBox="0 0 128 128" className="size-full -rotate-90">
            <circle cx="64" cy="64" r={r} fill="none" stroke="var(--tactus-bg-track)" strokeWidth="9" />
            <circle cx="64" cy="64" r={r} fill="none" stroke={color} strokeWidth="9" strokeLinecap="round"
              strokeDasharray={`${filled} ${gap}`} style={{ filter: `drop-shadow(0 0 6px ${color})` }} />
          </svg>
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <p style={{ fontFamily: "var(--tactus-font-mono)", color, fontSize: 28, fontWeight: 700, lineHeight: 1 }}>{powerwall.pct}%</p>
          </div>
        </div>

        <div className="flex flex-col gap-3 flex-1">
          <div>
            <p className="text-[10px] uppercase tracking-wider mb-1" style={{ fontFamily: "var(--tactus-font-sans)", color: "var(--tactus-text-faint)" }}>Flow</p>
            <p style={{ fontFamily: "var(--tactus-font-mono)", color: "var(--tactus-text-primary)", fontSize: 18, fontWeight: 600 }}>
              {isCharging ? "+" : isDischarging ? "−" : ""}{powerwall.flowKw.toFixed(1)}<span style={{ fontSize: 12, color: "var(--tactus-text-muted)" }}> kW</span>
            </p>
          </div>
          <div>
            <p className="text-[10px] uppercase tracking-wider mb-1" style={{ fontFamily: "var(--tactus-font-sans)", color: "var(--tactus-text-faint)" }}>Backup reserve</p>
            <p style={{ fontFamily: "var(--tactus-font-mono)", color: "var(--tactus-text-secondary)", fontSize: 16, fontWeight: 600 }}>{powerwall.reservePct}%</p>
          </div>
        </div>
      </div>

      {/* Grid flow */}
      <div className="flex gap-3 pt-4" style={{ borderTop: "1px solid var(--tactus-bg-overlay)" }}>
        <div className="flex items-center gap-2 flex-1">
          <ArrowDownLeft size={14} color="var(--tactus-green)" />
          <div>
            <p className="text-[10px] uppercase tracking-wider" style={{ fontFamily: "var(--tactus-font-sans)", color: "var(--tactus-text-faint)" }}>Import</p>
            <p style={{ fontFamily: "var(--tactus-font-mono)", color: "var(--tactus-text-secondary)", fontSize: 14, fontWeight: 600 }}>{grid.importKw.toFixed(1)} kW</p>
          </div>
        </div>
        <div className="flex items-center gap-2 flex-1">
          <ArrowUpRight size={14} color={SOLAR_COLOR} />
          <div>
            <p className="text-[10px] uppercase tracking-wider" style={{ fontFamily: "var(--tactus-font-sans)", color: "var(--tactus-text-faint)" }}>Export</p>
            <p style={{ fontFamily: "var(--tactus-font-mono)", color: "var(--tactus-text-secondary)", fontSize: 14, fontWeight: 600 }}>{grid.exportKw.toFixed(1)} kW</p>
          </div>
        </div>
      </div>
    </div>
  );
}
