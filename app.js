import { API_BASE_URL } from './config.js';

const byId = (id) => document.getElementById(id);
const message = (text) => { byId('message').textContent = text; byId('message').dataset.error = 'false'; };
const pendingLists = new Map();
let token = '';
let currentUser = null;
let activeView = 'posts';

function navigate(view) {
  if ((view === 'notes' && !currentUser) || (['users', 'admin-notes', 'groups'].includes(view) && currentUser?.role !== 'admin')) view = 'posts';
  activeView = view;
  for (const section of document.querySelectorAll('[data-view]')) section.hidden = section.dataset.view !== view;
  for (const node of document.querySelectorAll('[data-view-target]')) {
    if (node.dataset.viewTarget === view) node.setAttribute('aria-current', 'page');
    else node.removeAttribute('aria-current');
  }
}

function element(tag, text) {
  const node = document.createElement(tag);
  node.textContent = text;
  return node;
}

async function run(task, button) {
  if (button) button.disabled = true;
  message('Working...');
  try { await task(); }
  catch (error) { message(error instanceof TypeError ? 'Could not reach the API. Check the connection and allowed frontend address.' : error.message); byId('message').dataset.error = 'true'; }
  finally { if (button) button.disabled = false; }
}

function button(text, task) {
  const node = element('button', text);
  node.type = 'button';
  node.addEventListener('click', () => run(task, node));
  return node;
}

function submit(id, task) {
  byId(id).addEventListener('submit', (event) => {
    event.preventDefault();
    run(() => task(new FormData(event.currentTarget)), event.submitter);
  });
}

function interestsEditor(id, values = []) {
  const root = byId(id);
  root.replaceChildren();
  for (const value of values) addInterest(id, value);
}

function addInterest(id, value = '') {
  const root = byId(id);
  if (root.children.length >= 20) throw new Error('At most 20 interests are allowed.');
  const row = document.createElement('div');
  const label = element('label', 'Interest');
  const input = document.createElement('textarea');
  input.name = 'interest';
  input.rows = 1;
  input.value = value;
  label.append(input);
  row.append(label, button('Remove interest', () => { row.remove(); message('Interest removed. Save the form to apply.'); }));
  root.append(row);
}

function sessionView(user) {
  currentUser = user;
  byId('auth').hidden = Boolean(user);
  byId('logout').hidden = !user;
  byId('session').textContent = user ? `${user.name} (${user.role}) — User ID: ${user._id}` : 'Not signed in.';
  for (const node of document.querySelectorAll('[data-private]')) node.hidden = !user;
  for (const node of document.querySelectorAll('[data-admin]')) node.hidden = user?.role !== 'admin';
  for (const id of ['own-notes', 'users', 'admin-notes', 'groups']) {
    pendingLists.delete(id);
    byId(id).replaceChildren();
  }
  for (const id of ['profile-form', 'note-form', 'post-form', 'user-form']) byId(id).reset();
  interestsEditor('profile-interests', user?.interests ?? []);
  interestsEditor('user-interests');
  byId('user-form').elements.password.required = true;
  if (user) byId('profile-form').elements.name.value = user.name;
  navigate(activeView);
}

function logout() {
  token = '';
  sessionView(null);
  try { localStorage.removeItem('secureNotesToken'); }
  catch { message('Signed out here, but browser storage could not be cleared. Clear site data before using a shared device.'); }
}

async function api(path, { method = 'GET', body, auth = true } = {}) {
  const localHosts = ['localhost', '127.0.0.1', '[::1]'];
  const apiUrl = new URL(API_BASE_URL);
  if (!localHosts.includes(location.hostname) && (apiUrl.protocol !== 'https:' || localHosts.includes(apiUrl.hostname))) {
    throw new Error('Set the public HTTPS backend URL in config.js before deploying this frontend.');
  }
  const requestedToken = token;
  const response = await fetch(`${API_BASE_URL}${path}`, {
    method, credentials: 'omit', cache: 'no-store',
    headers: { ...(body === undefined ? {} : { 'Content-Type': 'application/json' }), ...(auth && token ? { Authorization: `Bearer ${token}` } : {}) },
    ...(body === undefined ? {} : { body: JSON.stringify(body) }),
  });
  const result = response.status === 204 ? undefined : await response.json();
  if (auth && requestedToken !== token) throw new Error('Account changed. Please retry.');
  if (response.status === 204) return;
  if (!response.ok) {
    if (response.status === 401 && auth) logout();
    throw new Error(`${response.status}: ${result.error?.message ?? 'Request failed'}`);
  }
  return result;
}

