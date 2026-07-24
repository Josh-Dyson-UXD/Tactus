import { useState, useCallback, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "motion/react";
import type {
  Room, SolarState, PowerwallState, GridState, TeslaState, OutdoorState, HomeLoadState, Color,
  ControlStatus, TeslaControlKey, SeatHeaterLevel, SteeringHeaterLevel, ClimatePreset, ClimateFanMode,
  AutomationState, SceneState, MainView, ClimateState, HvacMode, QuickActionId,
} from "@/types";
import { HAClient, mergeStates } from "@/lib/ha-client";
import type { HAStateMap } from "@/lib/ha-client";
import {
  mapHAStatesToRooms, mapHAStatesToSolar, mapHAStatesToPowerwall, mapHAStatesToGrid,
  mapHAStatesToTesla, mapHAStatesToOutdoor, mapHAStatesToHomeLoad, mapLightEntity, mapSwitchEntity, mapClimateEntity, computeRoomBrightness, hexToRgb,
  mapHAStatesToAutomations, mapHAStatesToScenes, mapAutomationEntity, mapSceneEntity,
  HA_ENTITIES, TESLA_CONTROL_ENTITY, INDOOR_AIR_SENSORS,
  isLightEntity, isSolarEntity, isPowerwallEntity, isGridEntity, isTeslaEntity, isOutdoorEntity, isHomeLoadEntity, isSwitchEntity,
  isAutomationEntity, isSceneEntity, isIndoorAirEntity, indoorAirSensorsForRoom, isClimateEntity,
} from "@/lib/ha-types";
import { RoomView } from "@/components/layout/RoomView";
import { AutomationsView } from "@/components/layout/AutomationsView";
import { EnergyView } from "@/components/layout/EnergyView";
import { IdleScreen } from "@/components/layout/IdleScreen";
import { NavRail } from "@/components/layout/NavRail";
import { HomeView } from "@/components/layout/HomeView";
import { DevicesStub } from "@/components/layout/DevicesStub";

// Two supported modes (see README "Deployment"):
//  - Direct-to-HA dev: set both VITE_HA_URL and VITE_HA_TOKEN in .env.local —
//    inlined into this build's JS, fine for local iteration, never for
//    anything reachable beyond your own machine.
//  - Through the deployment proxy (server/): leave both unset. HAClient
//    defaults its base URL to the page's own origin, and the proxy injects
//    the real token server-side — this client never holds one.
const HA_URL   = import.meta.env.VITE_HA_URL as string | undefined;
const HA_TOKEN = import.meta.env.VITE_HA_TOKEN as string | undefined;

// How long a pending command waits for a state_changed confirmation before
// the card falls back to its error/unreachable state. See CLAUDE.md
// "Control" — pending must hold for the *confirmed* value, never assumed.
const PENDING_TIMEOUT_MS = 7000;

const TESLA_CONTROL_KEYS: TeslaControlKey[] = [
  "lock", "climate", "sentry", "valet", "seatHeaterFL", "seatHeaterFR",
  "steeringWheelHeater", "climatePreset", "climateFanMode", "frunk", "trunk", "windows",
];
const IDLE_TESLA_CONTROL = Object.fromEntries(TESLA_CONTROL_KEYS.map((k) => [k, "idle" as ControlStatus])) as Record<TeslaControlKey, ControlStatus>;

const IDLE_TIMEOUT_MS = 3 * 60 * 1000; // 3 min untouched → idle screen

// NavRail "Devices" alert threshold. Deliberately higher than the row-level
// amber threshold (800, EnvironmentBar's co2Color) used on Home's room rows
// — this one's meant to mean "genuinely ventilate", not light up the rail on
// every mildly-stuffy room.
const CO2_ALERT_THRESHOLD = 1500;

// Placeholder scene ids — Josh will create these real routines in HA later.
// scene.turn_on on a missing entity just logs a warning in HA, no crash, so
// this is safe to ship ahead of the actual scenes existing.
const SCENE_GOOD_NIGHT = "scene.good_night";
const SCENE_AWAY = "scene.away";

export default function App() {
  const [rooms, setRooms]           = useState<Room[]>([]);
  const [solar, setSolar]           = useState<SolarState | null>(null);
  const [powerwall, setPowerwall]   = useState<PowerwallState | null>(null);
  const [grid, setGrid]             = useState<GridState | null>(null);
  const [tesla, setTesla]           = useState<TeslaState | null>(null);
  const [outdoor, setOutdoor]       = useState<OutdoorState | null>(null);
  const [homeLoad, setHomeLoad]     = useState<HomeLoadState | null>(null);
  const [connError, setConnError]  = useState<string | null>(null);
  const [selectedRoomId, setRoomId] = useState<string | null>(null);
  const [teslaControl, setTeslaControl] = useState<Record<TeslaControlKey, ControlStatus>>(IDLE_TESLA_CONTROL);
  const [automations, setAutomations] = useState<AutomationState[]>([]);
  const [scenes, setScenes]           = useState<SceneState[]>([]);

  // Single source of truth for top-level nav — the persistent NavRail's four
  // tabs (redesign Phase 1: home/devices/energy/automations, renamed from
  // the old full-screen house/automations/energy swap). selectedRoomId only
  // means anything while mainView === "home"; leaving home clears it so
  // "back" always lands on the Home landing, never a stale room.
  const [mainView, setMainView] = useState<MainView>("home");
  const openEnergy = useCallback(() => { setRoomId(null); setMainView("energy"); }, []);
  const closeAutomations = useCallback(() => setMainView("home"), []);
  const closeEnergy = useCallback(() => setMainView("home"), []);

  // Ambient idle screen — fades in after IDLE_TIMEOUT_MS of no pointer/key
  // activity anywhere on the panel, tap-anywhere to wake back to whatever
  // view (mainView/selectedRoomId) was already showing underneath it.
  const [idle, setIdle] = useState(false);
  const idleTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    const reset = () => {
      if (idleTimerRef.current) clearTimeout(idleTimerRef.current);
      idleTimerRef.current = setTimeout(() => setIdle(true), IDLE_TIMEOUT_MS);
    };
    reset();
    const onActivity = () => reset();
    window.addEventListener("pointerdown", onActivity);
    window.addEventListener("keydown", onActivity);
    return () => {
      window.removeEventListener("pointerdown", onActivity);
      window.removeEventListener("keydown", onActivity);
      if (idleTimerRef.current) clearTimeout(idleTimerRef.current);
    };
  }, []);

  // Full snapshot kept locally so aggregate cards (solar/powerwall/grid/
  // tesla/outdoor, each backed by several entities) can be recomputed from
  // one changed entity without a network re-fetch.
  const statesRef = useRef<HAStateMap>({});
  const clientRef = useRef<HAClient | null>(null);
  const lightPendingRef = useRef<Map<string, ReturnType<typeof setTimeout>>>(new Map());
  const teslaPendingRef = useRef<Map<TeslaControlKey, ReturnType<typeof setTimeout>>>(new Map());
  const automationPendingRef = useRef<Map<string, ReturnType<typeof setTimeout>>>(new Map());
  const switchPendingRef = useRef<Map<string, ReturnType<typeof setTimeout>>>(new Map());
  const climatePendingRef = useRef<Map<string, ReturnType<typeof setTimeout>>>(new Map());

  // Guards for rehydrate() below. hydrationGenRef lets a slower, now-
  // superseded rehydrate (e.g. two WS auth_oks in quick succession) detect
  // that a newer one already landed and no-op instead of overwriting fresher
  // data with older. hasLoadedRef distinguishes "never loaded anything yet"
  // (surface the real fetch error) from "have last-known data, this refresh
  // just failed" (say so distinctly, don't wipe or relabel it "Reconnecting").
  const hydrationGenRef = useRef(0);
  const hasLoadedRef = useRef(false);
  // Tracks the WS's live connected/disconnected state so a rehydrate fetch
  // that was in flight when the WS dropped can't clear connError back to
  // null on arrival — same shape of bug as the checkpoint-1 ordering issue,
  // just one layer down: "this fetch succeeded" isn't the same event as
  // "we're still connected right now".
  const isConnectedRef = useRef(false);
  // Set once a fatal auth_invalid arrives. ws.close() after auth_invalid
  // synchronously triggers onConnectionChange(false) right behind it, which
  // would otherwise overwrite the honest "token rejected" message with the
  // generic "Reconnecting…" a moment later — wrong, since this won't
  // self-heal via the reconnect timer the way a transient drop does. Cleared
  // on the next successful auth, so a fixed token (after a rebuild/restart)
  // recovers normally.
  const authRejectedRef = useRef(false);

  // The one code path for both the initial load and every reconnect —
  // triggered below by onConnectionChange(true), which fires on every
  // successful auth_ok, not just the first. Re-fetches the full REST
  // snapshot, merges it into statesRef (never replaces it wholesale, so a
  // state_changed event that raced in ahead of this response isn't lost),
  // and re-derives every domain from the merged map.
  const rehydrate = useCallback(async () => {
    const client = clientRef.current;
    if (!client) return;
    const gen = ++hydrationGenRef.current;

    try {
      const fetched = await client.fetchStates();
      if (gen !== hydrationGenRef.current) return; // superseded — a newer rehydrate already won

      const merged = mergeStates(statesRef.current, fetched);
      statesRef.current = merged;

      // This rehydration is the authoritative resolution for anything
      // mid-flight — clear every outstanding pending timer so none of them
      // fire later and stomp a value the fresh snapshot already confirmed.
      // Lights/switches/automations need nothing beyond that: their mappers
      // derive state purely from entity data, never from a carried-over
      // pending flag, so the wholesale recompute below already discards it.
      // Tesla's pending lives in separate teslaControl state and needs an
      // explicit reset.
      lightPendingRef.current.forEach(clearTimeout);
      lightPendingRef.current.clear();
      switchPendingRef.current.forEach(clearTimeout);
      switchPendingRef.current.clear();
      climatePendingRef.current.forEach(clearTimeout);
      climatePendingRef.current.clear();
      automationPendingRef.current.forEach(clearTimeout);
      automationPendingRef.current.clear();
      teslaPendingRef.current.forEach(clearTimeout);
      teslaPendingRef.current.clear();
      setTeslaControl(IDLE_TESLA_CONTROL);

      setRooms(mapHAStatesToRooms(merged));
      setSolar(mapHAStatesToSolar(merged));
      setPowerwall(mapHAStatesToPowerwall(merged));
      setGrid(mapHAStatesToGrid(merged));
      setTesla(mapHAStatesToTesla(merged));
      setOutdoor(mapHAStatesToOutdoor(merged));
      setHomeLoad(mapHAStatesToHomeLoad(merged));
      setAutomations(mapHAStatesToAutomations(merged));
      setScenes(mapHAStatesToScenes(merged));

      hasLoadedRef.current = true;
      // The only place connError is ever cleared — a successful refresh is
      // the real "we're caught up" signal, not merely the WS reconnecting.
      // But only if we're still actually connected: the WS can drop again
      // while this fetch was in flight, and that disconnect's "Reconnecting…"
      // must win over a fetch that started before it and lands after.
      if (isConnectedRef.current) setConnError(null);
    } catch (err) {
      if (gen !== hydrationGenRef.current) return; // superseded — ignore its failure too
      const message = err instanceof Error ? err.message : String(err);
      console.error("Re-hydration fetch failed:", err);
      // No last-known data yet: nothing to preserve, so surface the real
      // error instead of leaving the UI stuck on a silent "Connecting…",
      // regardless of current connection state — there's nothing else to
      // show. Once we do have data: if we've dropped again since this fetch
      // was issued, the more recent disconnect's "Reconnecting…" already
      // covers it and is the truer statement — don't overwrite it with a
      // "Reconnected" message that's now false. Only if we're still
      // actually connected does the distinct refresh-failed message apply
      // (not "Reconnecting…", which would be untrue — the WS is back, only
      // the refresh failed — and not silence either).
      if (!hasLoadedRef.current) {
        setConnError(message);
      } else if (isConnectedRef.current) {
        setConnError("Reconnected — couldn't refresh state");
      }
    }
  }, []);

  useEffect(() => {
    // Only fatal when someone has opted into direct-to-HA dev mode
    // (VITE_HA_URL set) without also giving it a token — that combination
    // really can't authenticate, no proxy to inject one. When VITE_HA_URL is
    // unset, HAClient defaults to the page's own origin and a missing token
    // is expected: the deployment proxy holds the real one.
    if (HA_URL && !HA_TOKEN) {
      setConnError("VITE_HA_URL is set but VITE_HA_TOKEN is missing — see .env.example");
      return;
    }

    const client = new HAClient({ url: HA_URL, token: HA_TOKEN });
    clientRef.current = client;

    // Registered before connect() — hydration now hangs off this listener,
    // so it must already be attached before auth_ok can possibly fire.
    const unsubConn = client.onConnectionChange((connected) => {
      isConnectedRef.current = connected;
      if (connected) {
        authRejectedRef.current = false; // a fresh successful auth supersedes any prior rejection
        rehydrate(); // clears connError itself, only once the refresh actually succeeds
      } else if (!authRejectedRef.current) {
        // Don't overwrite an auth-rejected message with the generic one —
        // ws.close() after auth_invalid fires this same event right behind
        // onAuthError below, and "Reconnecting…" would be a downgrade to a
        // less accurate, implicitly-self-healing-sounding message.
        setConnError("Reconnecting to Home Assistant…");
      }
    });
    // Fatal auth failure (invalid/revoked token) never reaches auth_ok, so
    // it never fires onConnectionChange(true) and rehydrate() never runs —
    // without this, the UI would loop "Reconnecting…" forever with the real
    // cause only in the console. This won't self-heal via the reconnect
    // timer the way a transient drop does, but the message still needs to
    // be honest about what's actually wrong.
    const unsubAuthError = client.onAuthError((message) => {
      authRejectedRef.current = true;
      setConnError(`Home Assistant rejected the access token: ${message}`);
    });
    const unsubState = client.onStateChanged((entityId, entity) => {
      statesRef.current = { ...statesRef.current, [entityId]: entity };
      const states = statesRef.current;

      if (isLightEntity(entityId)) {
        const pending = lightPendingRef.current.get(entityId);
        if (pending) { clearTimeout(pending); lightPendingRef.current.delete(entityId); }

        const updated = mapLightEntity(entity);
        setRooms((prev) => prev.map((r) => {
          if (!r.lights.some((l) => l.id === entityId)) return r;
          const lights = r.lights.map((l) => (l.id === entityId ? updated : l));
          return { ...r, lights, roomBrightness: computeRoomBrightness(lights) };
        }));
      } else if (isSwitchEntity(entityId)) {
        const pending = switchPendingRef.current.get(entityId);
        if (pending) { clearTimeout(pending); switchPendingRef.current.delete(entityId); }

        const updated = mapSwitchEntity(entity);
        setRooms((prev) => prev.map((r) => (
          r.switches.some((s) => s.id === entityId)
            ? { ...r, switches: r.switches.map((s) => (s.id === entityId ? updated : s)) }
            : r
        )));
      } else if (isClimateEntity(entityId)) {
        const pending = climatePendingRef.current.get(entityId);
        if (pending) { clearTimeout(pending); climatePendingRef.current.delete(entityId); }

        const updated = mapClimateEntity(entity);
        setRooms((prev) => prev.map((r) => (
          r.climate.some((c) => c.id === entityId)
            ? { ...r, climate: r.climate.map((c) => (c.id === entityId ? updated : c)) }
            : r
        )));
      } else if (isSolarEntity(entityId)) {
        setSolar(mapHAStatesToSolar(states));
      } else if (isPowerwallEntity(entityId)) {
        setPowerwall(mapHAStatesToPowerwall(states));
      } else if (isGridEntity(entityId)) {
        setGrid(mapHAStatesToGrid(states));
      } else if (isTeslaEntity(entityId)) {
        const clearTeslaPending = (key: TeslaControlKey) => {
          const pending = teslaPendingRef.current.get(key);
          if (pending) { clearTimeout(pending); teslaPendingRef.current.delete(key); setTeslaControl((s) => ({ ...s, [key]: "idle" })); }
        };
        if (entityId === HA_ENTITIES.teslaClimate) {
          // climate.ghost_climate backs three keys (on/off, preset, fan mode)
          // — clear whichever of them is actually in flight.
          clearTeslaPending("climate");
          clearTeslaPending("climatePreset");
          clearTeslaPending("climateFanMode");
        } else {
          const key = TESLA_CONTROL_ENTITY[entityId];
          if (key) clearTeslaPending(key);
        }
        setTesla(mapHAStatesToTesla(states));
      } else if (isOutdoorEntity(entityId)) {
        setOutdoor(mapHAStatesToOutdoor(states));
      } else if (isHomeLoadEntity(entityId)) {
        setHomeLoad(mapHAStatesToHomeLoad(states));
      } else if (isIndoorAirEntity(entityId)) {
        setRooms((prev) => prev.map((r) =>
          INDOOR_AIR_SENSORS[r.id]
            ? { ...r, sensors: indoorAirSensorsForRoom(statesRef.current, r.id) }
            : r
        ));
      } else if (isAutomationEntity(entityId)) {
        const pending = automationPendingRef.current.get(entityId);
        if (pending) { clearTimeout(pending); automationPendingRef.current.delete(entityId); }

        const updated = mapAutomationEntity(entity);
        setAutomations((prev) => {
          const idx = prev.findIndex((a) => a.id === entityId);
          if (idx === -1) {
            // Newly-appeared automation (created in HA after initial load) —
            // dynamic discovery means insert it, not just patch in place.
            return [...prev, updated].sort((a, b) => a.name.localeCompare(b.name));
          }
          const next = prev.slice();
          next[idx] = updated;
          return next;
        });
      } else if (isSceneEntity(entityId)) {
        // Scenes carry no mutable state to patch — just ensure a
        // newly-appeared scene is present in the list.
        setScenes((prev) => (
          prev.some((s) => s.id === entityId)
            ? prev
            : [...prev, mapSceneEntity(entity)].sort((a, b) => a.name.localeCompare(b.name))
        ));
      }
    });

    client.connect();

    return () => {
      unsubConn();
      unsubAuthError();
      unsubState();
      client.disconnect();
      lightPendingRef.current.forEach(clearTimeout);
      lightPendingRef.current.clear();
      teslaPendingRef.current.forEach(clearTimeout);
      teslaPendingRef.current.clear();
      automationPendingRef.current.forEach(clearTimeout);
      automationPendingRef.current.clear();
      switchPendingRef.current.forEach(clearTimeout);
      switchPendingRef.current.clear();
      climatePendingRef.current.forEach(clearTimeout);
      climatePendingRef.current.clear();
    };
  }, [rehydrate]);

  // ─── Light control: pending → confirmed cycle ────────────────────────────
  const setLightCardState = useCallback((entityId: string, cardState: "pending" | "error") => {
    setRooms((prev) => prev.map((r) => (
      r.lights.some((l) => l.id === entityId)
        ? { ...r, lights: r.lights.map((l) => (l.id === entityId ? { ...l, cardState } : l)) }
        : r
    )));
  }, []);

  const controlLight = useCallback((entityId: string, service: "turn_on" | "turn_off", data?: Record<string, unknown>) => {
    const client = clientRef.current;
    if (!client) return;

    const existing = lightPendingRef.current.get(entityId);
    if (existing) clearTimeout(existing);

    setLightCardState(entityId, "pending");
    client.callService("light", service, data, { entity_id: entityId });

    const timeout = setTimeout(() => {
      lightPendingRef.current.delete(entityId);
      setLightCardState(entityId, "error");
    }, PENDING_TIMEOUT_MS);
    lightPendingRef.current.set(entityId, timeout);
  }, [setLightCardState]);

  const handleLightToggle = useCallback((entityId: string, on: boolean) => {
    controlLight(entityId, on ? "turn_on" : "turn_off");
  }, [controlLight]);

  const handleLightBrightness = useCallback((entityId: string, brightnessPct: number) => {
    controlLight(entityId, "turn_on", { brightness_pct: brightnessPct });
  }, [controlLight]);

  const handleLightColor = useCallback((entityId: string, color: Color) => {
    controlLight(entityId, "turn_on", { rgb_color: hexToRgb(color.hex) });
  }, [controlLight]);

  const handleLightColorTemp = useCallback((entityId: string, kelvin: number) => {
    controlLight(entityId, "turn_on", { color_temp_kelvin: kelvin });
  }, [controlLight]);

  // ─── Switch control: same pending → confirmed cycle as lights ───────────
  const setSwitchStatus = useCallback((entityId: string, status: "pending" | "error") => {
    setRooms((prev) => prev.map((r) => (
      r.switches.some((s) => s.id === entityId)
        ? { ...r, switches: r.switches.map((s) => (s.id === entityId ? { ...s, status } : s)) }
        : r
    )));
  }, []);

  const handleSwitchToggle = useCallback((entityId: string, on: boolean) => {
    const client = clientRef.current;
    if (!client) return;

    const existing = switchPendingRef.current.get(entityId);
    if (existing) clearTimeout(existing);

    setSwitchStatus(entityId, "pending");
    client.callService("switch", on ? "turn_on" : "turn_off", {}, { entity_id: entityId });

    const timeout = setTimeout(() => {
      switchPendingRef.current.delete(entityId);
      setSwitchStatus(entityId, "error");
    }, PENDING_TIMEOUT_MS);
    switchPendingRef.current.set(entityId, timeout);
  }, [setSwitchStatus]);

  // ─── Climate control: same pending → confirmed cycle as switches ────────
  // One curated entity (the Sensibo split system) — see CLIMATE_ROOM_OVERRIDE
  // in ha-types.ts. Distinct HA services per control (temp/mode/fan/power)
  // rather than a single call_service, since each maps to a different
  // Sensibo/climate.* service.
  const setClimateStatus = useCallback((entityId: string, status: "pending" | "error") => {
    setRooms((prev) => prev.map((r) =>
      r.climate.some((c) => c.id === entityId)
        ? { ...r, climate: r.climate.map((c) => (c.id === entityId ? { ...c, status } : c)) }
        : r
    ));
  }, []);

  const controlClimate = useCallback((entityId: string, service: string, data: Record<string, unknown>) => {
    const client = clientRef.current;
    if (!client) return;
    const existing = climatePendingRef.current.get(entityId);
    if (existing) clearTimeout(existing);
    setClimateStatus(entityId, "pending");
    client.callService("climate", service, data, { entity_id: entityId });
    const t = setTimeout(() => { climatePendingRef.current.delete(entityId); setClimateStatus(entityId, "error"); }, PENDING_TIMEOUT_MS);
    climatePendingRef.current.set(entityId, t);
  }, [setClimateStatus]);

  const handleClimateTemp  = useCallback((id: string, temp: number) => controlClimate(id, "set_temperature", { temperature: temp }), [controlClimate]);
  const handleClimateMode  = useCallback((id: string, mode: HvacMode) => controlClimate(id, "set_hvac_mode", { hvac_mode: mode }), [controlClimate]);
  const handleClimateFan   = useCallback((id: string, fan: string)  => controlClimate(id, "set_fan_mode", { fan_mode: fan }), [controlClimate]);
  const handleClimatePower = useCallback((id: string, on: boolean)  => controlClimate(id, on ? "turn_on" : "turn_off", {}), [controlClimate]);

  // Room-level bulk toggle/brightness: no separate room-level pending state —
  // each affected light (and, for on/off, each switch) fires its own
  // independent controlLight()/handleSwitchToggle() call and rides the same
  // per-entity pending → confirmed cycle already used for individual
  // toggles. The room card's dots/aggregates are already computed from real
  // cardState/status, so they reflect reality as each entity confirms
  // independently. Brightness stays lights-only — a switch has no
  // brightness and must never get a brightness service call.
  const handleRoomToggle = useCallback((room: Room, on: boolean) => {
    room.lights.forEach((l) => { if (l.cardState !== "error") handleLightToggle(l.id, on); });
    room.switches.forEach((s) => { if (s.status !== "error") handleSwitchToggle(s.id, on); });
  }, [handleLightToggle, handleSwitchToggle]);

  const handleRoomBrightness = useCallback((room: Room, brightnessPct: number) => {
    room.lights.forEach((l) => { if (l.cardState === "on") handleLightBrightness(l.id, brightnessPct); });
  }, [handleLightBrightness]);

  // Whole-house bulk toggle/brightness: same fan-out, just across every
  // room's lights (and switches, for on/off) instead of one room's. The
  // brightness slider debounces in HouseView before this ever fires, since
  // this is even more flood-prone (potentially 15+ lights at once) than the
  // room-level case.
  const handleHouseToggle = useCallback((on: boolean) => {
    rooms.forEach((room) => {
      room.lights.forEach((l) => { if (l.cardState !== "error") handleLightToggle(l.id, on); });
      room.switches.forEach((s) => { if (s.status !== "error") handleSwitchToggle(s.id, on); });
    });
  }, [rooms, handleLightToggle, handleSwitchToggle]);

  const handleHouseBrightness = useCallback((brightnessPct: number) => {
    rooms.forEach((room) => room.lights.forEach((l) => { if (l.cardState === "on") handleLightBrightness(l.id, brightnessPct); }));
  }, [rooms, handleLightBrightness]);

  // ─── Home's Quick Actions row ────────────────────────────────────────────
  // good_night/away are fire-and-forget scene.turn_on calls against
  // SCENE_GOOD_NIGHT/SCENE_AWAY — placeholder ids pending the real routines
  // Josh will build in HA; calling scene.turn_on on a not-yet-existing scene
  // just logs a warning in HA, no crash.
  const handleQuickAction = useCallback((id: QuickActionId) => {
    switch (id) {
      case "all_off":
        handleHouseToggle(false);
        break;
      case "heat_living":
        handleClimateMode(HA_ENTITIES.climateSplitSystem, "heat");
        handleClimateTemp(HA_ENTITIES.climateSplitSystem, 18);
        handleClimateFan(HA_ENTITIES.climateSplitSystem, "low");
        break;
      case "precondition":
        clientRef.current?.callService("climate", "turn_on", {}, { entity_id: HA_ENTITIES.teslaClimate });
        break;
      case "good_night":
        clientRef.current?.callService("scene", "turn_on", {}, { entity_id: SCENE_GOOD_NIGHT });
        break;
      case "away":
        clientRef.current?.callService("scene", "turn_on", {}, { entity_id: SCENE_AWAY });
        break;
    }
  }, [handleHouseToggle, handleClimateMode, handleClimateTemp, handleClimateFan]);

  // ─── Tesla control: pending → confirmed cycle ────────────────────────────
  // Generalized across every toggle/select/cover control on the card — same
  // mechanics as controlLight/controlTesla's original climate+lock pair, just
  // keyed by TeslaControlKey instead of hardcoded to two fields.
  const controlTesla = useCallback((key: TeslaControlKey, domain: string, service: string, entityId: string, serviceData: Record<string, unknown> = {}) => {
    const client = clientRef.current;
    if (!client) return;

    const existing = teslaPendingRef.current.get(key);
    if (existing) clearTimeout(existing);

    setTeslaControl((s) => ({ ...s, [key]: "pending" }));
    client.callService(domain, service, serviceData, { entity_id: entityId });

    const timeout = setTimeout(() => {
      teslaPendingRef.current.delete(key);
      setTeslaControl((s) => ({ ...s, [key]: "error" }));
    }, PENDING_TIMEOUT_MS);
    teslaPendingRef.current.set(key, timeout);
  }, []);

  const handleToggleTeslaClimate = useCallback(() => {
    controlTesla("climate", "climate", tesla?.climateOn ? "turn_off" : "turn_on", HA_ENTITIES.teslaClimate);
  }, [controlTesla, tesla?.climateOn]);

  const handleToggleTeslaLock = useCallback(() => {
    controlTesla("lock", "lock", tesla?.locked ? "unlock" : "lock", HA_ENTITIES.teslaLock);
  }, [controlTesla, tesla?.locked]);

  const handleToggleTeslaSentry = useCallback(() => {
    controlTesla("sentry", "switch", tesla?.sentryMode ? "turn_off" : "turn_on", HA_ENTITIES.teslaSentry);
  }, [controlTesla, tesla?.sentryMode]);

  const handleToggleTeslaValet = useCallback(() => {
    controlTesla("valet", "switch", tesla?.valetMode ? "turn_off" : "turn_on", HA_ENTITIES.teslaValet);
  }, [controlTesla, tesla?.valetMode]);

  const handleTeslaSeatHeaterFL = useCallback((level: SeatHeaterLevel) => {
    controlTesla("seatHeaterFL", "select", "select_option", HA_ENTITIES.teslaSeatHeaterFL, { option: level });
  }, [controlTesla]);

  const handleTeslaSeatHeaterFR = useCallback((level: SeatHeaterLevel) => {
    controlTesla("seatHeaterFR", "select", "select_option", HA_ENTITIES.teslaSeatHeaterFR, { option: level });
  }, [controlTesla]);

  const handleTeslaSteeringWheelHeater = useCallback((level: SteeringHeaterLevel) => {
    controlTesla("steeringWheelHeater", "select", "select_option", HA_ENTITIES.teslaSteeringWheelHeater, { option: level });
  }, [controlTesla]);

  const handleTeslaClimatePreset = useCallback((preset: ClimatePreset) => {
    controlTesla("climatePreset", "climate", "set_preset_mode", HA_ENTITIES.teslaClimate, { preset_mode: preset });
  }, [controlTesla]);

  const handleTeslaClimateFanMode = useCallback((mode: ClimateFanMode) => {
    controlTesla("climateFanMode", "climate", "set_fan_mode", HA_ENTITIES.teslaClimate, { fan_mode: mode });
  }, [controlTesla]);

  // cover.ghost_frunk supports open_cover only (supported_features: 1) — no
  // close service exists for it, so this is a one-shot action, not a toggle.
  const handleTeslaOpenFrunk = useCallback(() => {
    controlTesla("frunk", "cover", "open_cover", HA_ENTITIES.teslaFrunk);
  }, [controlTesla]);

  const handleToggleTeslaTrunk = useCallback(() => {
    controlTesla("trunk", "cover", tesla?.trunkOpen ? "close_cover" : "open_cover", HA_ENTITIES.teslaTrunk);
  }, [controlTesla, tesla?.trunkOpen]);

  const handleToggleTeslaWindows = useCallback(() => {
    controlTesla("windows", "cover", tesla?.windowsOpen ? "close_cover" : "open_cover", HA_ENTITIES.teslaWindows);
  }, [controlTesla, tesla?.windowsOpen]);

  // Fire-and-forget — no persisted state to confirm, so no pending/error cycle.
  const handleTeslaHonk = useCallback(() => {
    clientRef.current?.callService("button", "press", {}, { entity_id: HA_ENTITIES.teslaHonk });
  }, []);

  const handleTeslaFlash = useCallback(() => {
    clientRef.current?.callService("button", "press", {}, { entity_id: HA_ENTITIES.teslaFlash });
  }, []);

  // ─── Automations & scenes ─────────────────────────────────────────────────
  const setAutomationStatus = useCallback((entityId: string, status: "pending" | "error") => {
    setAutomations((prev) => prev.map((a) => (a.id === entityId ? { ...a, status } : a)));
  }, []);

  const toggleAutomation = useCallback((entityId: string, enable: boolean) => {
    const client = clientRef.current;
    if (!client) return;

    const existing = automationPendingRef.current.get(entityId);
    if (existing) clearTimeout(existing);

    setAutomationStatus(entityId, "pending");
    client.callService("automation", enable ? "turn_on" : "turn_off", {}, { entity_id: entityId });

    const timeout = setTimeout(() => {
      automationPendingRef.current.delete(entityId);
      setAutomationStatus(entityId, "error");
    }, PENDING_TIMEOUT_MS);
    automationPendingRef.current.set(entityId, timeout);
  }, [setAutomationStatus]);

  // Manual override button: skip_condition:true is explicit, not relied on as
  // a default — this must run the automation's actions regardless of whether
  // its own conditions currently hold. Fire-and-forget: no state to confirm.
  const triggerAutomation = useCallback((entityId: string) => {
    clientRef.current?.callService("automation", "trigger", { skip_condition: true }, { entity_id: entityId });
  }, []);

  // Fire-and-forget — scenes have no on/off state to confirm.
  const activateScene = useCallback((entityId: string) => {
    clientRef.current?.callService("scene", "turn_on", {}, { entity_id: entityId });
  }, []);

  const updateRoom  = useCallback((id: string, p: Partial<Room>) => setRooms((prev) => prev.map((r) => r.id === id ? { ...r, ...p } : r)), []);
  const selectedRoom = rooms.find((r) => r.id === selectedRoomId) ?? null;

  if (connError && !solar) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: "var(--tactus-bg-base)" }}>
        <p className="text-[14px]" style={{ fontFamily: "var(--tactus-font-sans)", color: "var(--tactus-text-muted)" }}>{connError}</p>
      </div>
    );
  }

  if (!solar || !powerwall || !grid || !tesla || !outdoor || !homeLoad) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: "var(--tactus-bg-base)" }}>
        <p className="text-[14px]" style={{ fontFamily: "var(--tactus-font-sans)", color: "var(--tactus-text-muted)" }}>Connecting to Home Assistant…</p>
      </div>
    );
  }

  // NavRail alert dots — devices: any room's CO₂ is genuinely elevated
  // (see CO2_ALERT_THRESHOLD); energy: the car is unlocked. home/automations
  // stay alertless for now.
  const anyRoomCo2Alert = rooms.some((r) =>
    r.sensors.some((s) => s.data.kind === "co2" && s.data.co2 >= CO2_ALERT_THRESHOLD)
  );
  const railAlerts: Partial<Record<MainView, boolean>> = {
    devices: anyRoomCo2Alert,
    energy: !tesla.locked,
  };

  let content;
  if (mainView === "automations") {
    content = (
      <AutomationsView automations={automations} scenes={scenes} onBack={closeAutomations}
        onToggleAutomation={toggleAutomation} onRunAutomation={triggerAutomation} onActivateScene={activateScene} />
    );
  } else if (mainView === "energy") {
    content = (
      <EnergyView solar={solar} powerwall={powerwall} grid={grid} tesla={tesla} homeLoad={homeLoad} onBack={closeEnergy}
        teslaControl={teslaControl}
        teslaActions={{
          toggleClimate: handleToggleTeslaClimate, toggleLock: handleToggleTeslaLock,
          toggleSentry: handleToggleTeslaSentry, toggleValet: handleToggleTeslaValet,
          setSeatHeaterFL: handleTeslaSeatHeaterFL, setSeatHeaterFR: handleTeslaSeatHeaterFR,
          setSteeringWheelHeater: handleTeslaSteeringWheelHeater,
          setClimatePreset: handleTeslaClimatePreset, setClimateFanMode: handleTeslaClimateFanMode,
          openFrunk: handleTeslaOpenFrunk, toggleTrunk: handleToggleTeslaTrunk, toggleWindows: handleToggleTeslaWindows,
          honk: handleTeslaHonk, flash: handleTeslaFlash,
        }} />
    );
  } else if (mainView === "devices") {
    content = <DevicesStub />;
  } else {
    content = (
      <AnimatePresence mode="wait">
        {selectedRoom ? (
          <motion.div key={selectedRoom.id} initial={{ opacity: 0, x: 24 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -24 }} transition={{ duration: 0.22, ease: "easeInOut" }}>
            <RoomView room={selectedRoom} onBack={() => setRoomId(null)} onUpdateRoom={(p) => updateRoom(selectedRoom.id, p)}
              onLightToggle={handleLightToggle} onLightBrightness={handleLightBrightness} onLightColor={handleLightColor} onLightColorTemp={handleLightColorTemp}
              onSwitchToggle={handleSwitchToggle}
              onClimatePower={handleClimatePower} onClimateMode={handleClimateMode} onClimateTemp={handleClimateTemp} onClimateFan={handleClimateFan} />
          </motion.div>
        ) : (
          <motion.div key="home" initial={{ opacity: 0, x: -24 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 24 }} transition={{ duration: 0.22, ease: "easeInOut" }}>
            <HomeView rooms={rooms} outdoor={outdoor} solar={solar} powerwall={powerwall} tesla={tesla}
              onNavigateRoom={setRoomId}
              onOpenEnergy={openEnergy}
              onQuickAction={handleQuickAction} />
          </motion.div>
        )}
      </AnimatePresence>
    );
  }

  return (
    <>
      <div style={{ display: "flex", minHeight: "100vh", background: "var(--tactus-bg-base)" }}>
        <NavRail active={mainView} onNavigate={(v) => { setRoomId(null); setMainView(v); }} alerts={railAlerts} />
        <main style={{ flex: 1, minWidth: 0 }}>{content}</main>
      </div>
      {idle && (
        <IdleScreen rooms={rooms} solar={solar} powerwall={powerwall} tesla={tesla} outdoor={outdoor}
          onWake={() => setIdle(false)} />
      )}
    </>
  );
}
