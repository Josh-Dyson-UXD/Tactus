
  # Tactus

  A smart-home control dashboard for Home Assistant, built for a wall-mounted
  tablet. Originally a Figma Make export ("Create Interactive Light Switch",
  https://www.figma.com/design/mwTRoo0lqQZPc4U9okSQPj/Create-Interactive-Light-Switch).

  ## Development

  Run `npm i` to install dependencies, then pick one of two modes:

  **Direct-to-HA** (fastest iteration, real token in your own browser only):
  set `VITE_HA_URL` and `VITE_HA_TOKEN` in `.env.local` (see `.env.example`),
  then `npm run dev`.

  **Through the proxy** (exercises the same path production uses — catches
  proxy-only bugs the direct mode can't): leave `VITE_HA_URL`/`VITE_HA_TOKEN`
  unset, run the proxy separately with its own env
  (`HA_URL=... HA_TOKEN=... npm run start --prefix server`, listening on
  `:8080` by default), then `npm run dev`. Vite's dev server proxies `/api`
  (REST and the WebSocket upgrade) through to `:8080`, and `HAClient` defaults
  its base URL to `window.location.origin` (`:5173`) whenever `VITE_HA_URL`
  isn't set, so the request path matches production exactly.

  ## Deployment

  Tactus is served by a small Node proxy (`server/`) that sits between the
  browser and Home Assistant. The reason it exists: a static build inlines
  `VITE_HA_TOKEN` into the JS bundle, so anyone on the LAN could read a
  full-control HA token straight out of the page source. The proxy holds the
  real token server-side instead — the browser never has it. It also locks
  REST access down to an allowlist (Tactus only ever calls `GET
  /api/states`) rather than proxying all of `/api/*`, and intercepts just the
  WebSocket `auth` frame to substitute the real token, since HA authenticates
  in-band over the socket rather than via a header (a plain nginx/Caddy
  reverse proxy can't do this part).

  ### Build and run

  ```sh
  cp .env.example .env
  # edit .env: set HA_URL to your Home Assistant instance and HA_TOKEN to a
  # long-lived access token (see below). Leave the VITE_HA_* vars commented
  # out — see the warning in .env.example.

  docker compose up -d --build
  ```

  This builds the app (`vite build` → `dist/`) in one stage and runs only the
  proxy + static output in the runtime image — no build tooling ships in the
  deployed container. Serves on `:8080` (`docker-compose.yml`'s port mapping),
  restarts automatically (`restart: unless-stopped`), and reads `HA_URL`/
  `HA_TOKEN` from `.env`, which is gitignored.

  To run the proxy without Docker: `HA_URL=... HA_TOKEN=... npm run
  start --prefix server` (after `npm run build` has produced `dist/`).

  ### Generating and rotating the access token

  In Home Assistant: profile → Security → Long-Lived Access Tokens → Create
  Token. Paste it into `.env` as `HA_TOKEN`. To rotate: create a new token in
  HA, update `.env`, then `docker compose up -d --build` (or just `restart`
  if `dist/` hasn't changed) to pick it up, and revoke the old token in HA
  once the new one is confirmed working. The token never appears in the
  browser at any point, so rotating it doesn't require touching any client.
  