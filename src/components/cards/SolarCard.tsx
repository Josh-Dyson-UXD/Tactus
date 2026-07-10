import type { SolarState } from "@/types";
import { withAlpha } from "@/lib/helpers";
import { SunIcon } from "@/components/icons";

const SOLAR_COLOR = "#F59E0B";

export function SolarCard({ solar }: { solar: SolarState }) {
  const max = Math.max(...solar.hourly, 0.1);
  const currentHour = 10;

  return (
    <div className="relative flex flex-col p-6 rounded-tactus-2xl" style={{ background: "var(--tactus-bg-raised)", border: "1px solid var(--tactus-border-default)", boxShadow: solar.status === "generating" ? `0 20px 40px 0 ${withAlpha(SOLAR_COLOR, 0.06)}` : "none" }}>
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <div className="flex items-center justify-center rounded-tactus-md size-[40px]" style={{ background: withAlpha(SOLAR_COLOR, 0.12) }}>
            <div className="size-[20px]"><SunIcon stroke={SOLAR_COLOR} size={24} /></div>
          </div>
          <div>
            <p className="text-[16px] font-semibold leading-none" style={{ fontFamily: "var(--tactus-font-sans)", color: "var(--tactus-text-primary)" }}>Solar</p>
            <p className="text-[12px] mt-1" style={{ fontFamily: "var(--tactus-font-sans)", color: "var(--tactus-text-muted)" }}>Rooftop Array · 10 kW</p>
          </div>
        </div>
        <div className="px-3 py-1 rounded-full" style={{ background: withAlpha(SOLAR_COLOR, 0.1), border: `1px solid ${withAlpha(SOLAR_COLOR, 0.25)}` }}>
          <p className="text-[11px] font-bold uppercase" style={{ fontFamily: "var(--tactus-font-sans)", color: SOLAR_COLOR }}>{solar.status === "generating" ? "Generating" : "Standby"}</p>
        </div>
      </div>

      {/* Big number */}
      <div className="mb-1">
        <p style={{ fontFamily: "var(--tactus-font-mono)", color: SOLAR_COLOR, fontSize: 52, fontWeight: 600, lineHeight: 1 }}>
          {solar.generatingKw.toFixed(1)}<span style={{ fontSize: 20, color: "var(--tactus-text-dim)" }}> kW</span>
        </p>
      </div>
      <p className="mb-6 text-[13px]" style={{ fontFamily: "var(--tactus-font-sans)", color: "var(--tactus-text-muted)" }}>Today's total: <span style={{ color: "var(--tactus-text-secondary)" }}>{solar.todayKwh.toFixed(1)} kWh</span></p>

      {/* Generation chart */}
      <div className="flex items-end gap-[3px] w-full" style={{ height: 48 }}>
        {solar.hourly.map((val, i) => (
          <div key={i} className="flex-1 rounded-sm transition-all"
            style={{ height: `${(val / max) * 100}%`, minHeight: 2, background: i === currentHour ? SOLAR_COLOR : withAlpha(SOLAR_COLOR, 0.25), boxShadow: i === currentHour ? `0 0 6px ${SOLAR_COLOR}` : "none" }} />
        ))}
      </div>
      <div className="flex justify-between mt-2">
        <p className="text-[10px]" style={{ fontFamily: "var(--tactus-font-sans)", color: "var(--tactus-text-faint)" }}>12am</p>
        <p className="text-[10px]" style={{ fontFamily: "var(--tactus-font-sans)", color: "var(--tactus-text-faint)" }}>12pm</p>
        <p className="text-[10px]" style={{ fontFamily: "var(--tactus-font-sans)", color: "var(--tactus-text-faint)" }}>11pm</p>
      </div>
    </div>
  );
}
