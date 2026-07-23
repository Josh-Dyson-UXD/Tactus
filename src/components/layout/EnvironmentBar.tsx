import { Thermometer, Droplets, Wind } from "lucide-react";
import type { Room, OutdoorState, AQISensor, CO2Sensor, PM25Sensor, TempSensor, HumidSensor } from "@/types";

function avg(nums: number[]) { return nums.length ? nums.reduce((a, b) => a + b, 0) / nums.length : null; }

function EnvMetric({ icon, value, unit, label, color }: { icon: React.ReactNode; value: string; unit: string; label: string; color: string }) {
  return (
    <div className="flex flex-col gap-1.5">
      <div className="flex items-baseline gap-1">
        <span style={{ color, fontSize: 22, fontFamily: "var(--tactus-font-mono)", fontWeight: 700, lineHeight: 1 }}>{value}</span>
        <span style={{ color: "var(--tactus-text-muted)", fontSize: 12, fontFamily: "var(--tactus-font-mono)", fontWeight: 600 }}>{unit}</span>
      </div>
      <div className="flex items-center gap-1.5">
        <span style={{ color: "var(--tactus-text-faint)" }}>{icon}</span>
        <span style={{ color: "var(--tactus-text-faint)", fontSize: 11, fontFamily: "var(--tactus-font-sans)", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.06em" }}>{label}</span>
      </div>
    </div>
  );
}

export function EnvironmentBar({ rooms, outdoor }: { rooms: Room[]; outdoor: OutdoorState }) {
  const allSensors = rooms.flatMap((r) => r.sensors);

  // AQI still comes from per-room Matter sensors (deferred/empty per
  // CLAUDE.md — not part of this task). Temp and humidity used to come from
  // a single dedicated indoor sensor (retired — that sensor physically moved
  // to the Laundry and is just another per-room sensor now); they're now a
  // min–max range across every room's indoor air sensors
  // (Kitchen/Bedroom/Living/Laundry), since there's no longer one canonical
  // "the house's" reading. CO₂ and PM2.5 stay as averages across
  // whichever rooms report them.
  const temps  = allSensors.filter((s) => s.data.kind === "temp").map((s) => (s.data as TempSensor).tempC);
  const humids = allSensors.filter((s) => s.data.kind === "humidity").map((s) => (s.data as HumidSensor).humidity);
  const aqis = allSensors.filter((s) => s.data.kind === "aqi").map((s) => (s.data as AQISensor).aqi);
  const co2s = allSensors.filter((s) => s.data.kind === "co2").map((s) => (s.data as CO2Sensor).co2);
  const pm25s = allSensors.filter((s) => s.data.kind === "pm25").map((s) => (s.data as PM25Sensor).pm25);

  const range = (nums: number[]) => nums.length ? { min: Math.min(...nums), max: Math.max(...nums) } : null;
  const fmtRange = (r: { min: number; max: number }, dp: number) =>
    r.min.toFixed(dp) === r.max.toFixed(dp) ? r.min.toFixed(dp) : `${r.min.toFixed(dp)}–${r.max.toFixed(dp)}`;

  const tempRange  = range(temps);
  const humidRange = range(humids);
  const indoorAqi   = avg(aqis);
  const indoorCo2   = avg(co2s);
  const indoorPm25  = avg(pm25s);

  const tempColor  = (t: number) => t < 18 ? "var(--tactus-blue-light)" : t > 26 ? "var(--tactus-pink)" : "var(--tactus-green)";
  const humidColor = (h: number) => h < 30 ? "var(--tactus-amber)" : h > 65 ? "var(--tactus-blue)" : "var(--tactus-green)";
  const aqiColor   = (a: number) => a <= 50 ? "var(--tactus-green)" : a <= 100 ? "var(--tactus-amber)" : "var(--tactus-pink)";
  const co2Color   = (c: number) => c < 800 ? "var(--tactus-green)" : c < 1200 ? "var(--tactus-amber)" : "var(--tactus-pink)";
  const pm25Color  = (v: number) => v <= 12 ? "var(--tactus-green)" : v <= 35 ? "var(--tactus-amber)" : "var(--tactus-pink)";

  return (
    <div className="rounded-tactus-xl overflow-hidden" style={{ background: "var(--tactus-bg-recessed)", border: "1px solid var(--tactus-border-subtle)" }}>
      <div className="flex divide-x" style={{ divideColor: "var(--tactus-border-subtle)" }}>

        {/* Indoor */}
        <div className="flex-1 p-5 flex flex-col gap-4">
          <p className="text-[10px] font-bold uppercase tracking-widest" style={{ fontFamily: "var(--tactus-font-sans)", color: "var(--tactus-border-subtle)" }}>Indoor</p>
          <div className="flex flex-wrap gap-x-8 gap-y-4">
            {tempRange  && <EnvMetric icon={<Thermometer size={12} />} value={fmtRange(tempRange, 1)}  unit="°C" label="Temp"     color={tempColor((tempRange.min + tempRange.max) / 2)} />}
            {humidRange && <EnvMetric icon={<Droplets    size={12} />} value={fmtRange(humidRange, 0)} unit="%"  label="Humidity" color={humidColor((humidRange.min + humidRange.max) / 2)} />}
            {indoorAqi   !== null && <EnvMetric icon={<Wind        size={12} />} value={indoorAqi.toFixed(0)}    unit=" AQI" label="Air"     color={aqiColor(indoorAqi)} />}
            {indoorCo2   !== null && <EnvMetric icon={<span style={{ fontSize: 10, fontWeight: 700 }}>CO₂</span>} value={indoorCo2.toFixed(0)} unit=" ppm" label="Carbon" color={co2Color(indoorCo2)} />}
            {indoorPm25  !== null && <EnvMetric icon={<span style={{ fontSize: 10, fontWeight: 700 }}>PM</span>} value={indoorPm25.toFixed(1)} unit=" µg" label="PM2.5" color={pm25Color(indoorPm25)} />}
          </div>
        </div>

        {/* Divider */}
        <div style={{ width: 1, background: "var(--tactus-border-subtle)", flexShrink: 0 }} />

        {/* Outdoor */}
        <div className="flex-1 p-5 flex flex-col gap-4">
          <div className="flex items-center justify-between">
            <p className="text-[10px] font-bold uppercase tracking-widest" style={{ fontFamily: "var(--tactus-font-sans)", color: "var(--tactus-border-subtle)" }}>Outdoor</p>
            <p className="text-[11px]" style={{ fontFamily: "var(--tactus-font-sans)", color: "var(--tactus-text-faint)" }}>{outdoor.condition}</p>
          </div>
          <div className="flex flex-wrap gap-x-8 gap-y-4">
            {outdoor.tempC !== null && <EnvMetric icon={<Thermometer size={12} />} value={outdoor.tempC.toFixed(1)} unit="°C" label="Temp" color={tempColor(outdoor.tempC)} />}
            <EnvMetric icon={<Droplets    size={12} />} value={outdoor.humidity.toFixed(0)}  unit="%"    label="Humidity" color={humidColor(outdoor.humidity)} />
            <EnvMetric icon={<Wind        size={12} />} value={outdoor.aqi.toFixed(0)}       unit=" AQI" label="Air"      color={aqiColor(outdoor.aqi)} />
            <EnvMetric icon={<span style={{ fontSize: 10, fontWeight: 700 }}>PM</span>}      value={outdoor.pm25.toFixed(1)} unit=" µg" label="PM2.5" color={aqiColor(outdoor.aqi)} />
          </div>
        </div>

      </div>
    </div>
  );
}
