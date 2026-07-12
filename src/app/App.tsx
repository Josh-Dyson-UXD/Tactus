import { useState, useCallback, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "motion/react";
import type { Room, SolarState, PowerwallState, GridState, TeslaState, OutdoorState, Color } from "@/types";
import { HAClient } from "@/lib/ha-client";
import type { HAStateMap } from "@/lib/ha-client";
import {
  mapHAStatesToRooms, mapHAStatesToSolar, mapHAStatesToPowerwall, mapHAStatesToGrid,
  mapHAStatesToTesla, mapHAStatesToOutdoor, mapLightEntity, hexToRgb, HA_ENTITIES,
  isLightEntity, isSolarEntity, isPowerwallEntity, isGridEntity, isTeslaEntity, isOutdoorEntity,
} from "@/lib/ha-types";
import { HouseView } from "@/components/layout/HouseView";
import { RoomView } from "@/components/layout/RoomView";

// Local-network-only: the token stays in this build's env and never leaves
// the LAN. Set VITE_HA_URL / VITE_HA_TOKEN in .env.local (see .env.example).
const HA_URL   = import.meta.env.VITE_HA_URL as string | undefined;
const HA_TOKEN = import.meta.env.VITE_HA_TOKEN as string | undefined;

// How long a pending command waits for a state_changed confirmation before
// the card falls back to its error/unreachable state. See CLAUDE.md
// "Control" — pending must hold for the *confirmed* value, never assumed.
const PENDING_TIMEOUT_MS = 7000;

type ControlStatus = "idle" | "pending" | "error";

export default function App() {
  const [rooms, setRooms]           = useState<Room[]>([]);
  const [solar, setSolar]           = useState<SolarState | null>(null);
  const [powerwall, setPowerwall]   = useState<PowerwallState | null>(null);
  const [grid, setGrid]             = useState<GridState | null>(null);
  const [tesla, setTesla]           = useState<TeslaState | null>(null);
  const [outdoor, setOutdoor]       = useState<OutdoorState | null>(null);
  const [connError, setConnError]  = useState<string | null>(null);
  const [selectedRoomId, setRoomId] = useState<string | null>(null);
  const [teslaControl, setTeslaControl] = useState<{ climate: ControlStatus; lock: ControlStatus }>({ climate: "idle", lock: "idle" });

  // Full snapshot kept locally so aggregate cards (solar/powerwall/grid/
  // tesla/outdoor, each backed by several entities) can be recomputed from
  // one changed entity without a network re-fetch.
  const statesRef = useRef<HAStateMap>({});
  const clientRef = useRef<HAClient | null>(null);
  const lightPendingRef = useRef<Map<string, ReturnType<typeof setTimeout>>>(new Map());
  const teslaPendingRef = useRef<Map<"climate" | "lock", ReturnType<typeof setTimeout>>>(new Map());

  useEffect(() => {
    if (!HA_URL || !HA_TOKEN) {
      setConnError("Missing VITE_HA_URL / VITE_HA_TOKEN — see .env.example");
      return;
    }

    const client = new HAClient({ url: HA_URL, token: HA_TOKEN });
    clientRef.current = client;

    client.fetchStates()
      .then((states) => {
        statesRef.current = states;
        setRooms(mapHAStatesToRooms(states));
        setSolar(mapHAStatesToSolar(states));
        setPowerwall(mapHAStatesToPowerwall(states));
        setGrid(mapHAStatesToGrid(states));
        setTesla(mapHAStatesToTesla(states));
        setOutdoor(mapHAStatesToOutdoor(states));
      })
      .catch((err) => setConnError(err instanceof Error ? err.message : String(err)));

    client.connect();
    const unsubConn  = client.onConnectionChange((connected) => setConnError(connected ? null : "Reconnecting to Home Assistant…"));
    const unsubState = client.onStateChanged((entityId, entity) => {
      statesRef.current = { ...statesRef.current, [entityId]: entity };
      const states = statesRef.current;

      if (isLightEntity(entityId)) {
        const pending = lightPendingRef.current.get(entityId);
        if (pending) { clearTimeout(pending); lightPendingRef.current.delete(entityId); }

        const updated = mapLightEntity(entity);
        setRooms((prev) => prev.map((r) => (
          r.lights.some((l) => l.id === entityId)
            ? { ...r, lights: r.lights.map((l) => (l.id === entityId ? updated : l)) }
            : r
        )));
      } else if (isSolarEntity(entityId)) {
        setSolar(mapHAStatesToSolar(states));
      } else if (isPowerwallEntity(entityId)) {
        setPowerwall(mapHAStatesToPowerwall(states));
      } else if (isGridEntity(entityId)) {
        setGrid(mapHAStatesToGrid(states));
      } else if (isTeslaEntity(entityId)) {
        if (entityId === HA_ENTITIES.teslaClimate) {
          const pending = teslaPendingRef.current.get("climate");
          if (pending) { clearTimeout(pending); teslaPendingRef.current.delete("climate"); setTeslaControl((s) => ({ ...s, climate: "idle" })); }
        }
        if (entityId === HA_ENTITIES.teslaLock) {
          const pending = teslaPendingRef.current.get("lock");
          if (pending) { clearTimeout(pending); teslaPendingRef.current.delete("lock"); setTeslaControl((s) => ({ ...s, lock: "idle" })); }
        }
        setTesla(mapHAStatesToTesla(states));
      } else if (isOutdoorEntity(entityId)) {
        setOutdoor(mapHAStatesToOutdoor(states));
      }
    });

    return () => {
      unsubConn();
      unsubState();
      client.disconnect();
      lightPendingRef.current.forEach(clearTimeout);
      lightPendingRef.current.clear();
      teslaPendingRef.current.forEach(clearTimeout);
      teslaPendingRef.current.clear();
    };
  }, []);

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

  // Room-level bulk toggle/brightness: no separate room-level pending state —
  // each affected light fires its own independent controlLight() call and
  // rides the same per-light pending → confirmed cycle from step 4. The
  // room card's dots/aggregates are already computed from real cardState,
  // so they reflect reality as each light confirms independently.
  const handleRoomToggle = useCallback((room: Room, on: boolean) => {
    room.lights.forEach((l) => { if (l.cardState !== "error") handleLightToggle(l.id, on); });
  }, [handleLightToggle]);

  const handleRoomBrightness = useCallback((room: Room, brightnessPct: number) => {
    room.lights.forEach((l) => { if (l.cardState === "on") handleLightBrightness(l.id, brightnessPct); });
  }, [handleLightBrightness]);

  // Whole-house bulk toggle/brightness: same fan-out, just across every
  // room's lights instead of one room's. The brightness slider debounces in
  // HouseView before this ever fires, since this is even more flood-prone
  // (potentially 15+ lights at once) than the room-level case.
  const handleHouseToggle = useCallback((on: boolean) => {
    rooms.forEach((room) => room.lights.forEach((l) => { if (l.cardState !== "error") handleLightToggle(l.id, on); }));
  }, [rooms, handleLightToggle]);

  const handleHouseBrightness = useCallback((brightnessPct: number) => {
    rooms.forEach((room) => room.lights.forEach((l) => { if (l.cardState === "on") handleLightBrightness(l.id, brightnessPct); }));
  }, [rooms, handleLightBrightness]);

  // ─── Tesla control: pending → confirmed cycle ────────────────────────────
  const controlTesla = useCallback((key: "climate" | "lock", domain: string, service: string, entityId: string) => {
    const client = clientRef.current;
    if (!client) return;

    const existing = teslaPendingRef.current.get(key);
    if (existing) clearTimeout(existing);

    setTeslaControl((s) => ({ ...s, [key]: "pending" }));
    client.callService(domain, service, {}, { entity_id: entityId });

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

  const updateRoom  = useCallback((id: string, p: Partial<Room>) => setRooms((prev) => prev.map((r) => r.id === id ? { ...r, ...p } : r)), []);
  const selectedRoom = rooms.find((r) => r.id === selectedRoomId) ?? null;

  if (connError && !solar) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: "var(--tactus-bg-base)" }}>
        <p className="text-[14px]" style={{ fontFamily: "var(--tactus-font-sans)", color: "var(--tactus-text-muted)" }}>{connError}</p>
      </div>
    );
  }

  if (!solar || !powerwall || !grid || !tesla || !outdoor) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: "var(--tactus-bg-base)" }}>
        <p className="text-[14px]" style={{ fontFamily: "var(--tactus-font-sans)", color: "var(--tactus-text-muted)" }}>Connecting to Home Assistant…</p>
      </div>
    );
  }

  return (
    <AnimatePresence mode="wait">
      {selectedRoom ? (
        <motion.div key={selectedRoom.id} initial={{ opacity: 0, x: 24 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -24 }} transition={{ duration: 0.22, ease: "easeInOut" }}>
          <RoomView room={selectedRoom} onBack={() => setRoomId(null)} onUpdateRoom={(p) => updateRoom(selectedRoom.id, p)}
            onLightToggle={handleLightToggle} onLightBrightness={handleLightBrightness} onLightColor={handleLightColor} onLightColorTemp={handleLightColorTemp} />
        </motion.div>
      ) : (
        <motion.div key="house" initial={{ opacity: 0, x: -24 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 24 }} transition={{ duration: 0.22, ease: "easeInOut" }}>
          <HouseView rooms={rooms} solar={solar} powerwall={powerwall} grid={grid} tesla={tesla} outdoor={outdoor}
            onNavigate={setRoomId}
            teslaControl={teslaControl} onToggleTeslaClimate={handleToggleTeslaClimate} onToggleTeslaLock={handleToggleTeslaLock}
            onRoomToggle={handleRoomToggle} onRoomBrightness={handleRoomBrightness}
            onHouseToggle={handleHouseToggle} onHouseBrightness={handleHouseBrightness} />
        </motion.div>
      )}
    </AnimatePresence>
  );
}