async function showPage(id, path, render, page = 1, filters = {}, auth = true) {
  const root = byId(id);
  const request = Symbol();
  pendingLists.set(id, request);
  root.replaceChildren(element('p', 'Loading...'));
  try {
    const query = new URLSearchParams({ ...filters, page, limit: 20 });
    const result = await api(`${path}?${query}`, { auth });
    if (pendingLists.get(id) !== request) return;
    root.replaceChildren();
    if (result.author) root.append(element('p', `Author: ${result.author.name} (${result.author._id})`));
    root.append(element('p', `Page ${result.page} of ${result.totalPages || 1}; ${result.total} total`));
    if (!result.data.length) root.append(element('p', 'No results.'));
    for (const item of result.data) root.append(render(item));
    const previous = button('Previous page', () => showPage(id, path, render, page - 1, filters, auth));
    const next = button('Next page', () => showPage(id, path, render, page + 1, filters, auth));
    previous.disabled = page <= 1;
    next.disabled = page >= result.totalPages;
    root.append(previous, next);
    message('Loaded.');
  } catch (error) {
    if (pendingLists.get(id) === request) root.replaceChildren(element('p', 'Could not load this list. Try again.'));
    throw error;
  }
}

function contentCard(item) {
  const card = document.createElement('article');
  card.append(element('h3', item.title), element('p', item.content), element('p', `ID: ${item._id}`));
  card.append(element('p', `${item.ownerId ? 'Owner' : 'Author'} ID: ${item.ownerId ?? item.authorId}`));
  return card;
}

function noteCard(note) {
  const card = contentCard(note);
  card.append(button('Edit note', async () => {
    const { data } = await api(`/notes/${note._id}`);
    for (const key of ['title', 'content']) byId('note-form').elements[key].value = data[key];
    byId('note-form').elements.id.value = data._id;
    navigate('notes');
    byId('note-form').elements.title.focus();
    message('Editing note.');
  }), button('Delete note', async () => {
    if (!confirm('Delete this note?')) return message('Cancelled.');
    await api(`/notes/${note._id}`, { method: 'DELETE' });
    byId('note-form').reset();
    await loadNotes();
    message('Note deleted.');
  }));
  return card;
}

function userCard(user) {
  const card = document.createElement('article');
  card.append(element('h3', user.name), element('p', `${user.email} (${user.role})`), element('p', `ID: ${user._id}`), element('p', `Interests: ${user.interests.join(', ')}`));
  const remove = button('Delete user', async () => {
    if (!confirm('Delete this user and all their notes and posts?')) return message('Cancelled.');
    await api(`/admin/users/${user._id}`, { method: 'DELETE' });
    resetUser();
    await Promise.all([loadAdmin(), loadPosts()]);
    message('User and their notes/posts deleted.');
  });
  remove.disabled = user._id === currentUser._id;
  card.append(button('Edit user', async () => {
    const { data } = await api(`/admin/users/${user._id}`);
    const form = byId('user-form');
    for (const key of ['name', 'email', 'role']) form.elements[key].value = data[key];
    form.elements.id.value = data._id;
    form.elements.password.value = '';
    form.elements.password.required = false;
    interestsEditor('user-interests', data.interests);
    form.elements.name.focus();
    message('Editing user.');
  }), remove);
  return card;
}

function groupCard(group, continued = false) {
  const card = document.createElement('article');
  card.append(element('h3', `${group.interest} (${group.count} users)`));
  const members = document.createElement('ul');
  for (const user of group.users) members.append(element('li', `${user.name} — ${user._id}`));
  card.append(members);
  async function membersPage(afterUserId) {
    const query = new URLSearchParams({ interest: group.interest, limit: 1, memberLimit: 20 });
    if (afterUserId) query.set('afterUserId', afterUserId);
    const result = await api(`/admin/users/by-interest?${query}`);
    card.replaceWith(result.data.length ? groupCard(result.data[0], Boolean(afterUserId)) : element('p', 'Group changed. Refresh groups.'));
    message('Member page loaded.');
  }
  if (continued) card.append(button('First members', () => membersPage()));
  const next = button('Next members', () => membersPage(group.nextUserCursor));
  next.disabled = !group.hasMoreUsers;
  card.append(next);
  return card;
}

