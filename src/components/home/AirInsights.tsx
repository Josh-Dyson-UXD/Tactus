import type {AirConfig,AirHistory,AirNotice,Point} from '@/lib/air-advice';
import {HOUR,moistureAdvice} from '@/lib/air-advice';
import type {HAStateMap} from '@/lib/ha-client';
export function AirWarnings({notices}:{notices:AirNotice[]}) {
  return <div className="np-air-warnings">{notices.map(n=><article className={`np-air-notice np-air-${n.level}`} key={n.kind}><strong>{n.title}</strong><p>{n.detail}</p></article>)}</div>;
}
function Trend({points,label,unit,end}:{points:Point[];label:string;unit:string;end:number}) {
  const start=end-24*HOUR;
  const rows=points.filter(p=>p.time<=end);
  const valid=rows.filter(p=>p.value!==null);
  if(!valid.length) return <div className="np-air-trend"><h3>{label}</h3><p>No recorded readings in this period.</p></div>;
  const low=Math.min(...valid.map(p=>p.value!)), high=Math.max(...valid.map(p=>p.value!));
  const y=(v:number)=>62-(v-low)/Math.max(high-low,1)*50;
  const x=(time:number)=>Math.max(0,Math.min(300,(time-start)/(24*HOUR)*300));
  // Step lines preserve HA's state intervals; unavailable intervals are gaps.
  const paths=rows.flatMap((p,i)=>{if(p.value===null)return [];const next=rows[i+1];const until=next?.time??end;return [`M ${x(p.time)} ${y(p.value)} H ${x(until)}${next?.value!=null?` V ${y(next.value)}`:''}`];});
  const format=(n:number)=>n.toLocaleString([],{maximumFractionDigits:1});
  return <div className="np-air-trend"><h3>{label}<small>{format(low)}–{format(high)}{unit}</small></h3><svg viewBox="0 0 300 75" role="img" aria-label={`${label} over the last 24 hours, range ${format(low)} to ${format(high)} ${unit}. Missing readings are gaps.`}><path d={paths.join(' ')} fill="none" stroke="currentColor" strokeWidth="2"/></svg><div className="np-air-axis"><span>{'Yesterday ' + new Date(start).toLocaleTimeString([],{hour:'numeric',minute:'2-digit'})}</span><span>{'Today ' + new Date(end).toLocaleTimeString([],{hour:'numeric',minute:'2-digit'})}</span></div></div>;
}
export function AirInsights({cfg,history,error,loading,end,retry,states,now,connected}:{cfg:AirConfig;history:AirHistory;error:string;loading:boolean;end:number;retry:()=>void;states:HAStateMap;now:number;connected:boolean}) {
  return <section className="np-air-insights"><h2>Room air over 24 hours</h2><p className="np-caption">{connected ? moistureAdvice(states,cfg,now) : 'Reconnect for current room advice.'} Outdoor air quality is not monitored here.</p>{loading && <p className="np-caption" role="status">Updating room history…</p>}{error && <div className="np-panel"><p>{error}</p><button className="np-text" disabled={!connected} onClick={retry}>Try again</button></div>}{!error && <div className="np-air-trends">{Object.entries(cfg).map(([key,id])=><Trend key={id} points={history[id]||[]} label={({temp:'Temperature',humidity:'Humidity',co2:'CO₂',pm25:'Particles (PM2.5)'} as Record<string,string>)[key]} unit={({temp:'°C',humidity:'%',co2:' ppm',pm25:' µg/m³'} as Record<string,string>)[key]} end={end}/>)}</div>}<details className="np-air-rules"><summary>How room advice works</summary><p>CO₂ above 1,000 ppm for 20 minutes prompts ventilation advice; above 1,500 ppm for 20 minutes gets stronger emphasis. Humidity above 60% for two hours prompts moisture advice. These are advisory settings, not a complete assessment of air quality. Readings must have reported within six hours. Missing history cannot establish persistence.</p><p>Drying advice compares indoor and Front Door dew points, allowing a 1°C margin. Room readings do not measure wall moisture or establish a leak. Charts show recorded HA states; gaps mean unavailable readings.</p><p><a href="https://www.hse.gov.uk/ventilation/using-co2-monitors.htm" target="_blank" rel="noreferrer">Ventilation guidance</a> · <a href="https://www.epa.gov/mold/brief-guide-mold-moisture-and-your-home" target="_blank" rel="noreferrer">Humidity guidance</a></p></details></section>;
}
