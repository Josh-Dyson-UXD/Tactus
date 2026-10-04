import type { HAEntity } from './ha-client';

// Home Assistant MediaPlayerEntityFeature flags.
const features: Record<string, number> = {
  media_pause: 1, volume_set: 4, volume_mute: 8,
  media_previous_track: 16, media_next_track: 32,
  select_source: 2048, media_play: 16384,
};
export function supportsMediaAction(entity: HAEntity | undefined, action: string): boolean {
  const value = entity?.attributes.supported_features;
  return !!entity?.entity_id.startsWith('media_player.') &&
    !['unavailable', 'unknown'].includes(entity.state) &&
    typeof value === 'number' && Number.isSafeInteger(value) && value >= 0 &&
    !!features[action] && (value & features[action]) === features[action];
}
