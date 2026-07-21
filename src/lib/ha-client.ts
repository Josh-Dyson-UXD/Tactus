export type HAEntity = {
  entity_id: string;
  state: string;
  attributes: Record<string, unknown>;
  last_changed: string;
  last_updated: string;
};

export type HAStateMap = Record<string, HAEntity>;

// Merge a freshly-fetched REST snapshot into a cached state map without
// letting a stale fetched value beat a fresher one already in the cache — a
// state_changed event can land (and get merged into the cache directly) at
// any point between a fetch being issued and its response arriving. Compares
// last_updated per entity; strict > only, cached wins ties, since HA reports
// microsecond precision that Date.parse truncates to milliseconds — a real
// event 0.x ms newer than the snapshot can otherwise compare equal, and >=
// would let the stale snapshot value win that tie. If either timestamp is
// unparseable, keep the cached entity rather than guess.
export function mergeStates(cached: HAStateMap, fetched: HAStateMap): HAStateMap {
  const merged = { ...cached };
  for (const [id, entity] of Object.entries(fetched)) {
    const existing = merged[id];
    if (!existing) { merged[id] = entity; continue; }
    const fetchedTime = Date.parse(entity.last_updated);
    const existingTime = Date.parse(existing.last_updated);
    if (Number.isNaN(fetchedTime) || Number.isNaN(existingTime)) continue;
    if (fetchedTime > existingTime) merged[id] = entity;
  }
  return merged;
}

export type HAConfig = { url: string; token: string };

type StateChangedListener = (entityId: string, entity: HAEntity) => void;
type ConnectionListener = (connected: boolean) => void;
type AuthErrorListener = (message: string) => void;

// Local-network-only client: talks directly to Home Assistant's REST + WebSocket
// API from the browser. No proxy — the long-lived token lives in this session's
// env only and never leaves the LAN. See CLAUDE.md "Home Assistant integration".
export class HAClient {
  private config: HAConfig;
  private ws: WebSocket | null = null;
  private msgId = 1;
  private reconnectTimer: ReturnType<typeof setTimeout> | null = null;
  private stateListeners = new Set<StateChangedListener>();
  private connectionListeners = new Set<ConnectionListener>();
  private authErrorListeners = new Set<AuthErrorListener>();

  constructor(config: HAConfig) {
    this.config = config;
  }

  private get restBase() {
    return this.config.url.replace(/\/$/, "");
  }

  private get wsUrl() {
    return this.restBase.replace(/^http/, "ws") + "/api/websocket";
  }

  // Initial load: REST snapshot of every entity's current state.
  async fetchStates(): Promise<HAStateMap> {
    const res = await fetch(`${this.restBase}/api/states`, {
      headers: {
        Authorization: `Bearer ${this.config.token}`,
        "Content-Type": "application/json",
      },
    });
    if (!res.ok) throw new Error(`GET /api/states failed: ${res.status} ${res.statusText}`);
    const entities: HAEntity[] = await res.json();
    return Object.fromEntries(entities.map((e) => [e.entity_id, e]));
  }

  // Live updates: authenticate over WebSocket, subscribe to state_changed,
  // and reconnect automatically if the connection drops.
  connect() {
    if (this.ws) return;
    const ws = new WebSocket(this.wsUrl);
    this.ws = ws;

    ws.onmessage = (ev) => {
      const msg = JSON.parse(ev.data);
      switch (msg.type) {
        case "auth_required":
          ws.send(JSON.stringify({ type: "auth", access_token: this.config.token }));
          break;
        case "auth_ok":
          this.connectionListeners.forEach((l) => l(true));
          this.send({ type: "subscribe_events", event_type: "state_changed" });
          break;
        case "auth_invalid":
          console.error("HA WebSocket auth failed:", msg.message);
          this.authErrorListeners.forEach((l) => l(msg.message ?? "Home Assistant rejected the access token"));
          ws.close();
          break;
        case "event": {
          const data = msg.event?.data;
          if (msg.event?.event_type === "state_changed" && data?.new_state) {
            this.stateListeners.forEach((l) => l(data.entity_id, data.new_state));
          }
          break;
        }
      }
    };

    ws.onclose = () => {
      this.ws = null;
      this.connectionListeners.forEach((l) => l(false));
      this.reconnectTimer = setTimeout(() => this.connect(), 3000);
    };

    ws.onerror = () => ws.close();
  }

  disconnect() {
    if (this.reconnectTimer) clearTimeout(this.reconnectTimer);
    this.ws?.close();
    this.ws = null;
  }

  private send(payload: Record<string, unknown>) {
    if (!this.ws || this.ws.readyState !== WebSocket.OPEN) return;
    const id = this.msgId++;
    this.ws.send(JSON.stringify({ id, ...payload }));
    return id;
  }

  // Control channel for step 4 — not called anywhere yet.
  callService(domain: string, service: string, serviceData: Record<string, unknown> = {}, target?: Record<string, unknown>) {
    this.send({ type: "call_service", domain, service, service_data: serviceData, target });
  }

  onStateChanged(listener: StateChangedListener) {
    this.stateListeners.add(listener);
    return () => this.stateListeners.delete(listener);
  }

  onConnectionChange(listener: ConnectionListener) {
    this.connectionListeners.add(listener);
    return () => this.connectionListeners.delete(listener);
  }

  // Fatal auth failure (invalid/revoked token) — distinct from a transient
  // connection drop, which onConnectionChange(false) already covers and
  // which self-heals via the reconnect timer. This won't self-heal without
  // the token being fixed, so the caller needs an honest, specific message
  // rather than an endless "Reconnecting…" loop with the real cause only in
  // the console.
  onAuthError(listener: AuthErrorListener) {
    this.authErrorListeners.add(listener);
    return () => this.authErrorListeners.delete(listener);
  }
}
