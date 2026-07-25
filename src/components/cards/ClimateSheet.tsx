import type { ClimateState, HvacMode } from "@/types";
import { ClimateCard } from "@/components/cards/ClimateCard";

// Deep climate control (redesign Phase 3) — a centred overlay opened from a
// DevicesView climate row, mirroring LightSheet's overlay pattern (dim
// backdrop, click-to-close). Wraps the existing standalone ClimateCard
// (embedded=false) rather than forking its controls; the close ✕ itself
// lives inline in ClimateCard's own header button group (its onClose prop),
// same grammar as LightSheet's toggle+close group, rather than floating
// outside the sheet.
export function ClimateSheet({ state, onTogglePower, onSetMode, onSetTemp, onSetFan, onClose }: {
  state: ClimateState;
  onTogglePower: (on: boolean) => void;
  onSetMode: (mode: HvacMode) => void;
  onSetTemp: (temp: number) => void;
  onSetFan: (fan: string) => void;
  onClose: () => void;
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center" style={{ background: "rgba(0,0,0,0.6)" }} onClick={onClose}>
      <div style={{ width: 420 }} onClick={(e) => e.stopPropagation()}>
        <ClimateCard state={state} embedded={false} onClose={onClose}
          onTogglePower={onTogglePower} onSetMode={onSetMode} onSetTemp={onSetTemp} onSetFan={onSetFan} />
      </div>
    </div>
  );
}
