import { useState, useCallback } from "react";
import { motion, AnimatePresence } from "motion/react";
import { COLORS } from "@/types";
import type { Room, SolarState, PowerwallState, GridState, TeslaState, OutdoorState } from "@/types";
import { HouseView } from "@/components/layout/HouseView";
import { RoomView } from "@/components/layout/RoomView";

// ─── Initial data ─────────────────────────────────────────────────────────────

const INITIAL_OUTDOOR: OutdoorState = { tempC: 16.2, humidity: 68, aqi: 8, pm25: 2.1, condition: "Partly cloudy" };

const INITIAL_SOLAR: SolarState = {
  generatingKw: 4.2, todayKwh: 28.6, status: "generating",
  hourly: [0,0,0,0,0,0.1,0.4,1.1,2.2,3.4,4.2,4.8,4.9,4.5,3.9,3.1,2.1,1.1,0.3,0,0,0,0,0],
};
const INITIAL_POWERWALL: PowerwallState = { pct: 78, flowKw: 1.4, reservePct: 20, status: "charging" };
const INITIAL_GRID: GridState = { importKw: 0, exportKw: 1.1 };
const INITIAL_TESLA: TeslaState = { model: "Model Y", batteryPct: 68, rangeKm: 285, status: "parked", tempC: 22, climateOn: false, locked: true, location: "Parked at home" };

const INITIAL_ROOMS: Room[] = [
  {
    id: "living-room", name: "Living Room", roomBrightness: 75, roomColor: COLORS[0],
    lights: [
      { id: "lr-ceiling",   device: "Ceiling Lamp",    type: "light", cardState: "on",    panel: "summary", brightness: 75, selectedColor: COLORS[0] },
      { id: "lr-floor",     device: "Floor Lamp",      type: "light", cardState: "off",   panel: "summary", brightness: 50, selectedColor: COLORS[0] },
      { id: "lr-table",     device: "Table Lamp",      type: "light", cardState: "on",    panel: "summary", brightness: 60, selectedColor: COLORS[2] },
      { id: "lr-tv",        device: "TV Backlight",    type: "light", cardState: "on",    panel: "summary", brightness: 40, selectedColor: COLORS[4] },
      { id: "lr-bookshelf", device: "Bookshelf Light", type: "light", cardState: "on",    panel: "summary", brightness: 85, selectedColor: COLORS[5] },
      { id: "lr-entry",     device: "Entry Spot",      type: "light", cardState: "error", panel: "summary", brightness: 70, selectedColor: COLORS[0] },
    ],
    switches: [
      { id: "lr-tv-plug", device: "Television",   type: "switch", isOn: true,  wattsNow: 145, todayKwh: 2.3 },
      { id: "lr-console", device: "Game Console", type: "switch", isOn: false, wattsNow: 0,   todayKwh: 1.1 },
    ],
    sensors: [
      { id: "lr-temp",   device: "Temperature", type: "sensor", data: { kind: "temp",     tempC: 22.5, trend: "stable" } },
      { id: "lr-humid",  device: "Humidity",    type: "sensor", data: { kind: "humidity",  humidity: 48 } },
      { id: "lr-motion", device: "Motion",      type: "sensor", data: { kind: "motion",    motionDetected: true,  lastSeen: "just now" } },
      { id: "lr-aqi",    device: "Air Quality", type: "sensor", data: { kind: "aqi",       aqi: 12, co2: 650, pm25: 3.2 } },
    ],
  },
  {
    id: "bedroom", name: "Bedroom", roomBrightness: 28, roomColor: COLORS[0],
    lights: [
      { id: "bd-ceiling", device: "Ceiling Light", type: "light", cardState: "off", panel: "summary", brightness: 80, selectedColor: COLORS[0] },
      { id: "bd-left",    device: "Bedside Left",  type: "light", cardState: "on",  panel: "summary", brightness: 30, selectedColor: COLORS[0] },
      { id: "bd-right",   device: "Bedside Right", type: "light", cardState: "on",  panel: "summary", brightness: 25, selectedColor: COLORS[0] },
    ],
    switches: [],
    sensors: [
      { id: "bd-temp",   device: "Temperature", type: "sensor", data: { kind: "temp",     tempC: 19.2, trend: "down" } },
      { id: "bd-humid",  device: "Humidity",    type: "sensor", data: { kind: "humidity",  humidity: 52 } },
      { id: "bd-motion", device: "Motion",      type: "sensor", data: { kind: "motion",    motionDetected: false, lastSeen: "6 hrs ago" } },
    ],
  },
  {
    id: "kitchen", name: "Kitchen", roomBrightness: 87, roomColor: COLORS[1],
    lights: [
      { id: "kt-ceiling", device: "Ceiling Light",  type: "light", cardState: "on",  panel: "summary", brightness: 100, selectedColor: COLORS[1] },
      { id: "kt-counter", device: "Counter Strips", type: "light", cardState: "on",  panel: "summary", brightness: 70,  selectedColor: COLORS[1] },
      { id: "kt-island",  device: "Island Light",   type: "light", cardState: "on",  panel: "summary", brightness: 90,  selectedColor: COLORS[0] },
      { id: "kt-cabinet", device: "Cabinet Light",  type: "light", cardState: "off", panel: "summary", brightness: 50,  selectedColor: COLORS[1] },
    ],
    switches: [
      { id: "kt-dishwasher", device: "Dishwasher",   type: "switch", isOn: true,  wattsNow: 1200, todayKwh: 1.8 },
      { id: "kt-coffee",     device: "Coffee Maker", type: "switch", isOn: false, wattsNow: 0,    todayKwh: 0.3 },
    ],
    sensors: [
      { id: "kt-temp",   device: "Temperature", type: "sensor", data: { kind: "temp",   tempC: 24.1, trend: "up" } },
      { id: "kt-motion", device: "Motion",      type: "sensor", data: { kind: "motion", motionDetected: true,  lastSeen: "1 min ago" } },
      { id: "kt-aqi",    device: "Air Quality", type: "sensor", data: { kind: "aqi",    aqi: 38, co2: 820, pm25: 6.1 } },
    ],
  },
  {
    id: "office", name: "Office", roomBrightness: 65, roomColor: COLORS[1],
    lights: [
      { id: "of-ceiling", device: "Ceiling Light", type: "light", cardState: "off", panel: "summary", brightness: 80, selectedColor: COLORS[1] },
      { id: "of-desk",    device: "Desk Lamp",     type: "light", cardState: "on",  panel: "summary", brightness: 85, selectedColor: COLORS[1] },
      { id: "of-shelf",   device: "Shelf Light",   type: "light", cardState: "on",  panel: "summary", brightness: 45, selectedColor: COLORS[2] },
    ],
    switches: [
      { id: "of-pc",      device: "Desktop PC", type: "switch", isOn: true, wattsNow: 180, todayKwh: 3.2 },
      { id: "of-monitor", device: "Monitor",    type: "switch", isOn: true, wattsNow: 45,  todayKwh: 0.8 },
    ],
    sensors: [
      { id: "of-temp",   device: "Temperature", type: "sensor", data: { kind: "temp",   tempC: 21.8, trend: "stable" } },
      { id: "of-motion", device: "Motion",      type: "sensor", data: { kind: "motion", motionDetected: true,  lastSeen: "just now" } },
      { id: "of-aqi",    device: "Air Quality", type: "sensor", data: { kind: "aqi",    aqi: 22, co2: 780, pm25: 4.5 } },
    ],
  },
  {
    id: "hallway", name: "Hallway", roomBrightness: 50, roomColor: COLORS[0],
    lights: [
      { id: "hl-entrance", device: "Entrance Light", type: "light", cardState: "off", panel: "summary", brightness: 60, selectedColor: COLORS[0] },
      { id: "hl-stairs",   device: "Stair Light",    type: "light", cardState: "off", panel: "summary", brightness: 40, selectedColor: COLORS[0] },
    ],
    switches: [],
    sensors: [
      { id: "hl-motion", device: "Motion", type: "sensor", data: { kind: "motion", motionDetected: false, lastSeen: "22 min ago" } },
    ],
  },
  {
    id: "bathroom", name: "Bathroom", roomBrightness: 90, roomColor: COLORS[1],
    lights: [
      { id: "bt-ceiling", device: "Ceiling Light", type: "light", cardState: "on", panel: "summary", brightness: 100, selectedColor: COLORS[1] },
      { id: "bt-mirror",  device: "Mirror Light",  type: "light", cardState: "on", panel: "summary", brightness: 80,  selectedColor: COLORS[1] },
    ],
    switches: [],
    sensors: [
      { id: "bt-temp",  device: "Temperature", type: "sensor", data: { kind: "temp",     tempC: 23.4, trend: "stable" } },
      { id: "bt-humid", device: "Humidity",    type: "sensor", data: { kind: "humidity",  humidity: 72 } },
    ],
  },
];

