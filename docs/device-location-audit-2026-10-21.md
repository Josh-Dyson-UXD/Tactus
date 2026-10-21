# Device naming and placement audit — 21 October 2026

Entity IDs remain unchanged to preserve HA automation, scene, Tactus and HomeKit accessory references. Names below are HA device display names. Measurements inherit these names.

| Device | HA area | Current purpose |
|---|---|---|
| Outside Netatmo Sensor | Front Door | Former Kitchen module, currently outdoors; supplies outside temperature/humidity |
| Bedroom IKEA Sensor | Bedroom | Former Outdoor Weather TIMMERFLOTTE; comparison only |
| Bedroom Netatmo Sensor | Bedroom | Primary Bedroom readings and CO₂ |
| Kids Room Sensor | Kids Room | TIMMERFLOTTE temperature/humidity |
| Living Room Air Quality | Living Room | ALPSTUGA temperature/humidity/CO₂/PM2.5 |
| Living Room Apple TV | Living Room | Playback |
| Bedroom HomePod | Bedroom | Playback; built-in climate sensors still not imported into HA |
| Desk light (`light.kitchen_desk`) | Office | Existing HA assignment now also reflected in Tactus |
| Donut (`switch.kids_room_usb_lamp`) | Living Room entity override | Shared power-strip device remains in its existing area |

Room display names normalized to Front Door, Toilet and Kids Room. Pendants, TV Lights and Mushroom Right device names cleaned up. No devices unpaired or deleted; no entity IDs regenerated. No scheduled automations or scene actions changed.

## Apple Home follow-up

Apple Home stores its own accessory names and room assignments. The Mac Home app could not be accessed in this session, so these have NOT been changed or verified in Apple Home.

- Move the former Kitchen Netatmo temperature, humidity and CO₂ accessories to Front Door (outside location). Name them clearly as Outside Netatmo readings. Its CO₂ must not be interpreted as indoor ventilation.
- Check Kids Room light is in Kids Room, Donut is in Living Room, and Desk is in Office.
- Keep existing Bedroom Netatmo as the primary measurement. If the comparison IKEA sensor is already in Apple Home, label it Bedroom IKEA Sensor and assign Bedroom; its old entity name is not its physical location.
- Check capitalization/spacing of Front Door, Toilet and Kids Room in Apple Home.
- Do not reset the HomeKit Bridge to force names: that can remove room/scene/automation associations.
- The saved HomeKit YAML includes only selected entities; comments are headings, not room assignments. Existing exported accessories retain Apple-side rooms.
- Scene activation switches and Apple Home wrappers are a separate next step, not added in this audit.

Other existing power-point assignments, duplicate/disabled legacy devices and the empty-looking Josh’s device area were left untouched because their current physical purpose is not established.
