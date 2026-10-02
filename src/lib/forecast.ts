import { numeric } from './environment.ts';
export type ForecastType = 'daily' | 'hourly' | 'twice_daily';
export type ForecastDay = { datetime: string; condition: string; temperature: number | null; templow: number | null; precipitation: number | null; precipitation_probability: number | null; humidity: number | null; wind_speed: number | null };
export function conditionLabel(value: string) {
  return ({partlycloudy:'Partly cloudy', 'clear-night':'Clear night', 'lightning-rainy':'Thunderstorms', 'snowy-rainy':'Rain and snow'} as Record<string,string>)[value] || value.replaceAll('-', ' ').replaceAll('_', ' ');
}
export function parseForecast(result: unknown, entityId: string): ForecastDay[] {
  const raw = (result as {response?: Record<string, {forecast?: unknown}>})?.response?.[entityId]?.forecast;
  if (!Array.isArray(raw)) throw new Error('The weather service did not return a forecast.');
  return raw.filter(row => row && typeof row.datetime === 'string' && Number.isFinite(Date.parse(row.datetime))).map(row => ({
    datetime: row.datetime, condition: typeof row.condition === 'string' ? conditionLabel(row.condition) : 'Conditions unavailable',
    temperature: numeric(row.temperature), templow: numeric(row.templow), precipitation: numeric(row.precipitation), precipitation_probability: numeric(row.precipitation_probability), humidity: numeric(row.humidity), wind_speed: numeric(row.wind_speed),
  })).sort((a,b) => Date.parse(a.datetime)-Date.parse(b.datetime));
}
export function forecastTypes(features: number): ForecastType[] {
  return ([['daily',1],['hourly',2],['twice_daily',4]] as const).filter(([,flag])=>features & flag).map(([type])=>type);
}
