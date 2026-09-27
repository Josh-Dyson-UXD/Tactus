import {test} from 'node:test';
import assert from 'node:assert/strict';
import {commandFor,confirms} from '../src/lib/home-control.ts';
const entity=(id,state='off',attributes={})=>({entity_id:id,state,attributes,last_updated:'2026-09-27T00:00:00Z',last_changed:'2026-09-27T00:00:00Z'});
test('brightness sends a light command and expects the requested state',()=>{
 const c=commandFor({id:'light.lamp',attributes:{brightness:153}},entity('light.lamp'));
 assert.equal(c.service,'turn_on');assert.deepEqual(c.data,{brightness:153});
 assert.equal(confirms(entity('light.lamp','off',{brightness:153}),c.expected),false);
 assert.equal(confirms(entity('light.lamp','on',{brightness:10}),c.expected),false);
 assert.equal(confirms(entity('light.lamp','on',{brightness:154}),c.expected),true);
});
test('climate commands use correct HA services',()=>{
 const e=entity('climate.room');
 assert.equal(commandFor({id:e.entity_id,state:'heat'},e).service,'set_hvac_mode');
 assert.deepEqual(commandFor({id:e.entity_id,attributes:{temperature:21}},e).data,{temperature:21});
 assert.equal(commandFor({id:e.entity_id,attributes:{fan_mode:'low'}},e).service,'set_fan_mode');
});
test('vehicle cover does not invent unsupported closing',()=>{
 const e=entity('cover.ghost_frunk','closed',{supported_features:1});
 assert.equal(commandFor({id:e.entity_id,state:'open'},e).service,'open_cover');
 assert.throws(()=>commandFor({id:e.entity_id,state:'closed'},e),/does not support/);
});
test('unavailable and unsupported devices cannot be operated',()=>{
 assert.throws(()=>commandFor({id:'light.lamp',state:'on'},entity('light.lamp','unavailable')),/unavailable/);
 assert.throws(()=>commandFor({id:'sensor.temp',state:'on'},entity('sensor.temp','20')),/not supported/);
});
test('select, number and lock route to their domain services',()=>{
 for(const [id,state,service,data] of [['select.seat','low','select_option',{option:'low'}],['number.limit','80','set_value',{value:80}],['lock.car','unlocked','unlock',{}]]) {
  const c=commandFor({id,state},entity(id));assert.equal(c.service,service);assert.deepEqual(c.data,data);
 }
});
test('acknowledged colour changes do not falsely claim transformed RGB confirmation',()=>{
 const c=commandFor({id:'light.rgb',attributes:{rgb_color:[255,120,0]}},entity('light.rgb'));
 assert.equal(c.expected,undefined);assert.deepEqual(c.data,{rgb_color:[255,120,0]});
});
test('unknown numeric values cannot count as confirmed',()=>{
 assert.equal(confirms(entity('climate.room','heat',{temperature:null}),{id:'climate.room',attributes:{temperature:0}}),false);
 assert.equal(confirms(entity('number.limit','80.0'),{id:'number.limit',state:'80'}),true);
});
