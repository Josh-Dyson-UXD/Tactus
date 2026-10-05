import { test } from 'node:test';
import assert from 'node:assert/strict';
import { HAClient, mergeStates } from '../src/lib/ha-client.ts';

function setup(t) {
  const sockets = [];
  class FakeSocket {
    static OPEN = 1;
    readyState = 1;
    sent = [];
    constructor(url) { this.url = url; sockets.push(this); }
    send(frame) { this.sent.push(JSON.parse(frame)); }
    close() { this.readyState = 3; }
    message(data) { this.onmessage?.({ data: JSON.stringify(data) }); }
  }
  t.mock.property(globalThis, 'WebSocket', FakeSocket);
  t.mock.timers.enable({ apis: ['setTimeout'] });
  const client = new HAClient({ url: 'http://tactus.test' });
  t.after(() => client.disconnect());
  return { client, sockets };
}

test('intentional disconnect does not reconnect after its delayed close event', t => {
  const { client, sockets } = setup(t);
  client.connect();
  client.disconnect();
  sockets[0].onclose();
  t.mock.timers.tick(3000);
  assert.equal(sockets.length, 1);
});

test('resume replaces a suspended socket and ignores its late events', t => {
  const { client, sockets } = setup(t);
  const connections = [];
  const updates = [];
  client.onConnectionChange(value => connections.push(value));
  client.onStateChanged(id => updates.push(id));
  client.connect();
  sockets[0].message({ type: 'auth_ok' });
  client.reconnect();
  sockets[0].onclose();
  sockets[0].message({ type: 'auth_ok' });
  sockets[0].message({ type: 'event', event: { event_type: 'state_changed', data: { entity_id: 'light.old', new_state: {} } } });
  sockets[1].message({ type: 'auth_ok' });
  t.mock.timers.tick(3000);
  assert.equal(sockets.length, 2);
  assert.deepEqual(connections, [true, false, true]);
  assert.deepEqual(updates, []);
  assert.equal(sockets[1].sent[0].event_type, 'state_changed');
});

test('retry cancels a pending reconnect and does not create a third socket', t => {
  const { client, sockets } = setup(t);
  client.connect();
  sockets[0].onclose();
  client.reconnect();
  t.mock.timers.tick(3000);
  assert.equal(sockets.length, 2);
});

test('unexpected drop automatically reconnects', t => {
  const { client, sockets } = setup(t);
  client.connect();
  sockets[0].onclose();
  t.mock.timers.tick(3000);
  assert.equal(sockets.length, 2);
});

test('refresh cannot overwrite a newer device update', () => {
  const recent = { entity_id: 'light.ceiling', state: 'on', attributes: {}, last_updated: '2026-09-27T10:00:01Z' };
  const old = { ...recent, state: 'off', last_updated: '2026-09-27T10:00:00Z' };
  assert.equal(mergeStates({ [recent.entity_id]: recent }, { [old.entity_id]: old })[recent.entity_id].state, 'on');
});

test('service calls require authenticated connection', async t => {
  const {client} = setup(t);
  await assert.rejects(client.requestService('light','turn_on'), /disconnected/);
  client.connect();
  await assert.rejects(client.requestService('light','turn_on'), /disconnected/);
});

test('service resolves only for its matching successful acknowledgement', async t => {
  const {client,sockets} = setup(t); client.connect(); sockets[0].message({type:'auth_ok'});
  const result = client.requestService('light','turn_on',{brightness:128},{entity_id:'light.test'});
  const wire = sockets[0].sent.at(-1);
  assert.deepEqual(wire.service_data,{brightness:128});
  assert.deepEqual(wire.target,{entity_id:'light.test'});
  sockets[0].message({type:'result',id:wire.id,success:true,result:null});
  assert.equal(await result,null);
});

test('HA rejection surfaces the service error', async t => {
  const {client,sockets}=setup(t);client.connect();sockets[0].message({type:'auth_ok'});
  const result=client.requestService('scene','turn_on',{}, {entity_id:'scene.missing'});
  const rejected=assert.rejects(result,/Scene does not exist/);
  sockets[0].message({type:'result',id:sockets[0].sent.at(-1).id,success:false,error:{message:'Scene does not exist'}});
  await rejected;
});

test('command timeout rejects instead of reporting success', async t => {
  const {client,sockets}=setup(t);client.connect();sockets[0].message({type:'auth_ok'});
  const rejected=assert.rejects(client.requestService('switch','turn_off'),/did not acknowledge/);
  t.mock.timers.tick(10000);await rejected;
});

test('disconnect rejects in-flight service and ignores old socket results', async t => {
  const {client,sockets}=setup(t);client.connect();sockets[0].message({type:'auth_ok'});
  const rejected=assert.rejects(client.requestService('lock','lock'),/interrupted/);
  const id=sockets[0].sent.at(-1).id;
  client.reconnect();sockets[0].message({type:'result',id,success:true});await rejected;
});

test('forecast requests opt into response data and preserve the returned forecast', async t => {
  const {client,sockets}=setup(t);client.connect();sockets[0].message({type:'auth_ok'});
  const result=client.requestService('weather','get_forecasts',{type:'daily'},{entity_id:'weather.forecast_home'},true);
  const wire=sockets[0].sent.at(-1);
  assert.equal(wire.return_response,true);
  assert.equal(wire.domain,'weather');
  const response={response:{'weather.forecast_home':{forecast:[{datetime:'2026-10-02T02:00:00Z',temperature:12}]}}};
  sockets[0].message({type:'result',id:wire.id,success:true,result:response});
  assert.deepEqual(await result,response);
});

test('history uses a read-only request with bounded dates and entity IDs',async t=>{
 const {client,sockets}=setup(t);client.connect();sockets[0].message({type:'auth_ok'});
 const end=Date.parse('2026-10-05T04:00:00Z');const result=client.fetchHistory(['sensor.room'],end-86400000,end);
 const wire=sockets[0].sent.at(-1);assert.equal(wire.type,'history/history_during_period');assert.deepEqual(wire.entity_ids,['sensor.room']);assert.equal(wire.start_time,'2026-10-04T04:00:00.000Z');assert.equal(wire.no_attributes,true);
 sockets[0].message({type:'result',id:wire.id,success:true,result:{'sensor.room':[{s:'65',lu:end/1000}]}});
 assert.equal((await result)['sensor.room'][0].s,'65');
});

test('equal state timestamps refresh report freshness without replacing cached attributes',()=>{
 const old={entity_id:'sensor.room',state:'65',attributes:{source:'cached'},last_updated:'2026-10-05T01:00:00Z',last_reported:'2026-10-05T01:00:00Z'};
 const fresh={...old,attributes:{source:'snapshot'},last_reported:'2026-10-05T04:00:00Z'};
 const merged=mergeStates({'sensor.room':old},{'sensor.room':fresh})['sensor.room'];assert.equal(merged.last_reported,fresh.last_reported);assert.equal(merged.attributes.source,'cached');
});
