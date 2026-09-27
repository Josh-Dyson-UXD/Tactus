# Home Now design lab

Open `/?design=home-now` on the local Vite server. This route exists only in
DEV; production continues to render App and excludes this preview module.

The preview reads GET /api/states once through the existing proxy. It imports
only HA client types, never instantiates a client or WebSocket, and has no
service-call path. Controls mutate an in-memory snapshot; Reset restores it.
Refresh loads a new snapshot. No snapshot is checked into the repository.

Coverage: fixed room order and existing mappings, all mapped lights/plugs and
climate, sensor readings with missing states explicit, energy, grouped Ghost
controls, all scenes/automations, searchable controls/readings library, local
activity and undo, light/dark appearance. Additional switches are discoverable
in the library without changing any existing room assignments.

Limits: scene/automation target actions aren't exposed by the states endpoint;
their preview records intent without inventing resulting device states. No HA
history, timed overrides, automatic explanations, or media playback. Browser
Back is not wired to internal prototype navigation. This is a design evaluation,
not production control logic or evidence of live command reliability.
