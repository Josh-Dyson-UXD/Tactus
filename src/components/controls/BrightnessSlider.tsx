import { useRef, useCallback, useEffect } from "react";
import { withAlpha } from "@/lib/helpers";

export function BrightnessSlider({ value, onChange, accent }: { value: number; onChange: (v: number) => void; accent: string }) {
  const trackRef = useRef<HTMLDivElement>(null);
  const dragging = useRef(false);
  const compute  = useCallback((x: number) => {
    if (!trackRef.current) return;
    const rect = trackRef.current.getBoundingClientRect();
    onChange(Math.round(Math.max(0, Math.min(1, (x - rect.left) / rect.width)) * 100));
  }, [onChange]);

  useEffect(() => {
    const mv = (e: MouseEvent | TouchEvent) => { if (dragging.current) compute("touches" in e ? e.touches[0].clientX : e.clientX); };
    const up = () => { dragging.current = false; };
    window.addEventListener("mousemove", mv); window.addEventListener("mouseup", up);
    window.addEventListener("touchmove", mv); window.addEventListener("touchend", up);
    return () => { window.removeEventListener("mousemove", mv); window.removeEventListener("mouseup", up); window.removeEventListener("touchmove", mv); window.removeEventListener("touchend", up); };
  }, [compute]);

  return (
    <div ref={trackRef} className="relative h-[12px] rounded-full w-full cursor-pointer select-none" style={{ background: "var(--tactus-bg-track)" }}
      onMouseDown={(e) => { dragging.current = true; compute(e.clientX); }}
      onTouchStart={(e) => { dragging.current = true; compute(e.touches[0].clientX); }}
      onClick={(e) => compute(e.clientX)}>
      <div className="absolute left-0 top-0 h-full rounded-full" style={{ width: `${value}%`, background: accent, boxShadow: `0 0 12px 0 ${withAlpha(accent, 0.5)}` }} />
      <div className="absolute top-1/2 -translate-y-1/2 -translate-x-1/2 size-[24px]" style={{ left: `${value}%` }}>
        <svg viewBox="0 0 32 32" fill="none" className="size-full drop-shadow-md">
          <circle cx="16" cy="16" r="12" fill="var(--tactus-text-primary)" /><circle cx="16" cy="16" r="11" stroke={accent} strokeWidth="2" />
        </svg>
      </div>
    </div>
  );
}
