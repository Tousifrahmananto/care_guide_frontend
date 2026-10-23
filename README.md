# Secure Notes frontend

Plain HTML, CSS and browser JavaScript. No framework, template, package installation or build step. This folder has its own local Git repository on `main`; the backend is its sibling. Origin is [care_guide_frontend](https://github.com/Tousifrahmananto/care_guide_frontend.git). The user handles staging, commits and pushes; no frontend commit or push has been made by the agent.

## Run locally

Start the backend separately with its tested Node runtime and private `.env`. From this frontend folder run:

```powershell
python -m http.server 5500 --bind 127.0.0.1
```

Open **http://localhost:5500**. Do not open index.html as a file or browse the parent workspace containing private environment/study files. If Python is unavailable on another machine, use any local static HTTP server confined to this folder.

`config.js` contains the public API base URL, initially `http://localhost:3000/api`. Backend `FRONTEND_ORIGIN` must exactly equal `http://localhost:5500` (scheme, hostname and port). `localhost` and `127.0.0.1` are different origins. Configure the final HTTPS API base and exact frontend origin when deploying; never put database credentials, a JWT signing secret or Admin passwords in frontend files. All files in this folder are public.

## Functionality

- Register, log in/out and update your name/interests. Each interest has its own text field, preserving commas, Unicode and internal line breaks.
- Create/read/edit/delete your own notes and page through them.
- Create public posts; browse posts and a specific author's posts while signed out.
- Admin: create/list/read/edit/delete users, view all notes or filter by owner, and browse interest groups with independent next-member cursors and a first-member reset.
- All lists request 20 records per page. The API enforces caps and validates fields. Empty pages, errors and unavailable connections have visible messages. Buttons are disabled while their actions run; newer list requests replace older ones.

Admin controls follow the current `/me` response, never a decoded role claim. Refresh account to reload current role/profile. The API independently enforces roles and ownership on every request. Deleting a user requires confirmation and also deletes their notes/posts; self-deletion is disabled and remains prohibited by the API. Blank Admin edit passwords preserve existing credentials.

## Authentication trade-off

The agreed JWT storage is `localStorage` under `secureNotesToken`. It survives reloads, is removed on logout or a protected 401, and is sent only on protected requests to the configured API. Public requests omit the token; browser cookies are omitted. Expiry/deletion is verified by the API. Other tabs reload when this storage key changes.

Any script executing in this origin can read a stored token. Plain text rendering (`textContent`), no third-party scripts and no HTML injection reduce exposure but do not make localStorage immune to XSS or compromised hosting. Use HTTPS for deployment. An HttpOnly-cookie design would require an explicit authentication/CSRF contract change and is not added here. Browser storage must be enabled for persistent sign-in. Forgot-password/email delivery is outside the assessment scope.

## Verification and next task

Backend native tests cover exact-origin CORS, browser preflights and readable errors. Task 9 also runs the real separately served frontend against an isolated local MongoDB-backed API in Chromium; evidence and detailed walkthrough remain outside both repositories in `../notes-api-study/09-frontend.md` and `../development/`.

Task 10 handles deployment, final run/submission documentation and the four submission links. No live URL, Git commit or push is created by this frontend task.
