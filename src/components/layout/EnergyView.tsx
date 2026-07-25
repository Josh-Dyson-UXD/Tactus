import { useState } from "react";
import { Sun, BatteryMedium, Home, Zap, Car, Lock, Unlock, ShieldAlert, Settings2, ChevronRight } from "lucide-react";
import type { SolarState, PowerwallState, GridState, TeslaState, HomeLoadState, ControlStatus, TeslaControlKey, TeslaActions } from "@/types";
import { withAlpha } from "@/lib/helpers";
import { GhostSheet } from "@/components/cards/GhostSheet";

const round = (n: number) => Math.round(n);

const SOLAR_HEX   = "#F59E0B";
const BATTERY_HEX = "#22C55E";
const GRID_HEX    = "#3B82F6";
const CAR_HEX     = "#3B82F6";

const eyebrow: React.CSSProperties = {
  fontFamily: "var(--tactus-font-sans)", fontSize: 10, fontWeight: 700,
  letterSpacing: "0.16em", textTransform: "uppercase", color: "var(--tactus-text-faint)",
};

const POWERWALL_STATUS_LABEL: Record<PowerwallState["status"], string> = {
  charging: "Charging", discharging: "Discharging", standby: "Holding", backup: "On Backup",
};

// ─── Stat cards ───────────────────────────────────────────────────────────────
// Four independent state readouts (Solar/Powerwall/Grid/Home) — no flow
// connectors between them. Each follows the same header grammar (icon +
// label left, coloured state word right) so the row reads as one family.

function StatHeader({ icon, label, state, color }: { icon: React.ReactNode; label: string; state: string; color: string }) {
  return (
    <div className="flex items-center justify-between">
      <div className="flex items-center gap-2.5">
        {icon}
        <p style={{ fontFamily: "var(--tactus-font-sans)", fontSize: 14, fontWeight: 600, color: "var(--tactus-text-primary)" }}>{label}</p>
      </div>
      <p style={{ fontFamily: "var(--tactus-font-sans)", fontSize: 11, fontWeight: 600, color }}>{state}</p>
    </div>
  );
}

function SolarStat({ solar }: { solar: SolarState }) {
  const generating = solar.status === "generating";
  const color = generating ? SOLAR_HEX : "var(--tactus-text-muted)";
  return (
    <div className="flex flex-col gap-4 rounded-tactus-xl p-5" style={{ background: "var(--tactus-bg-recessed)", border: "1px solid var(--tactus-border-subtle)" }}>
      <StatHeader icon={<Sun size={15} color={SOLAR_HEX} />} label="Solar" state={generating ? "Generating" : "Idle"} color={color} />
      <p style={{ fontFamily: "var(--tactus-font-mono)", fontWeight: 300, fontSize: 34, color, lineHeight: 1 }}>
        {solar.generatingKw.toFixed(1)}<span style={{ fontSize: 15, color: "var(--tactus-text-muted)" }}> kW</span>
      </p>
      <div className="flex items-center justify-between pt-3" style={{ borderTop: "1px solid var(--tactus-border-subtle)" }}>
        <p style={eyebrow}>Today</p>
        <p style={{ fontFamily: "var(--tactus-font-mono)", fontSize: 13, color: "var(--tactus-text-secondary)" }}>{solar.todayKwh.toFixed(1)} kWh</p>
      </div>
    </div>
  );
}

function PowerwallStat({ powerwall }: { powerwall: PowerwallState }) {
  const pct = round(powerwall.pct);
  const reserve = round(powerwall.reservePct);
  const isCharging = powerwall.status === "charging";
  const isDischarging = powerwall.status === "discharging";
  return (
    <div className="flex flex-col gap-4 rounded-tactus-xl p-5" style={{ background: "var(--tactus-bg-recessed)", border: "1px solid var(--tactus-border-subtle)" }}>
      <StatHeader icon={<BatteryMedium size={15} color={BATTERY_HEX} />} label="Powerwall" state={POWERWALL_STATUS_LABEL[powerwall.status]} color={BATTERY_HEX} />
      <div className="flex items-baseline gap-2">
        <p style={{ fontFamily: "var(--tactus-font-mono)", fontWeight: 300, fontSize: 34, color: BATTERY_HEX, lineHeight: 1 }}>
          {pct}<span style={{ fontSize: 15, color: "var(--tactus-text-muted)" }}>%</span>
        </p>
        {(isCharging || isDischarging) && (
          <p style={{ fontFamily: "var(--tactus-font-mono)", fontSize: 13, color: "var(--tactus-text-muted)" }}>
            {isCharging ? "+" : "−"}{powerwall.flowKw.toFixed(1)} kW
          </p>
        )}
      </div>
      <div className="relative" style={{ height: 8, borderRadius: 9999, background: "var(--tactus-bg-track)" }}>
        <div className="absolute top-0 left-0 bottom-0 rounded-full" style={{ width: `${pct}%`, background: BATTERY_HEX }} />
        <div className="absolute" style={{ left: `${reserve}%`, top: -3, bottom: -3, width: 2, background: "var(--tactus-text-primary)", opacity: 0.5 }} />
      </div>
      <p style={{ fontFamily: "var(--tactus-font-sans)", fontSize: 11, color: "var(--tactus-text-muted)" }}>Reserve {reserve}%</p>
    </div>
  );
}

