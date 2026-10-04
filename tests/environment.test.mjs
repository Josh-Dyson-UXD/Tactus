import {test} from 'node:test';
import assert from 'node:assert/strict';
import {numeric,sensorValue,formatRange,outdoorReading} from '../src/lib/environment.ts';
const now=Date.parse('2026-09-27T12:00:00Z');
const weather={state:'clear-night',attributes:{temperature:8.5,humidity:88}};
test('missing and invalid readings never become zero',()=>{for(const value of [null,undefined,'','unknown',false,'NaN'])assert.equal(numeric(value),null);assert.equal(sensorValue({state:'unavailable'}),null);assert.equal(formatRange([null,null],'°C'),'Unavailable');assert.equal(numeric('0'),0);});
test('indoor range excludes missing sensors and keeps real zero readings',()=>{assert.equal(formatRange([17.1,null,18.9],'°C',1),'17.1–18.9°C');assert.equal(formatRange([0,null],' µg/m³'),'0 µg/m³');});
test('stale local sensor falls back to weather independently per reading',()=>{const states={'weather.forecast_home':weather,'sensor.front_door_outdoor_weather_temperature':{state:'18.5',last_updated:'2026-09-25T00:00:00Z'},'sensor.front_door_outdoor_weather_humidity':{state:'68',last_reported:'2026-09-27T11:00:00Z'}};assert.equal(outdoorReading(states,'temperature',now).value,8.5);assert.equal(outdoorReading(states,'humidity',now).source,'Front Door sensor');});
test('fresh unchanged reports take precedence over older last_updated',()=>{const states={'sensor.front_door_outdoor_weather_temperature':{state:'12',last_updated:'2026-09-25T00:00:00Z',last_reported:'2026-09-27T11:00:00Z'}};assert.equal(outdoorReading(states,'temperature',now).value,12);});
test('unavailable weather attributes are not shown as current readings',()=>{assert.equal(outdoorReading({'weather.forecast_home':{...weather,state:'unavailable'}},'humidity',now).value,null);});


test('old outdoor connectivity cannot block the replacement Timmerflote sensor',()=>{
 const states={
  'sensor.front_door_outdoor_weather_temperature':{state:'11.0100002288818',last_reported:new Date(now-60000).toISOString()},
  'binary_sensor.front_door_outdoor_connectivity':{state:'off'},
  'weather.forecast_home':weather
 };
 const reading=outdoorReading(states,'temperature',now);
 assert.equal(reading.source,'Front Door sensor');
 assert.equal(reading.value,11.0100002288818);
 assert.equal(formatRange([reading.value],'°C',1),'11°C');
});
test('Timmerflote humidity can fall back without replacing a valid temperature',()=>{
 const states={
  'sensor.front_door_outdoor_weather_temperature':{state:'0',last_reported:new Date(now-60000).toISOString()},
  'sensor.front_door_outdoor_weather_humidity':{state:'unavailable',last_reported:new Date(now-60000).toISOString()},
  'weather.forecast_home':weather
 };
 assert.equal(outdoorReading(states,'temperature',now).value,0);
 assert.equal(outdoorReading(states,'humidity',now).value,88);
 assert.equal(outdoorReading(states,'humidity',now).source,'Weather service');
});
