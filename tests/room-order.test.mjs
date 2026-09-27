import { test } from 'node:test';
import assert from 'node:assert/strict';
import { compareRooms } from '../src/lib/room-order.ts';

test('rooms retain the preferred order independently of activity', () => {
  const ids = ['front', 'toilet', 'laundry', 'bathroom', 'kids', 'bedroom', 'kitchen', 'living'];
  assert.deepEqual(ids.map(id => ({ id })).sort(compareRooms).map(room => room.id),
    ['living', 'kitchen', 'bedroom', 'kids', 'bathroom', 'laundry', 'toilet', 'front']);
});

test('new rooms follow the preferred rooms in their existing relative order', () => {
  assert.deepEqual(['office', 'kids', 'garage', 'living'].map(id => ({ id })).sort(compareRooms).map(room => room.id),
    ['living', 'kids', 'office', 'garage']);
});
