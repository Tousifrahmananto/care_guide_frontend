# Secure Notes frontend

Browser client for Secure Notes, built with plain HTML, CSS and JavaScript. It connects to the separate [backend API](https://github.com/Tousifrahmananto/care_guide_backend) and has no package installation or build step. Frontend repository: [care_guide_frontend](https://github.com/Tousifrahmananto/care_guide_frontend).

Hosted frontend: [care-guide-notes.vercel.app](https://care-guide-notes.vercel.app). Backend API: [care-guide-notes-api.onrender.com/api/posts](https://care-guide-notes-api.onrender.com/api/posts); its base path is `/api`.

## Run locally

Start the backend using its README and private `.env`. From this frontend folder run:

```powershell
python -m http.server 5500 --bind 127.0.0.1
```

Open **http://localhost:5500**. Serve this directory only; the parent directory can contain private backend configuration. If Python is unavailable, use another static HTTP server confined to this folder. Opening `index.html` directly as a file does not provide the HTTP origin required by the API's CORS policy.

For local development, set `API_BASE_URL` in `config.js` to `http://localhost:3000/api` and the local backend's `FRONTEND_ORIGIN` to `http://localhost:5500` (scheme, hostname and port). The committed configuration targets the hosted API. Restore its HTTPS URL before publishing local changes. `localhost` and `127.0.0.1` are different origins. Never put database credentials, a JWT signing secret or Admin passwords in frontend files. All files in this folder are public.

When this frontend is served from a non-local hostname, the request helper refuses a non-HTTPS or loopback API URL and displays a configuration message before sending any API request. The guard checks configuration; it does not establish backend availability. Verify registration/login, private notes, Admin views and public posts after the API is running.

## Functionality

- Register, log in/out and update your name/interests. Each interest has its own text field, preserving commas, Unicode and internal line breaks.
- Create/read/edit/delete your own notes and page through them.
- Create public posts; browse posts and a specific author's posts while signed out.
- Admin: create/list/read/edit/delete users, view all notes or filter by owner, and browse interest groups with independent next-member cursors and a first-member reset.
- All lists request 20 records per page. The API enforces caps and validates fields. Empty pages, errors and unavailable connections have visible messages. Buttons are disabled while their actions run; newer list requests replace older ones.

Admin controls follow the current `/me` response, never a decoded role claim. Refresh account to reload current role/profile. The API independently enforces roles and ownership on every request. Deleting a user requires confirmation and also deletes their notes/posts; self-deletion is disabled and remains prohibited by the API. Blank Admin edit passwords preserve existing credentials.

## Authentication trade-off

JWTs are stored in `localStorage` under `secureNotesToken`. A token survives reloads, is removed on logout or a protected 401, and is sent only on protected requests to the configured API. Public requests omit the token; browser cookies are omitted. Expiry/deletion is verified by the API. Other tabs reload when this storage key changes.

Any script executing in this origin can read a stored token. Plain text rendering (`textContent`), no third-party scripts and no HTML injection reduce exposure but do not make localStorage immune to XSS or compromised hosting. Use HTTPS for deployment. Moving tokens to HttpOnly cookies would also require a deliberate CSRF and backend transport design. Browser storage must be enabled for persistent sign-in. Password recovery and email delivery are outside the application's current scope.

## Project files

| File | Purpose |
| --- | --- |
| `index.html` | Labeled forms, navigation and public/private/Admin views |
| `app.js` | API requests, authentication state, safe text rendering, forms and pagination |
| `config.js` | Public API base URL; contains no credentials |
| `styles.css` | Responsive layout, readable controls and keyboard focus states |

## Check the integration

With both servers running, verify these flows:

1. Browse public posts while signed out and find an author's posts using their ID.
2. Register and log in. Confirm that ordinary accounts cannot see Admin controls.
3. Create, edit and delete a note. Check that another account cannot read or change it.
4. Edit profile interests and confirm the saved values survive a reload.
5. With an Admin account, manage users, inspect all notes and page through interest-group members.
6. Log out and confirm private views clear. Check readable errors when the API is unavailable or the token expires.

List pages request 20 records; the API validates and caps limits independently. Refresh controls retry reads without submitting forms. User-provided titles, contents, names and interests are rendered as text rather than interpreted as HTML.

## Deployment

The Vercel project `care-guide-notes` is connected to this repository. Use the **Other** framework preset, repository root `.`, no build command and root output. The application consists of `index.html`, `app.js`, `styles.css` and `config.js`; there is no package installation or build step. Pushes to `main` can deploy through the connected Git integration.

`API_BASE_URL` is `https://care-guide-notes-api.onrender.com/api`. The Render backend must allow exactly `https://care-guide-notes.vercel.app` through `FRONTEND_ORIGIN`. Ensure the host serves `.js` modules with a JavaScript MIME type. Keep database connection strings, JWT signing secrets and Admin credentials out of this repository.

The hosted integration supports registration/login, private note saving, persistent sessions, logout and public pagination. The API enforces ownership and Admin permissions independently of the browser. Run the integration checks above after configuration changes. Render's free instance can delay requests after inactivity.

## Troubleshooting

| Symptom | Check |
| --- | --- |
| API connection error | Backend process, API URL, HTTPS and exact allowed frontend origin |
| Public HTTPS configuration message | Replace the local URL in `config.js` before hosting |
| Login returns 429 | Combined login/registration attempts are limited to ten per IP per 15 minutes; hosted proxy settings must preserve real client addresses |
| Private views disappear | Token expired, account was deleted or the stored login changed in another tab |
| Admin controls are missing | Confirm the account's current role; refresh the account after role changes |
| Sign-in cannot persist | Enable browser storage for this origin |
