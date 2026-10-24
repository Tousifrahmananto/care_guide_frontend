# Secure Notes frontend

Browser interface for Secure Notes, built with plain HTML, CSS and JavaScript. It connects to the separate [backend API](https://github.com/Tousifrahmananto/care_guide_backend) and needs no package installation or build step.

| Resource | Link |
| --- | --- |
| Live site | [care-guide-notes.vercel.app](https://care-guide-notes.vercel.app) |
| Public API | [care-guide-notes-api.onrender.com/api/posts](https://care-guide-notes-api.onrender.com/api/posts) |
| Frontend repository | [care_guide_frontend](https://github.com/Tousifrahmananto/care_guide_frontend) |

The API base path is `/api`. The public API link opens a working endpoint. Render's free backend can take about a minute to wake after inactivity.

## What you can do

- Register, log in/out and update your name and interests. Each interest has its own text field, which preserves commas, Unicode and internal line breaks.
- Create, read, edit and delete your own notes, with pagination for the list.
- Publish posts while signed in. Browse public posts or one author's posts while signed out.
- As an Admin, create, list, read, edit and delete users; browse all notes or filter them by owner; and view interest groups with next-member cursors and a first-member reset.

Admin controls follow the current `/me` response. Refresh account reloads the profile and role. The API enforces permissions and ownership independently of which controls the browser shows.

Deleting a user requires confirmation and removes that user's notes and posts. Self-deletion is disabled in the UI and prohibited by the API. Leaving an Admin edit password blank preserves the existing password.

## Run locally

Start the backend using its README and private `.env`. Configure the two origins before opening the frontend:

- Set `API_BASE_URL` in `config.js` to `http://localhost:3000/api`.
- Set the local backend's `FRONTEND_ORIGIN` to `http://localhost:5500`.

Scheme, hostname and port must match. `localhost` and `127.0.0.1` are different origins. The committed frontend configuration targets the hosted API, so restore its HTTPS address before publishing local changes.

From this frontend directory, run:

```powershell
python -m http.server 5500 --bind 127.0.0.1
```

Open http://localhost:5500. If Python is unavailable, another static HTTP server can serve this directory. Opening `index.html` directly does not provide the HTTP origin required by CORS.

Serve only the frontend directory. Its parent can contain private backend configuration, and every file served here is public. Keep database credentials, JWT signing secrets and Admin passwords out of frontend files.

For a deployed frontend, the request helper rejects a non-HTTPS or loopback API URL before making a request. This catches an incorrect `config.js`; the backend still needs to be available and allow the frontend's origin.

## Requests and authentication

List requests ask for 20 records, and the API separately validates pagination and caps limits. Refresh controls retry reads without submitting forms. Empty lists and failed requests have visible messages. Buttons are disabled while their actions run, and newer list requests replace older ones.

The browser stores JWTs in `localStorage` under `secureNotesToken`. A token survives reloads and is sent only on protected requests to the configured API. Public requests omit the token, and requests omit browser cookies. Logout and a protected 401 clear the saved token. The API checks expiry and account deletion; other tabs reload when the storage key changes.

An injected script on this origin could read the stored token. User content is rendered with `textContent`, without HTML injection or third-party scripts, but localStorage remains exposed to XSS or compromised hosting. Use HTTPS and enable browser storage for persistent sign-in. Moving authentication to HttpOnly cookies would require changes to both the backend transport and CSRF handling.

Password recovery and email delivery are outside the current application scope.

## Project files

| File | Purpose |
| --- | --- |
| `index.html` | Labeled forms, navigation and public/private/Admin views |
| `app.js` | API requests, authentication state, forms, pagination and text rendering |
| `config.js` | Public API base URL; contains no credentials |
| `styles.css` | Responsive layout, readable controls and keyboard focus states |

## Check the integration

With both servers running:

1. Browse public posts while signed out, change pages and find an author's posts using their ID.
2. Register and log in. Confirm that an ordinary account cannot see Admin controls.
3. Create, edit and delete a note. Check that another account cannot read or change it.
4. Save profile interests and confirm they survive a reload.
5. Sign in as an Admin, manage users, inspect all notes and page through interest-group members.
6. Log out and confirm private views clear. Check the error messages with an unavailable API or expired token.

Titles, contents, names and interests should appear as text, including values that resemble HTML. Repeat these checks after API configuration or authentication changes. The hosted integration covers registration/login, note saving, persistent sessions, logout and public pagination.

## Deployment

The Vercel project `care-guide-notes` is connected to this repository. Use the Other framework preset, repository root `.`, no build command and root output. The deployed files are `index.html`, `app.js`, `styles.css` and `config.js`. Pushes to `main` can deploy through the Git integration.

Set `API_BASE_URL` to `https://care-guide-notes-api.onrender.com/api`. The backend must allow `https://care-guide-notes.vercel.app` through `FRONTEND_ORIGIN`. Serve `.js` modules with a JavaScript MIME type and check the integration after deployment. Store MongoDB connection strings, JWT signing secrets and Admin credentials only on the backend.

## Troubleshooting

| Symptom | What to check |
| --- | --- |
| API connection error | Backend availability, API URL, HTTPS and the exact allowed frontend origin |
| Public HTTPS configuration message | Replace the local API URL in `config.js` before hosting |
| Login returns 429 | Login and registration share ten attempts per IP per 15 minutes; proxy settings must preserve actual client addresses |
| Private views disappear | Token expiry, a deleted account or a login change in another tab |
| Admin controls are missing | The account's current role; use Refresh account after a role change |
| Sign-in does not survive reload | Browser storage must be enabled for this origin |
| First request takes much longer | The Render free instance may be waking after inactivity |
