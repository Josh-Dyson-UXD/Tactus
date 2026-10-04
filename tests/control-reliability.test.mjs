import { test } from 'node:test';
import assert from 'node:assert/strict';
import { supportsMediaAction } from '../src/lib/media-control.ts';
import { visibleCommandError, retainCommandEvents } from '../src/lib/command-events.ts';
const player = (features, state='playing') => ({entity_id:'media_player.tv',state,attributes:{supported_features:features}});
test('pause and play are separate capabilities; unsupported transport cannot be sent', () => {
  const tv = player(1 | 2048);
  assert.equal(supportsMediaAction(tv,'media_pause'),true);
  for (const action of ['media_play','media_next_track','media_previous_track','volume_set','volume_mute']) assert.equal(supportsMediaAction(tv,action),false);
  assert.equal(supportsMediaAction(player(16384,'paused'),'media_play'),true);
});
test('stale values do not authorize controls without capability or availability', () => {
  for (const features of [undefined, null, '16384', NaN, -1]) assert.equal(supportsMediaAction(player(features),'media_play'),false);
  for (const state of ['unknown','unavailable']) assert.equal(supportsMediaAction(player(16384,state),'media_play'),false);
  assert.equal(supportsMediaAction(undefined,'media_play'),false);
  assert.equal(supportsMediaAction(player(65535),'unknown_service'),false);
});
test('volume and source controls require their own feature bits', () => {
  const tv=player(4 | 8 | 2048);
  for (const action of ['volume_set','volume_mute','select_source']) assert.equal(supportsMediaAction(tv,action),true);
  assert.equal(supportsMediaAction(tv,'media_pause'),false);
});
const event=(id,status)=>({id,status,title:`Action ${id}`,time:'',detail:'Device failed'});
test('new pending and successful commands cannot hide older unresolved errors', () => {
  const events=[event(4,'pending'),event(3,'confirmed'),event(2,'error'),event(1,'error')];
  assert.equal(visibleCommandError(events,new Set()).id,2);
  assert.equal(visibleCommandError(events,new Set([2])).id,1);
  assert.equal(visibleCommandError(events,new Set([1,2])),undefined);
  assert.equal(visibleCommandError([event(5,'error'),...events],new Set([1,2])).id,5);
});
test('completed history limits preserve old errors and in-flight command results', () => {
  const events=[...Array.from({length:110},(_,i)=>event(i+3,'accepted')),event(2,'pending'),event(1,'error')];
  const kept=retainCommandEvents(events);
  assert.equal(kept.length,102);
  assert.equal(visibleCommandError(kept,new Set()).id,1);
  assert.ok(kept.some(e=>e.id===2));
});
