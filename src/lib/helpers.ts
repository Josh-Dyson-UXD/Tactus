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
