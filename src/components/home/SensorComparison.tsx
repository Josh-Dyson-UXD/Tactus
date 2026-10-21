import type {HAStateMap} from '@/lib/ha-client';
import {BEDROOM_COMPARISON,formatRange,sensorValue} from '@/lib/environment';
export function SensorComparison({states}:{states:HAStateMap}) {
  return <section className="np-sensor-comparison"><h3>Bedroom sensor comparison</h3><div>{[{name:'Netatmo',temp:'sensor.bedroom_bedroom_temperature',humidity:'sensor.bedroom_bedroom_humidity'},{name:'IKEA',...BEDROOM_COMPARISON}].map(s=><div key={s.name}><strong>{s.name}</strong><p>{formatRange([sensorValue(states[s.temp])],'°C',1)} · {formatRange([sensorValue(states[s.humidity])],'%')}</p></div>)}</div><p className="np-caption">Netatmo remains the source for Bedroom summaries and advice. IKEA readings are shown separately while you compare.</p></section>;
}
