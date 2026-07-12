import { useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import { Car, Volume2, Lightbulb, ChevronDown } from "lucide-react";
import type {
  TeslaState, ControlStatus, TeslaControlKey, TeslaActions,
  SeatHeaterLevel, SteeringHeaterLevel, ClimatePreset,
} from "@/types";
import { withAlpha } from "@/lib/helpers";

const TESLA_COLOR = "#3B82F6";
const RED = "#EF4444";

function statusStyle(status: ControlStatus, isActive: boolean, accentHex: string) {
  const isError = status === "error";
  const isPending = status === "pending";
  return {
    background: isError ? withAlpha(RED, 0.1) : isActive ? withAlpha(accentHex, 0.12) : "var(--tactus-bg-overlay)",
    border: `1px solid ${isError ? withAlpha(RED, 0.3) : isActive ? withAlpha(accentHex, 0.25) : "var(--tactus-border-overlay)"}`,
    animation: isPending ? "tactus-pulse var(--tactus-motion-pending-pulse)" : undefined,
  };
}

function statusColor(status: ControlStatus, isActive: boolean, accent: string) {
  return status === "error" ? "var(--tactus-red)" : isActive ? accent : "var(--tactus-text-muted)";
}

// Compact icon+label toggle, same visual language as the existing Climate/Lock
// buttons — reused for Sentry/Valet/Frunk/Trunk/Windows/Fan.
function ToggleChip({ icon, label, activeLabel, isActive, status, accent = "var(--tactus-blue)", accentHex = TESLA_COLOR, onClick, disabled }: {
  icon: React.ReactNode; label: string; activeLabel?: string; isActive: boolean; status: ControlStatus;
  accent?: string; accentHex?: string; onClick: () => void; disabled?: boolean;
}) {
  const isPending = status === "pending";
  const isError = status === "error";
  const color = statusColor(status, isActive, accent);
  return (
    <button onClick={onClick} disabled={isPending || disabled}
      className="flex items-center gap-2 flex-1 px-3 py-2.5 rounded-tactus-md cursor-pointer transition-opacity hover:opacity-80 disabled:cursor-default"
      style={statusStyle(status, isActive, accentHex)}>
      <span style={{ color }}>{icon}</span>
      <p className="text-[12px] font-semibold" style={{ fontFamily: "var(--tactus-font-sans)", color }}>
        {isPending ? "Syncing…" : isError ? "Unreachable" : isActive && activeLabel ? activeLabel : label}
      </p>
    </button>
  );
}

// Small round icon-only button for fire-and-forget actions (honk/flash) —
// no pending/error state since there's nothing to confirm.
function QuickActionButton({ icon, label, onClick }: { icon: React.ReactNode; label: string; onClick: () => void }) {
  return (
    <motion.button onClick={onClick} whileTap={{ scale: 0.94 }} title={label}
      className="flex items-center justify-center gap-2 flex-1 px-3 py-2.5 rounded-tactus-md cursor-pointer transition-opacity hover:opacity-80"
      style={{ background: "var(--tactus-bg-overlay)", border: "1px solid var(--tactus-border-overlay)" }}>
      <span style={{ color: "var(--tactus-text-secondary)" }}>{icon}</span>
      <p className="text-[12px] font-semibold" style={{ fontFamily: "var(--tactus-font-sans)", color: "var(--tactus-text-secondary)" }}>{label}</p>
    </motion.button>
  );
}

// Segmented level picker — reused for both seat heaters, the steering wheel
// heater, and the climate preset row. Options are passed in explicitly since
// devices report different option sets (seat heaters: off/low/medium/high;
// steering wheel: off/low/high — fewer options, not assumed to match).
function LevelPicker<T extends string>({ label, options, value, status, onChange, accentHex = TESLA_COLOR }: {
  label: string; options: { value: T; label: string }[]; value: T; status: ControlStatus;
  onChange: (v: T) => void; accentHex?: string;
}) {
  const isPending = status === "pending";
  const isError = status === "error";
  return (
    <div className="flex flex-col gap-1.5">
      <div className="flex items-center justify-between">
        <p className="text-[10px] font-semibold uppercase tracking-wider" style={{ fontFamily: "var(--tactus-font-sans)", color: "var(--tactus-text-faint)" }}>{label}</p>
        {isError && <p className="text-[10px] font-semibold uppercase" style={{ fontFamily: "var(--tactus-font-sans)", color: "var(--tactus-red)" }}>Unreachable</p>}
      </div>
      <div className="flex gap-1.5" style={{ animation: isPending ? "tactus-pulse var(--tactus-motion-pending-pulse)" : undefined }}>
        {options.map((opt) => {
          const isActive = opt.value === value;
          return (
            <button key={opt.value} onClick={() => onChange(opt.value)} disabled={isPending}
              className="flex-1 flex items-center justify-center px-2 py-1.5 rounded-tactus-sm cursor-pointer transition-opacity hover:opacity-80 disabled:cursor-default"
              style={{
                background: isActive ? withAlpha(accentHex, 0.14) : "var(--tactus-bg-overlay)",
                border: `1px solid ${isActive ? withAlpha(accentHex, 0.3) : "var(--tactus-border-overlay)"}`,
              }}>
              <p className="text-[11px] font-semibold" style={{ fontFamily: "var(--tactus-font-sans)", color: isActive ? "var(--tactus-blue)" : "var(--tactus-text-muted)" }}>{opt.label}</p>
            </button>
          );
        })}
      </div>
    </div>
  );
}

const SEAT_HEATER_OPTIONS: { value: SeatHeaterLevel; label: string }[] = [
  { value: "off", label: "Off" }, { value: "low", label: "Low" }, { value: "medium", label: "Med" }, { value: "high", label: "High" },
];
const WHEEL_HEATER_OPTIONS: { value: SteeringHeaterLevel; label: string }[] = [
  { value: "off", label: "Off" }, { value: "low", label: "Low" }, { value: "high", label: "High" },
];
const CLIMATE_PRESET_OPTIONS: { value: ClimatePreset; label: string }[] = [
  { value: "off", label: "Off" }, { value: "keep", label: "Keep" }, { value: "dog", label: "Dog Mode" }, { value: "camp", label: "Camp Mode" },
];

export function TeslaCard({ tesla, control, actions }: {
  tesla: TeslaState;
  control: Record<TeslaControlKey, ControlStatus>;
  actions: TeslaActions;
}) {
  const [expanded, setExpanded] = useState(false);
  const isCharging = tesla.status === "charging";
  const r = 54, circ = 2 * Math.PI * r;
  const filled = circ * (tesla.batteryPct / 100);

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

      {/* Core controls */}
      <div className="flex gap-3 pt-4" style={{ borderTop: "1px solid var(--tactus-bg-overlay)" }}>
        <ToggleChip label="Climate" isActive={tesla.climateOn} status={control.climate} onClick={actions.toggleClimate}
          icon={<svg viewBox="0 0 24 24" fill="none" className="size-4 shrink-0"><path d="M12 2v20M4.93 4.93l14.14 14.14M2 12h20M4.93 19.07l14.14-14.14" stroke="currentColor" strokeLinecap="round" strokeWidth="1.5" /></svg>} />
        <ToggleChip label="Unlocked" activeLabel="Locked" isActive={tesla.locked} status={control.lock} onClick={actions.toggleLock} accent="var(--tactus-green)" accentHex="#22C55E"
          icon={<svg viewBox="0 0 24 24" fill="none" className="size-4 shrink-0">{tesla.locked
            ? <><rect x="3" y="11" width="18" height="11" rx="2" stroke="currentColor" strokeWidth="1.5" /><path d="M7 11V7a5 5 0 0 1 10 0v4" stroke="currentColor" strokeLinecap="round" strokeWidth="1.5" /></>
            : <><rect x="3" y="11" width="18" height="11" rx="2" stroke="currentColor" strokeWidth="1.5" /><path d="M7 11V7a5 5 0 0 1 9.9-1" stroke="currentColor" strokeLinecap="round" strokeWidth="1.5" /></>}</svg>} />
      </div>

      {/* Expand toggle */}
      <button onClick={() => setExpanded((e) => !e)} className="flex items-center justify-center gap-1.5 mt-3 py-1.5 cursor-pointer hover:opacity-70 transition-opacity">
        <p className="text-[11px] font-semibold uppercase tracking-wider" style={{ fontFamily: "var(--tactus-font-sans)", color: "var(--tactus-text-faint)" }}>{expanded ? "Fewer controls" : "More controls"}</p>
        <motion.div animate={{ rotate: expanded ? 180 : 0 }} transition={{ duration: 0.2 }}>
          <ChevronDown size={12} color="var(--tactus-text-faint)" />
        </motion.div>
      </button>

      <AnimatePresence initial={false}>
        {expanded && (
          <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }} transition={{ duration: 0.25 }} style={{ overflow: "hidden" }}>
            <div className="flex flex-col gap-4 pt-3" style={{ borderTop: "1px solid var(--tactus-bg-overlay)" }}>

              {/* Quick actions */}
              <div className="flex gap-3">
                <QuickActionButton icon={<Volume2 size={15} />} label="Honk" onClick={actions.honk} />
                <QuickActionButton icon={<Lightbulb size={15} />} label="Flash" onClick={actions.flash} />
              </div>

              {/* Security */}
              <div className="flex flex-col gap-2">
                <p className="text-[10px] font-bold uppercase tracking-widest" style={{ fontFamily: "var(--tactus-font-sans)", color: "var(--tactus-text-faint)" }}>Security</p>
                <div className="flex gap-3">
                  <ToggleChip label="Sentry" isActive={tesla.sentryMode} status={control.sentry} onClick={actions.toggleSentry} accent="var(--tactus-green)" accentHex="#22C55E"
                    icon={<svg viewBox="0 0 24 24" fill="none" className="size-4 shrink-0"><path d="M12 3l7 3v5c0 4.5-3 8-7 9-4-1-7-4.5-7-9V6l7-3Z" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" /></svg>} />
                  <ToggleChip label="Valet" isActive={tesla.valetMode} status={control.valet} onClick={actions.toggleValet} accent="var(--tactus-amber)" accentHex="#F59E0B"
                    icon={<svg viewBox="0 0 24 24" fill="none" className="size-4 shrink-0"><circle cx="12" cy="8" r="3.5" stroke="currentColor" strokeWidth="1.5" /><path d="M5 20c0-3.5 3-6 7-6s7 2.5 7 6" stroke="currentColor" strokeLinecap="round" strokeWidth="1.5" /></svg>} />
                </div>
              </div>

              {/* Access */}
              <div className="flex flex-col gap-2">
                <p className="text-[10px] font-bold uppercase tracking-widest" style={{ fontFamily: "var(--tactus-font-sans)", color: "var(--tactus-text-faint)" }}>Access</p>
                <div className="flex gap-3">
                  <ToggleChip label="Frunk" activeLabel="Open" isActive={tesla.frunkOpen} status={control.frunk} onClick={actions.openFrunk} disabled={tesla.frunkOpen}
                    icon={<svg viewBox="0 0 24 24" fill="none" className="size-4 shrink-0"><path d="M3 10l1.5-5h15L21 10M3 10v9h18v-9M3 10h18" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" /></svg>} />
                  <ToggleChip label="Trunk" activeLabel="Open" isActive={tesla.trunkOpen} status={control.trunk} onClick={actions.toggleTrunk}
                    icon={<svg viewBox="0 0 24 24" fill="none" className="size-4 shrink-0"><path d="M3 13h18M3 13v6h18v-6M3 13l2-6h14l2 6" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" /></svg>} />
                  <ToggleChip label="Windows" activeLabel="Open" isActive={tesla.windowsOpen} status={control.windows} onClick={actions.toggleWindows}
                    icon={<svg viewBox="0 0 24 24" fill="none" className="size-4 shrink-0"><rect x="4" y="4" width="16" height="16" rx="1.5" stroke="currentColor" strokeWidth="1.5" /><path d="M12 4v16" stroke="currentColor" strokeWidth="1.5" /></svg>} />
                </div>
              </div>

              {/* Comfort */}
              <div className="flex flex-col gap-3">
                <p className="text-[10px] font-bold uppercase tracking-widest" style={{ fontFamily: "var(--tactus-font-sans)", color: "var(--tactus-text-faint)" }}>Comfort</p>
                <LevelPicker label="Seat Heater · Left" options={SEAT_HEATER_OPTIONS} value={tesla.seatHeaterFL} status={control.seatHeaterFL} onChange={actions.setSeatHeaterFL} />
                <LevelPicker label="Seat Heater · Right" options={SEAT_HEATER_OPTIONS} value={tesla.seatHeaterFR} status={control.seatHeaterFR} onChange={actions.setSeatHeaterFR} />
                <LevelPicker label="Steering Wheel Heater" options={WHEEL_HEATER_OPTIONS} value={tesla.steeringWheelHeater} status={control.steeringWheelHeater} onChange={actions.setSteeringWheelHeater} />
                <LevelPicker label="Climate Mode" options={CLIMATE_PRESET_OPTIONS} value={tesla.climatePreset} status={control.climatePreset} onChange={actions.setClimatePreset} />
                <ToggleChip label="Max Defrost" activeLabel="Bioweapon Defense" isActive={tesla.climateFanMode === "bioweapon"} status={control.climateFanMode} accent="var(--tactus-amber)" accentHex="#F59E0B"
                  onClick={() => actions.setClimateFanMode(tesla.climateFanMode === "bioweapon" ? "off" : "bioweapon")}
                  icon={<svg viewBox="0 0 24 24" fill="none" className="size-4 shrink-0"><path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83" stroke="currentColor" strokeLinecap="round" strokeWidth="1.5" /></svg>} />
              </div>

            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