function GridStat({ grid }: { grid: GridState }) {
  const importing = grid.importKw > 0.05;
  const exporting = grid.exportKw > 0.05;
  const active = importing || exporting;
  const value = exporting ? grid.exportKw : grid.importKw;
  const color = active ? GRID_HEX : "var(--tactus-text-muted)";
  return (
    <div className="flex flex-col gap-4 rounded-tactus-xl p-5" style={{ background: "var(--tactus-bg-recessed)", border: "1px solid var(--tactus-border-subtle)" }}>
      <StatHeader icon={<Zap size={15} color={GRID_HEX} />} label="Grid" state={exporting ? "Exporting" : importing ? "Importing" : "Idle"} color={color} />
      <p style={{ fontFamily: "var(--tactus-font-mono)", fontWeight: 300, fontSize: 34, color, lineHeight: 1 }}>
        {value.toFixed(1)}<span style={{ fontSize: 15, color: "var(--tactus-text-muted)" }}> kW</span>
      </p>
    </div>
  );
}

function HomeStat({ homeLoad }: { homeLoad: HomeLoadState }) {
  return (
    <div className="flex flex-col gap-4 rounded-tactus-xl p-5" style={{ background: "var(--tactus-bg-recessed)", border: "1px solid var(--tactus-border-subtle)" }}>
      <StatHeader icon={<Home size={15} color="var(--tactus-text-secondary)" />} label="Home" state="Using now" color="var(--tactus-text-muted)" />
      <p style={{ fontFamily: "var(--tactus-font-mono)", fontWeight: 300, fontSize: 34, color: "var(--tactus-text-primary)", lineHeight: 1 }}>
        {homeLoad.loadKw.toFixed(1)}<span style={{ fontSize: 15, color: "var(--tactus-text-muted)" }}> kW</span>
      </p>
    </div>
  );
}

// ─── Ghost block ──────────────────────────────────────────────────────────────

function GhostChip({ icon, label, activeLabel, isActive, status, accentHex, onClick }: {
  icon: React.ReactNode; label: string; activeLabel?: string; isActive: boolean; status: ControlStatus; accentHex: string; onClick: () => void;
}) {
  const isPending = status === "pending", isError = status === "error";
  const color = isError ? "var(--tactus-red)" : isActive ? accentHex : "var(--tactus-text-muted)";
  return (
    <button onClick={onClick} disabled={isPending}
      className="flex items-center gap-2 flex-1 justify-center py-2.5 rounded-tactus-md cursor-pointer transition-opacity hover:opacity-90 disabled:cursor-default"
      style={{ background: isError ? withAlpha("#EF4444", 0.1) : isActive ? withAlpha(accentHex, 0.13) : "var(--tactus-bg-base)", border: `1px solid ${isError ? withAlpha("#EF4444", 0.3) : isActive ? withAlpha(accentHex, 0.3) : "var(--tactus-border-default)"}`, animation: isPending ? "tactus-pulse var(--tactus-motion-pending-pulse)" : undefined }}>
      <span style={{ color }}>{icon}</span>
      <p className="text-[12px] font-semibold" style={{ fontFamily: "var(--tactus-font-sans)", color }}>
        {isPending ? "Syncing…" : isError ? "Unreachable" : isActive && activeLabel ? activeLabel : label}
      </p>
    </button>
  );
}

