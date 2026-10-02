import {test} from 'node:test';
import assert from 'node:assert/strict';
import {numeric,sensorValue,formatRange,outdoorReading} from '../src/lib/environment.ts';
const now=Date.parse('2026-09-27T12:00:00Z');
const weather={state:'clear-night',attributes:{temperature:8.5,humidity:88}};
test('missing and invalid readings never become zero',()=>{for(const value of [null,undefined,'','unknown',false,'NaN'])assert.equal(numeric(value),null);assert.equal(sensorValue({state:'unavailable'}),null);assert.equal(formatRange([null,null],'°C'),'Unavailable');assert.equal(numeric('0'),0);});
test('indoor range excludes missing sensors and keeps real zero readings',()=>{assert.equal(formatRange([17.1,null,18.9],'°C',1),'17.1–18.9°C');assert.equal(formatRange([0,null],' µg/m³'),'0 µg/m³');});
test('stale local sensor falls back to weather independently per reading',()=>{const states={'weather.forecast_home':weather,'sensor.front_door_outdoor_temperature':{state:'18.5',last_updated:'2026-09-25T00:00:00Z'},'sensor.front_door_outdoor_humidity':{state:'68',last_reported:'2026-09-27T11:00:00Z'}};assert.equal(outdoorReading(states,'temperature',now).value,8.5);assert.equal(outdoorReading(states,'humidity',now).source,'Outdoor sensor');});
test('fresh unchanged reports take precedence over older last_updated',()=>{const states={'sensor.front_door_outdoor_temperature':{state:'12',last_updated:'2026-09-25T00:00:00Z',last_reported:'2026-09-27T11:00:00Z'}};assert.equal(outdoorReading(states,'temperature',now).value,12);});
test('unavailable weather attributes are not shown as current readings',()=>{assert.equal(outdoorReading({'weather.forecast_home':{...weather,state:'unavailable'}},'humidity',now).value,null);});


test('disconnected outdoor sensor cannot appear live from retained numeric reports',()=>{
 const now=Date.now();
 const states={
  'sensor.front_door_outdoor_temperature':{state:'22',last_reported:new Date(now).toISOString(),attributes:{}},
  'binary_sensor.front_door_outdoor_connectivity':{state:'off',attributes:{}},
  'weather.forecast_home':{state:'rainy',attributes:{temperature:11.5,temperature_unit:'°C'}}
 };
 assert.equal(outdoorReading(states,'temperature',now).source,'Weather service');
 assert.equal(outdoorReading(states,'temperature',now).value,11.5);
});
