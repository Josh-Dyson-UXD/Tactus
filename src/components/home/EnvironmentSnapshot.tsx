import { useEffect, useState } from 'react';
import { House, CloudSun } from 'lucide-react';
import type { HAStateMap } from '@/lib/ha-client';
import { INDOOR_AIR_SENSORS } from '@/lib/ha-types';
import { formatRange, outdoorReading, reportedAt, sensorValue } from '@/lib/environment';

const ROOM_NAMES: Record<string,string> = { living:'Living Room',kitchen:'Kitchen',bedroom:'Bedroom',kids:'Kids Room' };
const ORDER=['living','kitchen','bedroom','kids'];
export function EnvironmentSnapshot({states}:{states:HAStateMap}) {
  const [now,setNow]=useState(Date.now);
  useEffect(()=>{const timer=setInterval(()=>setNow(Date.now()),60000);return()=>clearInterval(timer);},[]);
  const rows=ORDER.map(id=>({id,name:ROOM_NAMES[id],...Object.fromEntries(Object.entries(INDOOR_AIR_SENSORS[id]).map(([key,eid])=>[key,sensorValue(states[eid])]))})) as {id:string;name:string;temp:number|null;humidity:number|null;co2?:number|null;pm25?:number|null}[];
  const temperature=outdoorReading(states,'temperature',now), humidity=outdoorReading(states,'humidity',now);
  const pmRooms=rows.filter(r=>r.pm25!=null);
  const metric=(label:string,value:string,note?:string)=><div className="np-environment-metric"><dt>{label}</dt><dd>{value}</dd>{note && <small>{note}</small>}</div>;
  const stamp=(id:string)=>{const date=reportedAt(states[id]);return date && Number.isFinite(Date.parse(date)) ? new Date(date).toLocaleString([], {month:'short',day:'numeric',hour:'2-digit',minute:'2-digit'}) : 'No report';};
  return <section className="np-environment" aria-label="Inside and outside environment">
    <div className="np-section"><h2>Inside & outside</h2></div>
    <div className="np-environment-grid">
      <article><h3><House size={18}/> Inside</h3><dl>
        {metric('Temperature',formatRange(rows.map(r=>r.temp),'°C',1))}
        {metric('Humidity',formatRange(rows.map(r=>r.humidity),'%'))}
        {metric('CO₂',formatRange(rows.map(r=>r.co2??null),' ppm'))}
        {metric('PM2.5',formatRange(rows.map(r=>r.pm25??null),' µg/m³',1),pmRooms.map(r=>r.name).join(', ') || 'No readings')}
      </dl><p>Ranges across reporting rooms.</p></article>
      <article><h3><CloudSun size={18}/> Outside</h3><dl>
        {metric('Temperature',formatRange([temperature.value],'°C',1),temperature.source)}
        {metric('Humidity',formatRange([humidity.value],'%'),humidity.source)}
        {metric('Air quality','Not connected','No outdoor air-quality source')}
      </dl></article>
    </div>
    <details className="np-environment-details"><summary>Room readings & sources</summary>
      <div className="np-environment-rooms">{rows.map(r=><div key={r.id}><strong>{r.name}</strong><p>{formatRange([r.temp],'°C',1)} · {formatRange([r.humidity],'%')}</p>{(r.co2!=null || r.pm25!=null) && <small>{[r.co2!=null?`CO₂ ${formatRange([r.co2],' ppm')}`:'',r.pm25!=null?`PM2.5 ${formatRange([r.pm25],' µg/m³',1)}`:''].filter(Boolean).join(' · ')}</small>}</div>)}</div>
      <p>CO₂ and PM2.5 are separate readings, not a combined air-quality score. Rooms without configured sensors are not included.</p>
      {(temperature.fallback || humidity.fallback) && <p>Outdoor sensor readings are unavailable or have not reported within six hours, so weather-service readings are shown. Temperature last reported: {stamp('sensor.front_door_outdoor_temperature')}; humidity: {stamp('sensor.front_door_outdoor_humidity')}. {sensorValue(states['sensor.front_door_outdoor_battery'])!==null && `Sensor battery: ${sensorValue(states['sensor.front_door_outdoor_battery'])}%.`}</p>}
    </details>
  </section>;
}