function GhostBlock({ tesla, control, actions, onOpenSheet }: {
  tesla: TeslaState; control: Record<TeslaControlKey, ControlStatus>; actions: TeslaActions; onOpenSheet: () => void;
}) {
  return (
    <div className="flex flex-col gap-5 rounded-tactus-xl p-6" style={{ background: "var(--tactus-bg-recessed)", border: "1px solid var(--tactus-border-subtle)" }}>
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="flex items-center justify-center rounded-tactus-md size-[40px]" style={{ background: withAlpha(CAR_HEX, 0.13) }}>
            <Car size={18} color={CAR_HEX} />
          </div>
          <div className="flex flex-col gap-[2px]">
            <p style={{ fontFamily: "var(--tactus-font-sans)", fontSize: 16, fontWeight: 600, color: "var(--tactus-text-primary)" }}>Ghost</p>
            <p style={{ fontFamily: "var(--tactus-font-sans)", fontSize: 12, color: "var(--tactus-text-muted)" }}>Model 3 · {tesla.location ?? "—"}</p>
          </div>
        </div>
        {tesla.status === "charging" && (
          <p style={{ fontFamily: "var(--tactus-font-mono)", fontSize: 13, color: "var(--tactus-green)" }}>+{(tesla.chargingKw ?? 0).toFixed(1)} kW</p>
        )}
      </div>

      <div className="flex items-center gap-10">
        <div>
          <p style={eyebrow}>Battery</p>
          <p style={{ fontFamily: "var(--tactus-font-mono)", fontWeight: 300, fontSize: 34, color: "var(--tactus-text-primary)", lineHeight: 1, marginTop: 6 }}>{round(tesla.batteryPct)}<span style={{ fontSize: 15, color: "var(--tactus-text-muted)" }}>%</span></p>
        </div>
        <div>
          <p style={eyebrow}>Range</p>
          <p style={{ fontFamily: "var(--tactus-font-mono)", fontWeight: 300, fontSize: 34, color: "var(--tactus-text-primary)", lineHeight: 1, marginTop: 6 }}>{round(tesla.rangeKm)}<span style={{ fontSize: 15, color: "var(--tactus-text-muted)" }}> km</span></p>
        </div>
      </div>

      <div className="flex gap-3">
        <GhostChip icon={<Zap size={15} />} label="Climate" isActive={tesla.climateOn} status={control.climate} accentHex={GRID_HEX} onClick={actions.toggleClimate} />
        <GhostChip icon={tesla.locked ? <Lock size={15} /> : <Unlock size={15} />} label="Unlocked" activeLabel="Locked" isActive={tesla.locked} status={control.lock} accentHex={BATTERY_HEX} onClick={actions.toggleLock} />
        <GhostChip icon={<ShieldAlert size={15} />} label="Sentry" isActive={tesla.sentryMode} status={control.sentry} accentHex={BATTERY_HEX} onClick={actions.toggleSentry} />
        <button onClick={onOpenSheet}
          className="flex items-center gap-2 flex-1 justify-center py-2.5 rounded-tactus-md cursor-pointer transition-opacity hover:opacity-90"
          style={{ background: "var(--tactus-bg-base)", border: "1px solid var(--tactus-border-default)" }}>
          <Settings2 size={15} color="var(--tactus-text-secondary)" />
          <p className="text-[12px] font-semibold" style={{ fontFamily: "var(--tactus-font-sans)", color: "var(--tactus-text-secondary)" }}>More</p>
          <ChevronRight size={13} color="var(--tactus-text-faint)" />
        </button>
      </div>
    </div>
  );
}

// ─── Energy view ──────────────────────────────────────────────────────────────

// Redesign Phase 4a — the minimal shell language applied to Energy. No back
// button (the persistent NavRail handles navigation, same as Home/Devices).
// Data + control wiring is unchanged from before the restyle: App.tsx passes
// the same solar/powerwall/grid/tesla/homeLoad/teslaControl/teslaActions it
// always has.
export function EnergyView({ solar, powerwall, grid, tesla, homeLoad, teslaControl, teslaActions }: {
  solar: SolarState; powerwall: PowerwallState; grid: GridState; tesla: TeslaState; homeLoad: HomeLoadState;
  teslaControl: Record<TeslaControlKey, ControlStatus>;
  teslaActions: TeslaActions;
}) {
  const [ghostOpen, setGhostOpen] = useState(false);

  return (
    <div className="min-h-screen" style={{ background: "var(--tactus-bg-base)" }}>
      <div className="p-8 flex flex-col gap-6">
        <h1 style={{ fontFamily: "var(--tactus-font-sans)", fontSize: 22, fontWeight: 500, color: "var(--tactus-text-primary)" }}>Energy</h1>

        <div className="grid gap-4" style={{ gridTemplateColumns: "repeat(4, 1fr)" }}>
          <SolarStat solar={solar} />
          <PowerwallStat powerwall={powerwall} />
          <GridStat grid={grid} />
          <HomeStat homeLoad={homeLoad} />
        </div>

        <GhostBlock tesla={tesla} control={teslaControl} actions={teslaActions} onOpenSheet={() => setGhostOpen(true)} />
      </div>

      {ghostOpen && (
        <GhostSheet tesla={tesla} control={teslaControl} actions={teslaActions} onClose={() => setGhostOpen(false)} />
      )}
    </div>
  );
}