const loadNotes = () => showPage('own-notes', '/notes', noteCard);
const loadPosts = () => showPage('posts', '/posts', contentCard, 1, {}, false);
const loadUsers = () => showPage('users', '/admin/users', userCard);
function loadAdminNotes() {
  const ownerId = byId('admin-notes-form').elements.ownerId.value.trim();
  return showPage('admin-notes', '/admin/notes', contentCard, 1, ownerId ? { ownerId } : {});
}
function loadGroups() {
  const interest = byId('interests-form').elements.interest.value.trim();
  return showPage('groups', '/admin/users/by-interest', groupCard, 1, { memberLimit: 20, ...(interest ? { interest } : {}) });
}
async function loadAdmin() {
  if (currentUser?.role === 'admin') await Promise.all([loadUsers(), loadAdminNotes(), loadGroups()]);
}
async function refreshSession() {
  const { data } = await api('/me');
  sessionView(data);
  await Promise.all([loadNotes(), loadAdmin()]);
}
function resetUser() {
  byId('user-form').reset();
  byId('user-form').elements.password.required = true;
  interestsEditor('user-interests');
}

submit('register-form', async (form) => {
  await api('/auth/register', { method: 'POST', auth: false, body: { name: form.get('name'), email: form.get('email'), password: form.get('password'), interests: form.getAll('interest') } });
  byId('login-form').elements.email.value = form.get('email');
  byId('register-form').reset();
  interestsEditor('register-interests');
  message('Registered. Log in with your password.');
});
submit('login-form', async (form) => {
  const result = await api('/auth/login', { method: 'POST', auth: false, body: { email: form.get('email'), password: form.get('password') } });
  localStorage.setItem('secureNotesToken', result.token);
  token = result.token;
  byId('login-form').reset();
  await refreshSession();
  navigate('notes');
  message('Signed in.');
});
submit('profile-form', async (form) => {
  await api('/me', { method: 'PATCH', body: { name: form.get('name'), interests: form.getAll('interest') } });
  await refreshSession();
  message('Profile saved.');
});
submit('note-form', async (form) => {
  const id = form.get('id');
  await api(id ? `/notes/${id}` : '/notes', { method: id ? 'PATCH' : 'POST', body: { title: form.get('title'), content: form.get('content') } });
  byId('note-form').reset();
  await loadNotes();
  message('Note saved.');
});
submit('post-form', async (form) => {
  await api('/posts', { method: 'POST', body: { title: form.get('title'), content: form.get('content') } });
  byId('post-form').reset();
  await loadPosts();
  message('Post published.');
});
submit('user-form', async (form) => {
  const id = form.get('id');
  const body = { name: form.get('name'), email: form.get('email'), role: form.get('role'), interests: form.getAll('interest') };
  if (!id || form.get('password')) body.password = form.get('password');
  await api(id ? `/admin/users/${id}` : '/admin/users', { method: id ? 'PATCH' : 'POST', body });
  resetUser();
  await refreshSession();
  message('User saved.');
});
submit('admin-notes-form', loadAdminNotes);
submit('interests-form', loadGroups);
submit('author-form', (form) => showPage('author-posts', `/posts/by-user/${form.get('userId')}`, contentCard, 1, {}, false));

for (const [id, task] of [['refresh-notes', loadNotes], ['refresh-posts', loadPosts], ['refresh-admin', loadAdmin], ['refresh-session', refreshSession]]) {
  byId(id).addEventListener('click', (event) => run(task, event.currentTarget));
}
for (const node of document.querySelectorAll('[data-add-interest]')) node.addEventListener('click', () => run(() => { addInterest(node.dataset.addInterest); message('Enter an interest, then save the form.'); }, node));
for (const node of document.querySelectorAll('[data-view-target]')) node.addEventListener('click', () => navigate(node.dataset.viewTarget));
byId('new-note').addEventListener('click', () => { byId('note-form').reset(); message('New note.'); });
byId('new-user').addEventListener('click', () => { resetUser(); message('New user.'); });
byId('logout').addEventListener('click', () => { message('Signed out.'); logout(); });
window.addEventListener('storage', (event) => { if (event.key === 'secureNotesToken' || event.key === null) location.reload(); });

try { token = localStorage.getItem('secureNotesToken') ?? ''; }
catch { message('Browser storage is unavailable. Enable site storage to log in.'); }
run(async () => {
  await loadPosts();
  if (token) await refreshSession();
});
