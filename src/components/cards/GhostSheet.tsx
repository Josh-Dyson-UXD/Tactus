import { useDialogFocus } from "@/lib/use-dialog-focus";
import { X, Volume2, Lightbulb, Zap, ShieldAlert, UserCog, PackageOpen, Package, PanelTop, Wind, Car } from "lucide-react";
import type { TeslaState, ControlStatus, TeslaControlKey, TeslaActions, SeatHeaterLevel, SteeringHeaterLevel, ClimatePreset } from "@/types";
import { withAlpha } from "@/lib/helpers";

const round = (n: number) => Math.round(n);

const CAR_HEX   = "#3B82F6";
const GREEN_HEX = "#22C55E";
const AMBER_HEX = "#F59E0B";
const RED_HEX   = "#EF4444";

const eyebrow: React.CSSProperties = {
  fontFamily: "var(--tactus-font-sans)", fontSize: 10, fontWeight: 700,
  letterSpacing: "0.16em", textTransform: "uppercase", color: "var(--tactus-text-faint)",
};

function SectionLabel({ children }: { children: React.ReactNode }) {
  return <p style={{ ...eyebrow, marginBottom: 10 }}>{children}</p>;
}

// Icon+label toggle chip, same pending/error grammar as every other control
// in the app (ambient pulse on pending, red on error, never a spinner).
function Chip({ icon, label, activeLabel, isActive, status, accentHex = CAR_HEX, onClick, disabled }: {
  icon: React.ReactNode; label: string; activeLabel?: string; isActive: boolean; status: ControlStatus;
  accentHex?: string; onClick: () => void; disabled?: boolean;
}) {
  const isPending = status === "pending", isError = status === "error";
  const color = isError ? "var(--tactus-red)" : isActive ? accentHex : "var(--tactus-text-muted)";
  return (
    <button onClick={onClick} disabled={isPending || disabled}
      className="flex items-center gap-2 flex-1 justify-center py-2.5 rounded-tactus-md cursor-pointer transition-opacity hover:opacity-90 disabled:cursor-default"
      style={{
        background: isError ? withAlpha(RED_HEX, 0.1) : isActive ? withAlpha(accentHex, 0.13) : "var(--tactus-bg-base)",
        border: `1px solid ${isError ? withAlpha(RED_HEX, 0.3) : isActive ? withAlpha(accentHex, 0.3) : "var(--tactus-border-default)"}`,
        animation: isPending ? "tactus-pulse var(--tactus-motion-pending-pulse)" : undefined,
      }}>
      <span style={{ color }}>{icon}</span>
      <p className="text-[12px] font-semibold" style={{ fontFamily: "var(--tactus-font-sans)", color }}>
        {isPending ? "Syncing…" : isError ? "Unreachable" : isActive && activeLabel ? activeLabel : label}
      </p>
    </button>
  );
}

// Fire-and-forget round icon button (honk/flash) — no pending/error state
// since there's nothing to confirm.
function QuickAction({ icon, label, onClick }: { icon: React.ReactNode; label: string; onClick: () => void }) {
  return (
    <button onClick={onClick}
      className="flex items-center justify-center gap-2 flex-1 py-2.5 rounded-tactus-md cursor-pointer transition-opacity hover:opacity-90"
      style={{ background: "var(--tactus-bg-base)", border: "1px solid var(--tactus-border-default)" }}>
      <span style={{ color: "var(--tactus-text-secondary)" }}>{icon}</span>
      <p className="text-[12px] font-semibold" style={{ fontFamily: "var(--tactus-font-sans)", color: "var(--tactus-text-secondary)" }}>{label}</p>
    </button>
  );
}

