import { useRef, useCallback, useEffect } from "react";
import { kelvinToHex } from "@/lib/helpers";

// Warm-to-cool tone picker for colour-temp-only lights (attributes.
// supported_color_modes === ["color_temp"]). The gradient is built from the
// device's own real min/max_color_temp_kelvin range, not a fixed palette —
// same physical-colour exception as the COLORS array / withAlpha().
export function ColorTempSlider({ value, min, max, onChange }: { value: number; min: number; max: number; onChange: (kelvin: number) => void }) {
  const trackRef = useRef<HTMLDivElement>(null);
  const dragging = useRef(false);
  const compute  = useCallback((x: number) => {
    if (!trackRef.current) return;
    const rect = trackRef.current.getBoundingClientRect();
    const pct = Math.max(0, Math.min(1, (x - rect.left) / rect.width));
    onChange(Math.round(min + pct * (max - min)));
  }, [onChange, min, max]);

  useEffect(() => {
    const mv = (e: MouseEvent | TouchEvent) => { if (dragging.current) compute("touches" in e ? e.touches[0].clientX : e.clientX); };
    const up = () => { dragging.current = false; };
    window.addEventListener("mousemove", mv); window.addEventListener("mouseup", up);
    window.addEventListener("touchmove", mv); window.addEventListener("touchend", up);
    return () => { window.removeEventListener("mousemove", mv); window.removeEventListener("mouseup", up); window.removeEventListener("touchmove", mv); window.removeEventListener("touchend", up); };
  }, [compute]);

  const pct = max > min ? Math.max(0, Math.min(1, (value - min) / (max - min))) * 100 : 0;
  const stops = [0, 0.25, 0.5, 0.75, 1].map((t) => kelvinToHex(Math.round(min + t * (max - min))));
  const gradient = `linear-gradient(to right, ${stops.join(", ")})`;

  return (
    <div ref={trackRef} className="relative h-[12px] rounded-full w-full cursor-pointer select-none" style={{ background: gradient }}
      onMouseDown={(e) => { dragging.current = true; compute(e.clientX); }}
      onTouchStart={(e) => { dragging.current = true; compute(e.touches[0].clientX); }}
      onClick={(e) => compute(e.clientX)}>
      <div className="absolute top-1/2 -translate-y-1/2 -translate-x-1/2 size-[24px]" style={{ left: `${pct}%` }}>
        <svg viewBox="0 0 32 32" fill="none" className="size-full drop-shadow-md">
          <circle cx="16" cy="16" r="12" fill="var(--tactus-text-primary)" /><circle cx="16" cy="16" r="11" stroke="var(--tactus-bg-base)" strokeWidth="2" />
        </svg>
      </div>
    </div>
  );
}
