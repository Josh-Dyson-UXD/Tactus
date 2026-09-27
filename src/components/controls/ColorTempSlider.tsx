import type { CSSProperties } from 'react';
import { kelvinToHex } from '@/lib/helpers';

// Use the device's actual range; a native slider supports touch and keyboard.
export function ColorTempSlider({ value, min, max, onChange }: { value: number; min: number; max: number; onChange: (kelvin: number) => void }) {
  const stops = [0, .25, .5, .75, 1].map(t => kelvinToHex(Math.round(min + t * (max - min))));
  return <input type="range" className="tactus-range" aria-label="Colour temperature" aria-valuetext={`${value} kelvin`}
    min={min} max={max} step={1} value={value} disabled={max <= min} onChange={event => onChange(Number(event.target.value))}
    style={{ '--slider-track': `linear-gradient(to right, ${stops.join(', ')})`, '--slider-accent': kelvinToHex(value) } as CSSProperties} />;
}