// Segmented level picker, reused for both seat heaters, the steering wheel
// heater, and the climate preset row — option sets are passed in explicitly
// since devices report different sets (seat heaters: off/low/medium/high;
// steering wheel: off/low/high).
function LevelPicker<T extends string>({ label, options, value, status, onChange, accentHex = CAR_HEX }: {
  label: string; options: { value: T; label: string }[]; value: T; status: ControlStatus;
  onChange: (v: T) => void; accentHex?: string;
}) {
  const isPending = status === "pending", isError = status === "error";
  return (
    <div className="flex flex-col gap-1.5">
      <div className="flex items-center justify-between">
        <p style={eyebrow}>{label}</p>
        {isError && <p style={{ fontFamily: "var(--tactus-font-sans)", fontSize: 10, fontWeight: 700, textTransform: "uppercase", color: "var(--tactus-red)" }}>Unreachable</p>}
      </div>
      <div className="flex gap-1.5" style={{ animation: isPending ? "tactus-pulse var(--tactus-motion-pending-pulse)" : undefined }}>
        {options.map((opt) => {
          const isActive = opt.value === value;
          return (
            <button key={opt.value} onClick={() => onChange(opt.value)} disabled={isPending}
              className="flex-1 flex items-center justify-center py-2 rounded-tactus-sm cursor-pointer transition-opacity hover:opacity-90 disabled:cursor-default"
              style={{ background: isActive ? withAlpha(accentHex, 0.14) : "var(--tactus-bg-base)", border: `1px solid ${isActive ? withAlpha(accentHex, 0.3) : "var(--tactus-border-default)"}` }}>
              <p className="text-[11px] font-semibold" style={{ fontFamily: "var(--tactus-font-sans)", color: isActive ? accentHex : "var(--tactus-text-muted)" }}>{opt.label}</p>
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
  { value: "off", label: "Off" }, { value: "keep", label: "Keep" }, { value: "dog", label: "Dog" }, { value: "camp", label: "Camp" },
];

// Full Tesla control set (redesign Phase 4a) — a centred overlay opened from
// the Energy view's Ghost block "More" chip, mirroring LightSheet/
// ClimateSheet's overlay pattern. Re-skins TeslaCard's expanded section into
// the new minimal language; the handlers and teslaControl pending/error
// state are the same wiring TeslaCard already used, not new behaviour.
export function GhostSheet({ tesla, control, actions, onClose }: {
  tesla: TeslaState; control: Record<TeslaControlKey, ControlStatus>; actions: TeslaActions; onClose: () => void;
}) {
  const dialogRef = useDialogFocus(onClose);
  return (
    <div className="tactus-sheet-backdrop fixed inset-0 z-50 flex items-center justify-center" style={{ background: "rgba(0,0,0,0.6)" }} onClick={onClose}>
      <div ref={dialogRef} tabIndex={-1} role="dialog" aria-modal="true" aria-label="Ghost controls" className="tactus-sheet flex flex-col rounded-tactus-2xl" style={{ width: 460, maxHeight: "86vh", background: "var(--tactus-bg-raised)", border: "1px solid var(--tactus-border-default)" }} onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div className="flex items-center justify-between p-6 pb-5 shrink-0">
          <div className="flex items-center gap-3">
            <div className="flex items-center justify-center rounded-tactus-md size-[40px]" style={{ background: withAlpha(CAR_HEX, 0.13) }}>
              <Car size={18} color={CAR_HEX} />
            </div>
            <div className="flex flex-col gap-[2px]">
              <p style={{ fontFamily: "var(--tactus-font-sans)", fontSize: 15, fontWeight: 600, color: "var(--tactus-text-primary)" }}>Ghost</p>
              <p style={{ fontFamily: "var(--tactus-font-sans)", fontSize: 12, color: "var(--tactus-text-muted)" }}>Model 3 · {tesla.location ?? "—"}</p>
            </div>
          </div>
          <div className="flex items-center gap-4">
            <div className="text-right">
              <p style={{ fontFamily: "var(--tactus-font-mono)", fontWeight: 300, fontSize: 20, color: "var(--tactus-text-primary)", lineHeight: 1 }}>{round(tesla.batteryPct)}%</p>
              <p style={{ fontFamily: "var(--tactus-font-sans)", fontSize: 11, color: "var(--tactus-text-muted)", marginTop: 2 }}>{round(tesla.rangeKm)} km</p>
            </div>
            <button aria-label="Close controls" onClick={onClose} className="flex items-center justify-center rounded-full cursor-pointer hover:opacity-80 transition-opacity" style={{ width: 32, height: 32, background: "var(--tactus-bg-base)", border: "1px solid var(--tactus-border-default)" }}>
              <X size={14} color="var(--tactus-text-secondary)" />
            </button>
          </div>
        </div>

        {/* Scrollable control set */}
        <div className="flex flex-col gap-6 px-6 pb-6" style={{ overflowY: "auto" }}>
          {/* Quick actions */}
          <div className="flex gap-3">
            <QuickAction icon={<Volume2 size={15} />} label="Honk" onClick={actions.honk} />
            <QuickAction icon={<Lightbulb size={15} />} label="Flash" onClick={actions.flash} />
          </div>

          {/* Climate */}
          <div>
            <SectionLabel>Climate</SectionLabel>
            <div className="flex flex-col gap-3">
              <Chip icon={<Zap size={15} />} label="Climate" isActive={tesla.climateOn} status={control.climate} onClick={actions.toggleClimate} />
              <LevelPicker label="Preset" options={CLIMATE_PRESET_OPTIONS} value={tesla.climatePreset} status={control.climatePreset} onChange={actions.setClimatePreset} />
              <Chip icon={<Wind size={15} />} label="Max Defrost" activeLabel="Bioweapon Defense" isActive={tesla.climateFanMode === "bioweapon"} status={control.climateFanMode} accentHex={AMBER_HEX}
                onClick={() => actions.setClimateFanMode(tesla.climateFanMode === "bioweapon" ? "off" : "bioweapon")} />
            </div>
          </div>

          {/* Security */}
          <div>
            <SectionLabel>Security</SectionLabel>
            <div className="flex gap-3">
              <Chip icon={<ShieldAlert size={15} />} label="Sentry" isActive={tesla.sentryMode} status={control.sentry} accentHex={GREEN_HEX} onClick={actions.toggleSentry} />
              <Chip icon={<UserCog size={15} />} label="Valet" isActive={tesla.valetMode} status={control.valet} accentHex={AMBER_HEX} onClick={actions.toggleValet} />
            </div>
          </div>

          {/* Comfort */}
          <div className="flex flex-col gap-3">
            <SectionLabel>Comfort</SectionLabel>
            <LevelPicker label="Seat Heater · Left" options={SEAT_HEATER_OPTIONS} value={tesla.seatHeaterFL} status={control.seatHeaterFL} onChange={actions.setSeatHeaterFL} accentHex={AMBER_HEX} />
            <LevelPicker label="Seat Heater · Right" options={SEAT_HEATER_OPTIONS} value={tesla.seatHeaterFR} status={control.seatHeaterFR} onChange={actions.setSeatHeaterFR} accentHex={AMBER_HEX} />
            <LevelPicker label="Steering Wheel" options={WHEEL_HEATER_OPTIONS} value={tesla.steeringWheelHeater} status={control.steeringWheelHeater} onChange={actions.setSteeringWheelHeater} accentHex={AMBER_HEX} />
          </div>

          {/* Access */}
          <div>
            <SectionLabel>Access</SectionLabel>
            <div className="flex gap-3">
              <Chip icon={<PackageOpen size={15} />} label="Frunk" activeLabel="Open" isActive={tesla.frunkOpen} status={control.frunk} onClick={actions.openFrunk} disabled={tesla.frunkOpen} />
              <Chip icon={<Package size={15} />} label="Trunk" activeLabel="Open" isActive={tesla.trunkOpen} status={control.trunk} onClick={actions.toggleTrunk} />
              <Chip icon={<PanelTop size={15} />} label="Windows" activeLabel="Open" isActive={tesla.windowsOpen} status={control.windows} onClick={actions.toggleWindows} />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
