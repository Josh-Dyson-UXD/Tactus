import type { HAEntity } from './ha-client.ts';
export type Change = { id: string; state?: string; attributes?: Record<string, unknown> };
export type Command = { id: string; domain: string; service: string; data: Record<string, unknown>; expected?: Change };
export function commandFor(change: Change, entity: HAEntity): Command {
  if (!entity || ['unavailable','unknown'].includes(entity.state)) throw Error('Device is unavailable.');
  const domain = change.id.split('.')[0];
  const result: Command = { id: change.id, domain, service: '', data: {}, expected: change };
  const a = change.attributes || {};
  if (domain === 'light') {
    result.service = change.state === 'off' ? 'turn_off' : 'turn_on';
    result.data = { ...a };
    result.expected = { ...change, state: result.service === 'turn_off' ? 'off' : 'on' };
    if ('rgb_color' in a) result.expected = undefined; // integrations may report xy/hs instead
  } else if (['switch','automation'].includes(domain) && ['on','off'].includes(change.state || '')) result.service = change.state === 'on' ? 'turn_on' : 'turn_off';
  else if (domain === 'climate') {
    if (change.state) { result.service = 'set_hvac_mode'; result.data = { hvac_mode: change.state }; }
    else if ('temperature' in a) { result.service = 'set_temperature'; result.data = a; }
    else if ('fan_mode' in a) { result.service = 'set_fan_mode'; result.data = a; }
    else if ('preset_mode' in a) { result.service = 'set_preset_mode'; result.data = a; }
  } else if (domain === 'select') { result.service = 'select_option'; result.data = { option: change.state }; }
  else if (domain === 'number') { result.service = 'set_value'; result.data = { value: Number(change.state) }; }
  else if (domain === 'lock') result.service = change.state === 'locked' ? 'lock' : 'unlock';
  else if (domain === 'cover') {
    const bit = change.state === 'open' ? 1 : 2;
    if (!(Number(entity.attributes.supported_features) & bit)) throw Error('This cover does not support that action.');
    result.service = change.state === 'open' ? 'open_cover' : 'close_cover';
  }
  if (!result.service) throw Error('This control is not supported.');
  return result;
}
export function confirms(entity: HAEntity | undefined, expected: Change) {
  if (!entity || ['unavailable','unknown'].includes(entity.state)) return false;
  if (expected.state !== undefined && entity.state !== expected.state && !(Number.isFinite(Number(expected.state)) && Number(entity.state) === Number(expected.state))) return false;
  return Object.entries(expected.attributes || {}).every(([key, value]) => {
    const actual = entity.attributes[key];
    return typeof value === 'number' ? actual != null && Math.abs(Number(actual) - value) <= (key === 'brightness' ? 2 : key === 'color_temp_kelvin' ? 60 : .05) : actual === value;
  });
}
