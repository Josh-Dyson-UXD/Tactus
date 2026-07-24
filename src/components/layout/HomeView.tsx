import { Sun, BatteryMedium, Car, Power, Moon, LogOut, Wind, Flame } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import type { Room, OutdoorState, SolarState, PowerwallState, TeslaState, QuickActionId, HvacMode } from "@/types";
import { withAlpha } from "@/lib/helpers";
import { CONDITION } from "@/components/layout/EnvironmentBar";

const round = (n: number) => Math.round(n);

const CO2_ELEVATED = 800; // matches EnvironmentBar's co2Color amber threshold

const CLIMATE_MODE_COLOR: Record<HvacMode, string> = {
  heat: "var(--tactus-amber)",
  cool: "var(--tactus-blue)",
  dry: "var(--tactus-blue-light)",
  fan_only: "var(--tactus-text-secondary)",
  heat_cool: "var(--tactus-green)",
  off: "var(--tactus-text-muted)",
};
const CLIMATE_MODE_LABEL: Record<HvacMode, string> = {
  heat: "Heat", cool: "Cool", dry: "Dry", fan_only: "Fan", heat_cool: "Auto", off: "Off",
};

function batteryWord(s: PowerwallState["status"]) {
  return s === "charging" ? "charging" : s === "discharging" ? "discharging" : s === "backup" ? "on backup" : "holding";
}
function carWord(s: TeslaState["status"]) {
  return s === "charging" ? "charging" : s === "away" ? "away" : "parked";
}

const eyebrow: React.CSSProperties = {
  fontFamily: "var(--tactus-font-sans)", fontSize: 10, fontWeight: 700,
  letterSpacing: "0.16em", textTransform: "uppercase", color: "var(--tactus-text-faint)",
};

const QUICK_ACTIONS: { id: QuickActionId; label: string; Icon: LucideIcon }[] = [
  { id: "all_off", label: "All Off", Icon: Power },
  { id: "good_night", label: "Good Night", Icon: Moon },
  { id: "away", label: "Away", Icon: LogOut },
  { id: "precondition", label: "Precondition", Icon: Wind },
  { id: "heat_living", label: "Heat Living", Icon: Flame },
];

function EnergyColumn({ Icon, iconColor, label, value, sub }: { Icon: LucideIcon; iconColor: string; label: string; value: string; sub: string }) {
  return (
    <div style={{ flex: 1, padding: "16px 20px" }}>
      <div className="flex items-center gap-2 mb-3">
        <Icon size={13} color={iconColor} />
        <p style={eyebrow}>{label}</p>
      </div>
      <p style={{ fontFamily: "var(--tactus-font-mono)", fontWeight: 300, fontSize: 24, color: "var(--tactus-text-primary)", lineHeight: 1 }}>{value}</p>
      <p className="mt-1.5" style={{ fontFamily: "var(--tactus-font-sans)", fontSize: 12, color: "var(--tactus-text-muted)" }}>{sub}</p>
    </div>
  );
}

