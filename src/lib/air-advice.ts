import type { HAEntity, HAStateMap } from './ha-client.ts';
import { numeric, reportedAt, sensorValue } from './environment.ts';
export type Point = {time:number; value:number|null};
export type AirHistory = Record<string,Point[]>;
export type AirConfig = {temp:string;humidity:string;co2?:string;pm25?:string};
export type AirNotice = {kind:'humidity'|'co2'|'sensor';level:'watch'|'attention'|'unknown';title:string;detail:string};
export const HOUR = 3600000;
export function parseAirHistory(raw:unknown):AirHistory {
  if (!raw || typeof raw!=='object' || Array.isArray(raw)) return {};
  return Object.fromEntries(Object.entries(raw).map(([id,rows])=>[id,Array.isArray(rows)?rows.map(row=>({time: typeof row.lu==='number'?row.lu*1000:Date.parse(row.last_updated || row.last_changed),value:numeric(row.s ?? row.state)})).filter(p=>Number.isFinite(p.time)).sort((a,b)=>a.time-b.time):[]]));
}
export function freshValue(entity:HAEntity|undefined,now:number) {
  const time=Date.parse(reportedAt(entity)||'');
  return Number.isFinite(time) && time<=now && now-time<6*HOUR ? sensorValue(entity):null;
}
// Magnus approximation; compare dew points, not relative humidity percentages.
export function dewPoint(temp:number|null, humidity:number|null) {
  if(temp===null || humidity===null || humidity<=0 || humidity>100 || temp<=-100 || temp>100) return null;
  const gamma=Math.log(humidity/100)+17.62*temp/(243.12+temp);
  return 243.12*gamma/(17.62-gamma);
}
export function moistureAdvice(states:HAStateMap,cfg:AirConfig,now:number) {
  const indoor=dewPoint(freshValue(states[cfg.temp],now),freshValue(states[cfg.humidity],now));
  const outdoor=dewPoint(freshValue(states['sensor.front_door_outdoor_weather_temperature'],now),freshValue(states['sensor.front_door_outdoor_weather_humidity'],now));
  if(indoor===null || outdoor===null) return 'Outside moisture comparison is unavailable.';
  if(outdoor<indoor-1) return 'Outside air is drier and may help reduce indoor moisture.';
  if(outdoor>indoor+1) return 'Outside air contains more moisture; airing may increase indoor humidity.';
  return 'Inside and outside moisture levels are similar; airing may have little drying effect.';
}
export function sustainedMinutes(points:Point[],threshold:number,current:number|null,now:number) {
  if(current===null || current<=threshold) return 0;
  const rows=points.filter(p=>p.time<=now);
  if(!rows.length || rows.at(-1)!.value===null || rows.at(-1)!.value!<=threshold) return 0;
  let since=rows.at(-1)!.time;
  for(let i=rows.length-2;i>=0;i--) {if(rows[i].value===null || rows[i].value!<=threshold) break; since=rows[i].time;}
  return Math.max(0,(now-since)/60000);
}
export function roomAirNotices(states:HAStateMap,cfg:AirConfig,history:AirHistory,now:number,connected:boolean):AirNotice[] {
  if(!connected) return [{kind:'sensor',level:'unknown',title:'Readings need a connection',detail:'Reconnect before relying on room advice.'}];
  const notices:AirNotice[]=[];
  const missing=Object.entries(cfg).filter(([,id])=>freshValue(states[id],now)===null).map(([kind])=>({temp:'temperature',humidity:'humidity',co2:'CO₂',pm25:'particles'}[kind]));
  if(missing.length) notices.push({kind:'sensor',level:'unknown',title:'Some readings are unavailable',detail:`No recent ${missing.join(', ')} reading. Advice uses only recent measurements.`});
  const moisture=moistureAdvice(states,cfg,now);
  const co2=cfg.co2?freshValue(states[cfg.co2],now):null;
  const co2Minutes=cfg.co2?sustainedMinutes(history[cfg.co2]||[],1000,co2,now):0;
  if(co2Minutes>=20) notices.push({kind:'co2',level:co2!==null && co2>1500 && sustainedMinutes(history[cfg.co2!]||[],1500,co2,now)>=20?'attention':'watch',title:'Fresh air would help',detail:`CO₂ has stayed above 1,000 ppm for ${duration(co2Minutes)}. Consider airing between calls or activities, when outdoor air quality allows. ${moisture}`});
  const humidity=freshValue(states[cfg.humidity],now);
  const humidMinutes=sustainedMinutes(history[cfg.humidity]||[],60,humidity,now);
  if(humidMinutes>=120) notices.push({kind:'humidity',level:humidity!==null && humidity>=70?'attention':'watch',title:'Humidity has stayed high',detail:`Above 60% for ${duration(humidMinutes)}. ${moisture} If this keeps recurring, check for condensation or damp patches; humidity alone does not identify a leak.`});
  return notices;
}
export function duration(minutes:number) {return minutes<60?`${Math.floor(minutes)} minutes`:`${Math.floor(minutes/60)} hour${minutes>=120?'s':''}`;}
