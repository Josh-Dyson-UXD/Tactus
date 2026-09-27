import type { CSSProperties } from 'react';

export function BrightnessSlider({ value, onChange, accent }: { value: number; onChange: (v: number) => void; accent: string }) {
  return <input type="range" className="tactus-range" aria-label="Brightness" aria-valuetext={`${value}%`}
    min={0} max={100} step={1} value={value} onChange={event => onChange(Number(event.target.value))}
    style={{ '--slider-track': `linear-gradient(to right, ${accent} ${value}%, var(--tactus-bg-track) ${value}%)`, '--slider-accent': accent } as CSSProperties} />;
}
