import { Home, Car } from "lucide-react";
import type { SolarState, PowerwallState, GridState, TeslaState, HomeLoadState } from "@/types";
import { withAlpha } from "@/lib/helpers";
import { SunIcon } from "@/components/icons";

const SOLAR_COLOR  = "#F59E0B";
const BATTERY_COLOR = "#22C55E";
const GRID_IMPORT_COLOR = "#22C55E"; // matches PowerwallCard's existing import/export colour convention
const GRID_EXPORT_COLOR = "#F59E0B";
const EV_COLOR = "#3B82F6";
const HOME_COLOR = "#94A3B8";

function FlowNode({ icon, label, sublabel, value, color, active }: {
  icon: React.ReactNode; label: string; sublabel?: string; value: number; color: string; active: boolean;
}) {
  return (
    <div className="flex flex-col items-center gap-1.5" style={{ minWidth: 76 }}>
      <div className="flex items-center justify-center rounded-tactus-md size-[40px]" style={{ background: active ? withAlpha(color, 0.14) : "var(--tactus-bg-hairline)", boxShadow: active ? `0 0 16px 0 ${withAlpha(color, 0.25)}` : "none" }}>
        {icon}
      </div>
      <p className="text-[10px] font-bold uppercase tracking-wider" style={{ fontFamily: "var(--tactus-font-sans)", color: "var(--tactus-text-faint)" }}>{label}</p>
      <p style={{ fontFamily: "var(--tactus-font-mono)", color: active ? color : "var(--tactus-text-muted)", fontSize: 15, fontWeight: 600, lineHeight: 1 }}>
        {value.toFixed(1)}<span style={{ fontSize: 10, color: "var(--tactus-text-muted)" }}> kW</span>
      </p>
      {sublabel && <p className="text-[10px]" style={{ fontFamily: "var(--tactus-font-sans)", color: "var(--tactus-text-muted)" }}>{sublabel}</p>}
    </div>
  );
}

function FlowArrow({ active, color }: { active: boolean; color: string }) {
  return (
    <div className="flex items-center justify-center shrink-0 flex-1" style={{ minWidth: 20 }}>
      <svg viewBox="0 0 24 8" width="100%" height="8" fill="none" preserveAspectRatio="none">
        <path d="M0 4h20M14 1l5 3-5 3" stroke={active ? color : "var(--tactus-border-default)"} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"
          style={active ? { filter: `drop-shadow(0 0 3px ${color})` } : undefined} />
      </svg>
    </div>
  );
}

// Simple connected-flow indicator — not a literal Sankey diagram, just a
// left-to-right read of what's feeding what right now: Solar and Grid feed
// the Battery and Home, and the car draws from Home while charging. Colours
// follow the same accent tokens already used on the Solar/Powerwall/Tesla
// cards (amber = solar/export, green = battery/import, blue = EV).
export function EnergyFlowCard({ solar, powerwall, grid, homeLoad, tesla }: {
  solar: SolarState; powerwall: PowerwallState; grid: GridState; homeLoad: HomeLoadState; tesla: TeslaState;
}) {
  const isCharging = tesla.status === "charging" && tesla.chargingKw !== undefined;
  const solarActive = solar.status === "generating";
  const batteryActive = powerwall.status === "charging" || powerwall.status === "discharging";
  const gridExporting = grid.exportKw > 0.05;
  const gridImporting = grid.importKw > 0.05;
  const gridColor = gridExporting ? GRID_EXPORT_COLOR : GRID_IMPORT_COLOR;
  const gridValue = gridExporting ? grid.exportKw : grid.importKw;

  return (
    <div className="relative flex flex-col p-6 rounded-tactus-2xl" style={{ background: "var(--tactus-bg-raised)", border: "1px solid var(--tactus-border-default)" }}>
      <div className="flex items-center gap-3 mb-5">
        <div className="flex items-center justify-center rounded-tactus-md size-[40px]" style={{ background: withAlpha(HOME_COLOR, 0.12) }}>
          <Home size={18} color="var(--tactus-text-secondary)" />
        </div>
        <div>
          <p className="text-[16px] font-semibold leading-none" style={{ fontFamily: "var(--tactus-font-sans)", color: "var(--tactus-text-primary)" }}>Energy Flow</p>
          <p className="text-[12px] mt-1" style={{ fontFamily: "var(--tactus-font-sans)", color: "var(--tactus-text-muted)" }}>Live across the home</p>
        </div>
      </div>

      <div className="flex items-center w-full">
        <FlowNode icon={<div className="size-[18px]"><SunIcon stroke={solarActive ? SOLAR_COLOR : "var(--tactus-text-muted)"} size={20} /></div>}
          label="Solar" value={solar.generatingKw} color={SOLAR_COLOR} active={solarActive} />
        <FlowArrow active={solarActive} color={SOLAR_COLOR} />
        <FlowNode icon={<svg viewBox="0 0 24 24" fill="none" className="size-[18px]"><path d="M7 4h6l-1 6h4l-7 10 1-7H6l1-9Z" stroke={batteryActive ? BATTERY_COLOR : "var(--tactus-text-muted)"} strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" /></svg>}
          label="Battery" sublabel={`${powerwall.pct}%`} value={powerwall.flowKw} color={BATTERY_COLOR} active={batteryActive} />
        <FlowArrow active={gridImporting || gridExporting} color={gridColor} />
        <FlowNode icon={<svg viewBox="0 0 24 24" fill="none" className="size-[18px]"><path d="M4 21V9l8-6 8 6v12M4 21h16M9 21v-6h6v6" stroke={gridImporting || gridExporting ? gridColor : "var(--tactus-text-muted)"} strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" /></svg>}
          label="Grid" sublabel={gridExporting ? "Exporting" : gridImporting ? "Importing" : "Idle"} value={gridValue} color={gridColor} active={gridImporting || gridExporting} />
        <FlowArrow active color={HOME_COLOR} />
        <FlowNode icon={<Home size={18} color="var(--tactus-text-secondary)" />} label="Home" value={homeLoad.loadKw} color={HOME_COLOR} active />
        {isCharging && (
          <>
            <FlowArrow active color={EV_COLOR} />
            <FlowNode icon={<Car size={18} color={EV_COLOR} />} label="Car" value={tesla.chargingKw ?? 0} color={EV_COLOR} active />
          </>
        )}
      </div>
    </div>
  );
}
