import { useEffect, useState } from 'react';
import { CloudSun, Droplets, Wind } from 'lucide-react';
import type { HAStateMap } from '@/lib/ha-client';
import { INDOOR_AIR_SENSORS, mapHAStatesToRooms } from '@/lib/ha-types';
import { compareRooms } from '@/lib/room-order';
import { formatRange, numeric, outdoorReading } from '@/lib/environment';
import { conditionLabel, forecastTypes, type ForecastDay, type ForecastType } from '@/lib/forecast';

type Props = {kind:'inside'|'outside'; states:HAStateMap; connected:boolean; getForecast:(type:ForecastType)=>Promise<ForecastDay[]>};
const metric = (label:string,value:string) => <div key={label}><dt>{label}</dt><dd>{value}</dd></div>;
export function EnvironmentDetail({kind,states,connected,getForecast}:Props) {
  const weather=states['weather.forecast_home'];
  const features=Number(weather?.attributes.supported_features || 0);
  const types=forecastTypes(features);
  const [selection,setSelection]=useState<ForecastType>('daily');
  const type=types.includes(selection)?selection:types[0];
  const [forecast,setForecast]=useState<ForecastDay[]>([]);
  const [loading,setLoading]=useState(false);
  const [error,setError]=useState('');
  const [retry,setRetry]=useState(0);
  const [now,setNow]=useState(Date.now);
  useEffect(()=>{const timer=setInterval(()=>setNow(Date.now()),60000);return()=>clearInterval(timer);},[]);
  useEffect(()=>{
    if(kind!=='outside' || !type) return;
    let active=true;
    setForecast([]);setError('');
    if(!connected) {setLoading(false);setError('Reconnect to load the forecast.');return;}
    setLoading(true);
    getForecast(type).then(rows=>{if(active)setForecast(rows);}).catch(e=>{if(active)setError(e.message);}).finally(()=>{if(active)setLoading(false);});
    return()=>{active=false;};
  },[kind,type,connected,getForecast,retry]);
  const temperature=outdoorReading(states,'temperature',now), humidity=outdoorReading(states,'humidity',now);
  const a=weather?.attributes || {};
  const weatherAvailable=weather && !['unavailable','unknown'].includes(weather.state);
  const weatherNumber=(key:string)=>weatherAvailable?numeric(a[key]):null;
  const units={temperature:String(a.temperature_unit || '°C'),wind:String(a.wind_speed_unit || 'km/h'),rain:String(a.precipitation_unit || 'mm')};
  return <section className="np-environment-detail">
    <header className="np-heading"><span>{kind==='inside'?'ROOM BY ROOM':'WEATHER & FORECAST'}</span><h1>{kind==='inside'?'Inside your home.':'A look outside.'}</h1><p>{kind==='inside'?'Temperature, humidity and air quality across your rooms.':weatherAvailable?conditionLabel(weather.state):'Current conditions unavailable'}</p></header>
    {kind==='inside' ? <div className="np-indoor-grid">{mapHAStatesToRooms(states).sort(compareRooms).filter(r=>r.id!=='front').map(room=>{
      const cfg=INDOOR_AIR_SENSORS[room.id];
      return <article className="np-condition-room" key={room.id}><h2>{room.name}</h2>{cfg ? <dl>{Object.entries(cfg).map(([key,id])=>{
        const entity=states[id];const value=entity && !['unavailable','unknown'].includes(entity.state)?numeric(entity.state):null;
        return metric(({temp:'Temperature',humidity:'Humidity',co2:'CO₂',pm25:'PM2.5'} as Record<string,string>)[key],formatRange([value],({temp:'°C',humidity:'%',co2:' ppm',pm25:' µg/m³'} as Record<string,string>)[key],key==='temp'||key==='pm25'?1:0));
      })}</dl>:<p>No room sensor set up</p>}</article>;
    })}<p className="np-caption">CO₂ and PM2.5 measure different aspects of air quality. Unavailable readings are not included in the home summary.</p></div> : <>
      <div className="np-weather-current"><CloudSun size={30}/><strong>{formatRange([temperature.value],'°C',1)}</strong><p>{temperature.source}</p><dl>{metric('Humidity',formatRange([humidity.value],'%'))}{metric('Wind',formatRange([weatherNumber('wind_speed')],` ${units.wind}`,1))}{metric('UV index',formatRange([weatherNumber('uv_index')],'',1))}{metric('Pressure',formatRange([weatherNumber('pressure')],` ${String(a.pressure_unit || 'hPa')}`,1))}</dl><p>Humidity: {humidity.source}. Wind, UV and pressure: weather service.</p></div>
      <div className="np-section"><h2>Forecast</h2>{types.length>1 && <div className="np-forecast-tabs" aria-label="Forecast period">{types.map(t=><button key={t} aria-pressed={type===t} onClick={()=>setSelection(t)}>{t==='hourly'?'Hourly':t==='daily'?'Daily':'Day / night'}</button>)}</div>}</div>
      {loading && <p role="status" className="np-caption">Loading forecast…</p>}
      {error && <div className="np-panel"><p role="status">{error}</p><button className="np-text" disabled={!connected} onClick={()=>setRetry(n=>n+1)}>Try again</button></div>}
      {!type && <p className="np-caption">This weather service does not provide a forecast.</p>}
      {!loading && !error && type && !forecast.length && <p className="np-caption">No forecast available yet.</p>}
      <div className="np-forecast-list">{forecast.slice(0,type==='hourly'?24:10).map((row,index)=><article className="np-forecast-row" key={`${row.datetime}-${index}`}>
        <div className="np-forecast-summary"><div><h3>{new Date(row.datetime).toLocaleString([],type==='hourly'?{weekday:'short',hour:'numeric',minute:'2-digit'}:{weekday:'long',month:'short',day:'numeric',...(type==='twice_daily'?{hour:'numeric' as const}:{})})}</h3><p>{row.condition}</p></div><strong>{formatRange([row.temperature],units.temperature,1)}{row.templow!==null && <small>Low {formatRange([row.templow],units.temperature,1)}</small>}</strong></div>
        <div className="np-forecast-meta">{row.precipitation_probability!==null && <span><Droplets size={14}/>{row.precipitation_probability}% chance of rain</span>}{row.precipitation!==null && <span>{row.precipitation} {units.rain} rain</span>}{row.wind_speed!==null && <span><Wind size={14}/>{row.wind_speed} {units.wind}</span>}{row.humidity!==null && <span>{row.humidity}% humidity</span>}</div>
      </article>)}</div>
      {typeof a.attribution==='string' && <p className="np-caption">{a.attribution}</p>}
    </>}
  </section>;
}