export function HomeView({ rooms, outdoor, solar, powerwall, tesla, onNavigateRoom, onOpenEnergy, onQuickAction }: {
  rooms: Room[]; outdoor: OutdoorState; solar: SolarState;
  powerwall: PowerwallState; tesla: TeslaState;
  onNavigateRoom: (roomId: string) => void;
  onOpenEnergy: () => void;
  onQuickAction: (id: QuickActionId) => void;
}) {
  const condition = CONDITION[outdoor.condition] ?? { label: outdoor.condition || "—", Icon: Sun };
  const ConditionIcon = condition.Icon;

  // Rooms sorted active-first (anything on), each with a quiet status line
  // built from whatever's meaningful — omitting "Off" entirely, since the
  // grey dot already says it's off.
  const roomRows = rooms
    .map((room) => {
      const lightsOn = room.lights.filter((l) => l.cardState === "on").length;
      const climateUnit = room.climate[0];
      const tempSensor = room.sensors.find((s) => s.data.kind === "temp");
      const co2Sensor = room.sensors.find((s) => s.data.kind === "co2");

      const parts: { text: string; color: string }[] = [];
      if (lightsOn > 0) parts.push({ text: `${lightsOn} light${lightsOn > 1 ? "s" : ""}`, color: "var(--tactus-text-secondary)" });
      if (climateUnit && climateUnit.mode !== "off") {
        parts.push({ text: `${CLIMATE_MODE_LABEL[climateUnit.mode]} ${climateUnit.targetTemp ?? "—"}°`, color: CLIMATE_MODE_COLOR[climateUnit.mode] });
      }
      if (tempSensor && tempSensor.data.kind === "temp") parts.push({ text: `${tempSensor.data.tempC.toFixed(1)}°`, color: "var(--tactus-text-secondary)" });
      if (co2Sensor && co2Sensor.data.kind === "co2" && co2Sensor.data.co2 >= CO2_ELEVATED) {
        parts.push({ text: `CO₂ ${co2Sensor.data.co2}`, color: "var(--tactus-amber)" });
      }

      const active = lightsOn > 0 || (climateUnit ? climateUnit.mode !== "off" : false);
      return { room, active, parts };
    })
    .sort((a, b) => Number(b.active) - Number(a.active));

  return (
    <div className="min-h-screen" style={{ background: "var(--tactus-bg-base)" }}>
      <div className="p-8 flex flex-col gap-8">
        {/* Header */}
        <div className="flex items-center justify-between">
          <h1 style={{ fontFamily: "var(--tactus-font-sans)", fontSize: 22, fontWeight: 500, color: "var(--tactus-text-primary)" }}>My Home</h1>
          <div className="flex items-center gap-2">
            <ConditionIcon size={16} color="var(--tactus-text-muted)" />
            <span style={{ fontFamily: "var(--tactus-font-mono)", fontWeight: 300, fontSize: 18, color: "var(--tactus-blue-light)" }}>
              {outdoor.tempC !== null ? `${round(outdoor.tempC)}°` : "—"}
            </span>
            <span style={{ fontFamily: "var(--tactus-font-sans)", fontSize: 13, color: "var(--tactus-text-muted)" }}>
              {round(outdoor.humidity)}% · {condition.label}
            </span>
          </div>
        </div>

        {/* Energy overview */}
        <button onClick={onOpenEnergy} className="rounded-tactus-xl overflow-hidden text-left cursor-pointer hover:opacity-90 transition-opacity"
          style={{ background: "var(--tactus-bg-recessed)", border: "1px solid var(--tactus-border-subtle)" }}>
          <div className="flex divide-x" style={{ borderColor: "var(--tactus-border-subtle)" }}>
            <EnergyColumn Icon={Sun} iconColor="var(--tactus-amber)" label="Solar"
              value={`${solar.generatingKw.toFixed(1)} kW`} sub={`${solar.todayKwh.toFixed(1)} kWh today`} />
            <EnergyColumn Icon={BatteryMedium} iconColor="var(--tactus-green)" label="Powerwall"
              value={`${round(powerwall.pct)} %`} sub={batteryWord(powerwall.status)} />
            <EnergyColumn Icon={Car} iconColor="var(--tactus-blue)" label="Ghost"
              value={`${round(tesla.batteryPct)} %`} sub={`${round(tesla.rangeKm)} km · ${carWord(tesla.status)}`} />
          </div>
        </button>

        {/* Quick actions */}
        <div>
          <p style={{ ...eyebrow, marginBottom: 10 }}>Quick actions</p>
          <div className="rounded-tactus-xl overflow-hidden flex divide-x" style={{ background: "var(--tactus-bg-recessed)", border: "1px solid var(--tactus-border-subtle)", borderColor: "var(--tactus-border-subtle)" }}>
            {QUICK_ACTIONS.map(({ id, label, Icon }) => (
              <button key={id} onClick={() => onQuickAction(id)}
                className="flex-1 flex flex-col items-center justify-center gap-2 cursor-pointer hover:opacity-80 transition-opacity"
                style={{ padding: "18px 8px" }}>
                <Icon size={18} color="var(--tactus-text-secondary)" />
                <p style={{ fontFamily: "var(--tactus-font-sans)", fontSize: 11, fontWeight: 600, color: "var(--tactus-text-secondary)", textAlign: "center" }}>{label}</p>
              </button>
            ))}
          </div>
        </div>

        {/* Rooms */}
        <div>
          <p style={{ ...eyebrow, marginBottom: 10 }}>Rooms</p>
          <div className="rounded-tactus-xl overflow-hidden" style={{ background: "var(--tactus-bg-recessed)", border: "1px solid var(--tactus-border-subtle)" }}>
            {roomRows.map(({ room, active, parts }, i) => (
              <button key={room.id} onClick={() => onNavigateRoom(room.id)}
                className="flex items-center justify-between w-full text-left cursor-pointer hover:opacity-90 transition-opacity"
                style={{ padding: "14px 20px", borderBottom: i < roomRows.length - 1 ? "1px solid var(--tactus-border-subtle)" : "none" }}>
                <div className="flex items-center gap-3">
                  <div style={{
                    width: 8, height: 8, borderRadius: "50%",
                    background: active ? "var(--tactus-amber)" : "var(--tactus-border-default)",
                    boxShadow: active ? `0 0 8px 0 ${withAlpha("#F59E0B", 0.5)}` : "none",
                  }} />
                  <p style={{ fontFamily: "var(--tactus-font-sans)", fontSize: 14, fontWeight: 500, color: active ? "var(--tactus-text-primary)" : "var(--tactus-text-secondary)" }}>{room.name}</p>
                </div>
                {parts.length > 0 && (
                  <div className="flex items-center gap-2">
                    {parts.map((p, idx) => (
                      <span key={idx} style={{ fontFamily: "var(--tactus-font-sans)", fontSize: 12, color: p.color }}>
                        {p.text}{idx < parts.length - 1 ? " ·" : ""}
                      </span>
                    ))}
                  </div>
                )}
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
