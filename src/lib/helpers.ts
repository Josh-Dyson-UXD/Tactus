import type { LightState } from "@/types";

export function withAlpha(hex: string, alpha: number) {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return `rgba(${r},${g},${b},${alpha})`;
}

export function dominantColor(lights: LightState[]): string {
  const on = lights.filter((l) => l.cardState === "on");
  if (!on.length) return "#242936";
  const freq: Record<string, number> = {};
  on.forEach((l) => { freq[l.selectedColor.hex] = (freq[l.selectedColor.hex] ?? 0) + 1; });
  return Object.entries(freq).sort((a, b) => b[1] - a[1])[0][0];
}

export function aqiLabel(aqi: number) {
  if (aqi <= 50)  return { label: "Good",      color: "#22C55E" };
  if (aqi <= 100) return { label: "Moderate",  color: "#F59E0B" };
  if (aqi <= 150) return { label: "Unhealthy", color: "#FB7185" };
  return               { label: "Hazardous",   color: "#EF4444" };
}

export function humidLabel(h: number) {
  if (h < 30) return { label: "Dry",         color: "#F59E0B" };
  if (h < 60) return { label: "Comfortable", color: "#22C55E" };
  return              { label: "Humid",       color: "#3B82F6" };
}

// Blackbody-radiation approximation (Tanner Helland's algorithm) — converts a
// colour temperature in Kelvin to the RGB a human eye perceives it as. Used
// to render colour-temp-only lights' real min/max_color_temp_kelvin range as
// an actual warm-to-cool gradient, and to preview a light's current kelvin
// value as a swatch. Like the COLORS array and withAlpha(), this is a
// physical-colour computation, not a design token.
export function kelvinToRgb(kelvin: number): [number, number, number] {
  const temp = kelvin / 100;
  const clamp = (x: number) => Math.max(0, Math.min(255, Math.round(x)));

  const r = temp <= 66 ? 255 : 329.698727446 * Math.pow(temp - 60, -0.1332047592);
  const g = temp <= 66
    ? 99.4708025861 * Math.log(temp) - 161.1195681661
    : 288.1221695283 * Math.pow(temp - 60, -0.0755148492);
  const b = temp >= 66 ? 255 : temp <= 19 ? 0 : 138.5177312231 * Math.log(temp - 10) - 305.0447927307;

  return [clamp(r), clamp(g), clamp(b)];
}

export function kelvinToHex(kelvin: number): string {
  const [r, g, b] = kelvinToRgb(kelvin);
  return `#${[r, g, b].map((c) => c.toString(16).padStart(2, "0")).join("")}`;
}