// ─── App ──────────────────────────────────────────────────────────────────────

export default function App() {
  const [rooms, setRooms]           = useState<Room[]>(INITIAL_ROOMS);
  const [solar]                     = useState<SolarState>(INITIAL_SOLAR);
  const [powerwall]                 = useState<PowerwallState>(INITIAL_POWERWALL);
  const [grid]                      = useState<GridState>(INITIAL_GRID);
  const [tesla, setTesla]           = useState<TeslaState>(INITIAL_TESLA);
  const [outdoor]                   = useState<OutdoorState>(INITIAL_OUTDOOR);
  const [selectedRoomId, setRoomId] = useState<string | null>(null);

  const updateRoom  = useCallback((id: string, p: Partial<Room>) => setRooms((prev) => prev.map((r) => r.id === id ? { ...r, ...p } : r)), []);
  const selectedRoom = rooms.find((r) => r.id === selectedRoomId) ?? null;

  return (
    <AnimatePresence mode="wait">
      {selectedRoom ? (
        <motion.div key={selectedRoom.id} initial={{ opacity: 0, x: 24 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -24 }} transition={{ duration: 0.22, ease: "easeInOut" }}>
          <RoomView room={selectedRoom} onBack={() => setRoomId(null)} onUpdateRoom={(p) => updateRoom(selectedRoom.id, p)} />
        </motion.div>
      ) : (
        <motion.div key="house" initial={{ opacity: 0, x: -24 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 24 }} transition={{ duration: 0.22, ease: "easeInOut" }}>
          <HouseView rooms={rooms} solar={solar} powerwall={powerwall} grid={grid} tesla={tesla} outdoor={outdoor}
            onNavigate={setRoomId} onUpdateRoom={updateRoom} onUpdateTesla={(p) => setTesla((t) => ({ ...t, ...p }))} />
        </motion.div>
      )}
    </AnimatePresence>
  );
}
