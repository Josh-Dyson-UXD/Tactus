import type { HAEntity, HAStateMap } from './ha-client.ts';
export function numeric(value: unknown): number | null {
  if (value == null || typeof value === 'boolean' || (typeof value === 'string' && !value.trim())) return null;
  const n = Number(value); return Number.isFinite(n) ? n : null;
}
export function sensorValue(entity?: HAEntity): number | null {
  return !entity || ['unavailable','unknown'].includes(entity.state) ? null : numeric(entity.state);
}
export function formatRange(values: (number | null)[], unit: string, digits = 0) {
  const valid = values.filter((v): v is number => v !== null && Number.isFinite(v));
  if (!valid.length) return 'Unavailable';
  const format = (v:number) => v.toLocaleString([], {maximumFractionDigits:digits});
  const low=format(Math.min(...valid)), high=format(Math.max(...valid));
  return `${low === high ? low : `${low}–${high}`}${unit}`;
}
export function reportedAt(entity?: HAEntity) {
  return entity?.last_reported || entity?.last_updated;
}
export function outdoorReading(states: HAStateMap, kind: 'temperature'|'humidity', now=Date.now()) {
  const local=states[`sensor.front_door_outdoor_${kind}`];
  const value=sensorValue(local);
  const timestamp=Date.parse(reportedAt(local)||'');
  // A recent report, not just a retained numeric value, is required for the
  // battery outdoor sensor. last_updated alone can predate unchanged reports.
  const disconnected = states['binary_sensor.front_door_outdoor_connectivity']?.state === 'off';
  if(!disconnected && value!==null && Number.isFinite(timestamp) && now-timestamp>=0 && now-timestamp<6*60*60*1000) return {value,source:'Outdoor sensor',fallback:false};
  const weather=states['weather.forecast_home'];
  const weatherValue=weather && !['unavailable','unknown'].includes(weather.state) ? numeric(weather.attributes[kind]) : null;
  const converted=kind==='temperature' && weather?.attributes.temperature_unit==='°F' && weatherValue!==null ? (weatherValue-32)*5/9 : weatherValue;
  return {value:converted,source:'Weather service',fallback:!!local};
}
