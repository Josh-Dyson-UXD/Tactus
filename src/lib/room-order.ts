import type { Room } from '@/types';

// Shared by Home and Devices so room positions never jump as lights change.
const ROOM_ORDER = ['living', 'kitchen', 'bedroom', 'kids', 'bathroom', 'laundry', 'toilet', 'front'];
const position = (id: string) => {
  const index = ROOM_ORDER.indexOf(id);
  return index === -1 ? ROOM_ORDER.length : index;
};
export const compareRooms = (a: Room, b: Room) => position(a.id) - position(b.id);
