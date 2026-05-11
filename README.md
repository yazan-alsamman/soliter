# MediFlow AI · Clinical Portal

A **Smart Clinic Management System** (internal-only) built with strict **role-based access control (RBAC)**. Each role sees a focused, distraction-free interface tailored to its responsibilities.

> Built from the **Clinical Clarity** design system (Manrope display + Inter body, soft medical blue palette, rounded geometry, ambient shadows).

## Stack

- **React 19** + **Vite**
- **Tailwind CSS** (design tokens mapped 1:1 to the spec)
- **Material UI** (theme + base components)
- **Framer Motion** (page transitions, list reveals, drawer/modal motion, gauge animations)
- **Recharts** (analytics)
- **React Router** (route-level RBAC guards)
- **Heroicons** (line iconography)

## Run it

```bash
cd mediflow
npm install
npm run dev
```

Open the URL printed in the terminal (default `http://localhost:5173`).

## Production: frontend and API on different domains (CORS)

If the React app is on one host and the Nest API on another, the browser sends a **cross-origin** request. The API must answer the **OPTIONS preflight** with `Access-Control-Allow-Origin` (and related headers). If you see *“No 'Access-Control-Allow-Origin' header”*, the backend is not applying CORS for that exact browser origin.

### Checklist (Hostinger)

1. **Exact origin** — Copy the frontend URL from the address bar (scheme + host, no path). Hostinger free subdomains often differ by one letter, e.g. **`lightslategray-…`** vs **`lightslategrey-…`**. The value in the API env must match **character-for-character**. You can list several origins separated by commas.
2. **Env variable name** — Your Nest code must read the same variable you set in hPanel. Common names are **`CORS_ORIGINS`** or **`FRONTEND_ORIGINS`**. If the repo uses `process.env.CORS_ORIGINS` but you only set `FRONTEND_ORIGINS`, CORS will stay broken.
3. **Restart the API** after saving environment variables on the **API** website (darkgoldenrod…), not only the frontend.
4. **Frontend build:** `VITE_API_BASE_URL` must include the global API prefix, usually **`…/api`** (example: `https://darkgoldenrod-mosquito-506155.hostingersite.com/api`). Without `/api`, paths will be wrong.

In **`main.ts`** of the Nest API (after `NestFactory.create`), wire the variable your project actually uses, for example:

```ts
const raw = process.env.CORS_ORIGINS ?? process.env.FRONTEND_ORIGINS ?? "";
const origins = raw
  .split(",")
  .map((s) => s.trim())
  .filter(Boolean);

app.enableCors({
  origin: origins.length ? origins : true,
  credentials: true,
  methods: ["GET", "HEAD", "PUT", "PATCH", "POST", "DELETE", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization", "X-Tenant-Id"],
});
```

Example hPanel value for **`CORS_ORIGINS`** / **`FRONTEND_ORIGINS`** (adjust host to match your real frontend URL):

`https://lightslategray-hamster-508054.hostingersite.com`

The SPA reads the API base from **`/config.json`** (`apiBase`) or from **`VITE_API_BASE_URL`** at build time; see **`public/config.example.json`** (includes the deployed MediFlow API host — copy into `public/config.json` before a production build, or overwrite `dist/config.json` after build).

## Hostinger (Node.js web app + Git) — Vite build

In hPanel → Node.js app → build settings (or edit after import):

| Field | Value |
| ----- | ----- |
| Framework | **Vite** (or **Other** if auto-detect fails) |
| Install command | `npm install` (or `npm ci` if you rely on `package-lock.json`) |
| Build command | `npm run build` |
| Output / publish directory | **`dist`** |

- **Repository root** must be the folder that contains this `package.json` (not a parent monorepo folder unless you set “Root directory” to the subfolder).
- Use **Node.js 20** or newer (see `.nvmrc`). Electron is **optional** so installs do not fail when the platform skips the desktop binary.
- If the dashboard shows a generic “build failed” message, open **Deployments → latest deployment → full build log**; the real error is always in that log.
- **Hostinger MCP in Cursor:** use **`.cursor/mcp.json.example`** — copy its `mcpServers` block into Cursor’s MCP config, set `API_TOKEN` to a token from hPanel → Dev tools → API. **Do not commit** a real `mcp.json` (it is listed in `.gitignore`).

## Roles & how to switch

A **role pill** is rendered in the topbar — click any of:

- **Receptionist** (default) — fast workflow, AI Smart Booking, full bookings + patients + billing CRUD
- **Doctor** — minimal UI, read-only schedule (filtered to their own bookings), patient notes only
- **Admin** — full system access incl. Inventory, Reports, Settings

Routes are guarded by `Protected` in `src/App.jsx` and the sidebar **dynamically rebuilds** per role. Disallowed routes redirect to a friendly _Restricted Area_ screen.

## Project structure

```
src/
  context/AuthContext.jsx      Role + permission map (single source of truth)
  components/layout/           Sidebar, Topbar, AppLayout
  components/ui/               StatCard, Chip
  pages/                       Dashboard, Appointments, Patients, PatientDetail,
                               Billing, Inventory, Reports, Settings, NotAllowed
  data/mock.js                 Sample patients, appointments, invoices, inventory…
  theme.js                     MUI theme aligned to the design system
  index.css                    Tailwind + component classes (.btn-primary, .card, …)
tailwind.config.js             Design tokens (colors, radii, shadows, animations)
```

## Permission matrix (excerpt)

| Module       | Receptionist | Doctor       | Admin |
| ------------ | ------------ | ------------ | ----- |
| Dashboard    | ✓ (limited)  | ✓ (personal) | ✓     |
| Appointments | full         | view-only    | full  |
| Patients     | full CRUD    | view + notes | full  |
| Billing      | create+view  | hidden       | full  |
| Inventory    | hidden       | hidden       | full  |
| Reports      | hidden       | hidden       | full  |
| AI Booking   | ✓            | hidden       | ✓     |

## Design tokens

Matches the **Clinical Clarity** palette and typography exactly:

- Surface: `#f7f9fb` (background) → `#ffffff` (cards)
- Primary: `#005d90` / hover `#0077b6` / soft `#cde5ff`
- Secondary (success): `#126c40` / soft `#a1f5bc`
- Danger: `#ba1a1a` / soft `#ffdad6`
- Radii: `0.5rem` / `1rem` / `2rem`
- Shadows: ambient `0 4px 12px rgba(0,0,0,0.05)`, popover `0 12px 32px rgba(0,0,0,0.1)`

All defined in `tailwind.config.js` so you can use `bg-primary`, `text-ink-mute`, `shadow-card`, `rounded-lg` consistently.
