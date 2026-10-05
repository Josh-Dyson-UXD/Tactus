import {test} from 'node:test';
import assert from 'node:assert/strict';
import {parseAirHistory,dewPoint,moistureAdvice,roomAirNotices,HOUR,sustainedMinutes} from '../src/lib/air-advice.ts';
const now=Date.parse('2026-10-05T04:00:00Z');
const cfg={temp:'sensor.temp',humidity:'sensor.humidity',co2:'sensor.co2'};
const entity=value=>({state:String(value),last_reported:new Date(now-60000).toISOString(),attributes:{}});
const states={ 'sensor.temp':entity(20),'sensor.humidity':entity(65),'sensor.co2':entity(1600),'sensor.front_door_outdoor_weather_temperature':entity(10),'sensor.front_door_outdoor_weather_humidity':entity(90)};
const history={'sensor.humidity':[{time:now-3*HOUR,value:65}],'sensor.co2':[{time:now-HOUR,value:1600}]};
test('cool high-RH outside air can still be drier; warm outside air can add moisture',()=>{
 assert.ok(dewPoint(10,90)<dewPoint(20,65));assert.match(moistureAdvice(states,cfg,now),/drier/);
 assert.match(moistureAdvice({...states,'sensor.front_door_outdoor_weather_temperature':entity(25)},cfg,now),/more moisture/);
 assert.equal(dewPoint(10,0),null);assert.equal(dewPoint(10,101),null);
});
test('persistence uses history and unknown intervals reset the duration',()=>{
 assert.equal(sustainedMinutes([],60,70,now),0);
 assert.equal(sustainedMinutes([{time:now-3*HOUR,value:70},{time:now-10*60000,value:null},{time:now-5*60000,value:70}],60,70,now),5);
 assert.equal(sustainedMinutes(history['sensor.humidity'],60,50,now),0);
});
test('sustained CO2 and humidity warn together with moisture context',()=>{
 const notices=roomAirNotices(states,cfg,history,now,true);
 assert.equal(notices.length,2);assert.equal(notices[0].level,'attention');assert.match(notices[0].detail,/drier/);assert.match(notices[1].detail,/3 hours/);
});
test('brief spikes, absent history, stale values and disconnect cannot invent persistent advice',()=>{
 assert.deepEqual(roomAirNotices(states,cfg,{},now,true),[]);
 const stale=Object.fromEntries(Object.entries(states).map(([id,e])=>[id,{...e,last_reported:new Date(now-7*HOUR).toISOString()}]));
 assert.equal(roomAirNotices(stale,cfg,history,now,true).length,1);assert.equal(roomAirNotices(stale,cfg,history,now,true)[0].kind,'sensor');
 assert.equal(roomAirNotices(states,cfg,history,now,false)[0].level,'unknown');
});
test('history normalises compact HA rows and preserves unknown gaps and real zero',()=>{
 const parsed=parseAirHistory({'sensor.test':[{s:'0',lu:now/1000},{s:'unavailable',lu:(now-10)/1000}]});
 assert.deepEqual(parsed['sensor.test'],[{time:now-10,value:null},{time:now,value:0}]);
});
