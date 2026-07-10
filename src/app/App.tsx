import { useState, useCallback, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "motion/react";
import type { Room, SolarState, PowerwallState, GridState, TeslaState, OutdoorState } from "@/types";
import { HAClient } from "@/lib/ha-client";
import type { HAStateMap } from "@/lib/ha-client";
import {
  mapHAStatesToRooms, mapHAStatesToSolar, mapHAStatesToPowerwall, mapHAStatesToGrid,
  mapHAStatesToTesla, mapHAStatesToOutdoor, mapLightEntity,
  isLightEntity, isSolarEntity, isPowerwallEntity, isGridEntity, isTeslaEntity, isOutdoorEntity,
} from "@/lib/ha-types";
import { HouseView } from "@/components/layout/HouseView";
import { RoomView } from "@/components/layout/RoomView";

// Local-network-only: the token stays in this build's env and never leaves
// the LAN. Set VITE_HA_URL / VITE_HA_TOKEN in .env.local (see .env.example).
const HA_URL   = import.meta.env.VITE_HA_URL as string | undefined;
const HA_TOKEN = import.meta.env.VITE_HA_TOKEN as string | undefined;

export default function App() {
  const [rooms, setRooms]           = useState<Room[]>([]);
  const [solar, setSolar]           = useState<SolarState | null>(null);
  const [powerwall, setPowerwall]   = useState<PowerwallState | null>(null);
  const [grid, setGrid]             = useState<GridState | null>(null);
  const [tesla, setTesla]           = useState<TeslaState | null>(null);
  const [outdoor, setOutdoor]       = useState<OutdoorState | null>(null);
  const [connError, setConnError]  = useState<string | null>(null);
  const [selectedRoomId, setRoomId] = useState<string | null>(null);

  // Full snapshot kept locally so aggregate cards (solar/powerwall/grid/
  // tesla/outdoor, each backed by several entities) can be recomputed from
  // one changed entity without a network re-fetch.
  const statesRef = useRef<HAStateMap>({});

  useEffect(() => {
    if (!HA_URL || !HA_TOKEN) {
      setConnError("Missing VITE_HA_URL / VITE_HA_TOKEN — see .env.example");
      return;
    }

    const client = new HAClient({ url: HA_URL, token: HA_TOKEN });

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
        setTesla(mapHAStatesToTesla(states));
      } else if (isOutdoorEntity(entityId)) {
        setOutdoor(mapHAStatesToOutdoor(states));
      }
    });

    return () => {
      unsubConn();
      unsubState();
      client.disconnect();
    };
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
          <RoomView room={selectedRoom} onBack={() => setRoomId(null)} onUpdateRoom={(p) => updateRoom(selectedRoom.id, p)} />
        </motion.div>
      ) : (
        <motion.div key="house" initial={{ opacity: 0, x: -24 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 24 }} transition={{ duration: 0.22, ease: "easeInOut" }}>
          <HouseView rooms={rooms} solar={solar} powerwall={powerwall} grid={grid} tesla={tesla} outdoor={outdoor}
            onNavigate={setRoomId} onUpdateRoom={updateRoom} onUpdateTesla={(p) => setTesla((t) => t && ({ ...t, ...p }))} />
        </motion.div>
      )}
    </AnimatePresence>
  );
}
