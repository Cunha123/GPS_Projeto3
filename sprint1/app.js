/* ═══════════════════════════════════════════════
   EventFlow — app.js
   ═══════════════════════════════════════════════ */

// ─── STATE ───
let currentUser  = null;
let users        = JSON.parse(localStorage.getItem('ef_users')  || '[]');
let events       = JSON.parse(localStorage.getItem('ef_events') || '[]');
let editingEventId = null;
let currentEventId = null;

// ─── PERSIST ───
function save() {
  localStorage.setItem('ef_users',  JSON.stringify(users));
  localStorage.setItem('ef_events', JSON.stringify(events));
}

/* ══════════════════════════════════════════════
   ROUTING
══════════════════════════════════════════════ */
function showPage(id) {
  document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
  document.getElementById('page-' + id).classList.add('active');
  clearAlerts();
}

function switchTab(tab) {
  const tabs = ['eventos', 'detail', 'agenda', 'perfil'];
  tabs.forEach(t => {
    const v = document.getElementById('view-' + t);
    if (v) v.classList.add('hidden');
    const b = document.getElementById('tab-' + t);
    if (b) b.classList.remove('active');
  });

  const v = document.getElementById('view-' + tab);
  if (v) { v.classList.remove('hidden'); v.classList.add('fade-in'); }

  const b = document.getElementById('tab-' + tab);
  if (b) b.classList.add('active');

  if (tab === 'eventos') renderEvents();
  if (tab === 'agenda')  renderGlobalAgenda();
  if (tab === 'perfil')  renderProfile();
}

function clearAlerts() {
  ['regAlert', 'loginAlert', 'eventFormAlert', 'sessionAlert'].forEach(id => {
    const el = document.getElementById(id);
    if (el) { el.className = 'hidden'; el.textContent = ''; }
  });
}

function showAlert(id, msg, type = 'error') {
  const el = document.getElementById(id);
  el.className = 'alert alert-' + type;
  el.innerHTML = (type === 'error' ? '⚠️ ' : '✓ ') + msg;
}

/* ══════════════════════════════════════════════
   AUTH — US01: REGISTO
══════════════════════════════════════════════ */
function doRegister() {
  const name  = document.getElementById('regName').value.trim();
  const email = document.getElementById('regEmail').value.trim().toLowerCase();
  const pass  = document.getElementById('regPass').value;
  const pass2 = document.getElementById('regPass2').value;

  if (!name || !email || !pass)
    return showAlert('regAlert', 'Preencha todos os campos obrigatórios.');
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email))
    return showAlert('regAlert', 'Email inválido.');
  if (pass.length < 6)
    return showAlert('regAlert', 'A password deve ter no mínimo 6 caracteres.');
  if (pass !== pass2)
    return showAlert('regAlert', 'As passwords não coincidem.');
  if (users.find(u => u.email === email))
    return showAlert('regAlert', 'Este email já está registado.');

  const user = {
    id: Date.now(),
    name,
    email,
    pass,
    createdAt: new Date().toLocaleString('pt-PT')
  };
  users.push(user);
  save();

  showAlert('regAlert', 'Conta criada! Um email de confirmação foi enviado para ' + email + '.', 'success');
  setTimeout(() => loginUser(user), 1800);
}

/* ══════════════════════════════════════════════
   AUTH — US02: LOGIN
══════════════════════════════════════════════ */
function doLogin() {
  const email = document.getElementById('loginEmail').value.trim().toLowerCase();
  const pass  = document.getElementById('loginPass').value;

  if (!email || !pass)
    return showAlert('loginAlert', 'Preencha o email e a password.');

  const user = users.find(u => u.email === email && u.pass === pass);
  if (!user)
    return showAlert('loginAlert', 'Email ou password incorretos.');

  loginUser(user);
}

function loginUser(user) {
  currentUser = user;
  sessionStorage.setItem('ef_session', JSON.stringify(user));
  updateNavUser();
  showPage('dashboard');
  switchTab('eventos');
}

function logout() {
  currentUser = null;
  sessionStorage.removeItem('ef_session');
  document.getElementById('navUser').classList.add('hidden');
  document.getElementById('navActions').classList.remove('hidden');
  showPage('landing');
}

function updateNavUser() {
  document.getElementById('navActions').classList.add('hidden');
  document.getElementById('navUser').classList.remove('hidden');
  document.getElementById('navGreeting').textContent = currentUser.name.split(' ')[0];
  document.getElementById('navAvatar').textContent   = currentUser.name[0].toUpperCase();
}

// Restore session on page load
(function restoreSession() {
  const s = sessionStorage.getItem('ef_session');
  if (s) {
    currentUser = JSON.parse(s);
    updateNavUser();
    showPage('dashboard');
    switchTab('eventos');
  }
})();

/* ══════════════════════════════════════════════
   EVENTS — HELPERS
══════════════════════════════════════════════ */
function myEvents() {
  return events.filter(e => e.userId === currentUser?.id);
}

/* ══════════════════════════════════════════════
   EVENTS — RENDER GRID
══════════════════════════════════════════════ */
function renderEvents() {
  const evs   = myEvents();
  const grid  = document.getElementById('eventsGrid');
  const empty = document.getElementById('emptyEvents');

  if (!evs.length) {
    grid.innerHTML = '';
    empty.classList.remove('hidden');
    return;
  }

  empty.classList.add('hidden');
  grid.innerHTML = evs.map(e => `
    <div class="event-card" onclick="openDetail('${e.id}')">
      <div class="event-card-banner ${e.format === 'online' ? 'online' : e.format === 'híbrido' ? 'hybrid' : ''}">
        <span class="event-format-badge">${e.format}</span>
        <div class="event-status-dot dot-${e.status}"></div>
      </div>
      <div class="event-card-body">
        <div class="event-card-title">${e.title}</div>
        <div class="event-card-meta">
          <span>📅 ${e.date || 'Data por definir'} ${e.time ? '· ' + e.time : ''}</span>
          ${e.location ? `<span>📍 ${e.location}</span>` : ''}
        </div>
        <div class="event-card-footer">
          <span class="status-badge badge-${e.status}">${e.status}</span>
          <span class="tag">${(e.sessions || []).length} sessão(ões)</span>
        </div>
      </div>
    </div>
  `).join('');
}

/* ══════════════════════════════════════════════
   EVENTS — US03: CRIAR
══════════════════════════════════════════════ */
function openCreateEvent() {
  editingEventId = null;
  document.getElementById('modalEventTitle').textContent = 'Criar evento';
  ['evTitle', 'evLocal', 'evDesc'].forEach(id => document.getElementById(id).value = '');
  document.getElementById('evDate').value   = '';
  document.getElementById('evTime').value   = '';
  document.getElementById('evFormat').value = 'presencial';
  document.getElementById('evStatus').value = 'planeado';
  document.getElementById('evStatus').disabled = true;
  openModal('modalEvent');
}

/* ══════════════════════════════════════════════
   EVENTS — US04: EDITAR
══════════════════════════════════════════════ */
function openEditEvent() {
  const ev = events.find(e => e.id === currentEventId);
  if (!ev) return;

  editingEventId = ev.id;
  document.getElementById('modalEventTitle').textContent = 'Editar evento';
  document.getElementById('evTitle').value  = ev.title;
  document.getElementById('evDate').value   = ev.date || '';
  document.getElementById('evTime').value   = ev.time || '';
  document.getElementById('evLocal').value  = ev.location || '';
  document.getElementById('evFormat').value = ev.format;
  document.getElementById('evStatus').value = ev.status;
  document.getElementById('evStatus').disabled = false;
  document.getElementById('evDesc').value   = ev.description || '';
  openModal('modalEvent');
}

function saveEvent() {
  const title  = document.getElementById('evTitle').value.trim();
  const date   = document.getElementById('evDate').value;
  const time   = document.getElementById('evTime').value;
  const loc    = document.getElementById('evLocal').value.trim();
  const format = document.getElementById('evFormat').value;
  const status = document.getElementById('evStatus').value;
  const desc   = document.getElementById('evDesc').value.trim();

  if (!title)  return showAlert('eventFormAlert', 'O título é obrigatório.');
  if (!date)   return showAlert('eventFormAlert', 'A data é obrigatória.');
  if (!time)   return showAlert('eventFormAlert', 'A hora é obrigatória.');
  if (!loc)    return showAlert('eventFormAlert', 'O local é obrigatório.');
  if (!format) return showAlert('eventFormAlert', 'Selecione um formato.');


  if (editingEventId) {
    // EDIT existing event
    const ev  = events.find(e => e.id === editingEventId);
    const old = { ...ev };

    ev.title       = title;
    ev.date        = date;
    ev.time        = time;
    ev.location    = loc;
    ev.format      = format;
    ev.status      = status;
    ev.description = desc;

    // Log history entry (US04)
    ev.history = ev.history || [];
    ev.history.unshift({
      text: `Estado alterado de <strong>${old.status}</strong> para <strong>${status}</strong>`,
      at: new Date().toLocaleString('pt-PT')
    });

    save();
    closeModal('modalEvent');
    renderDetailView(ev);

  } else {
    // CREATE new event (US03) — estado inicial sempre "planeado"
    const ev = {
      id:          'ev_' + Date.now(),
      userId:      currentUser.id,
      title,
      date,
      time,
      location:    loc,
      format,
      status:      'planeado',
      description: desc,
      sessions:    [],
      history:     [],
      createdAt:   new Date().toLocaleString('pt-PT')
    };

    ev.history.push({
      text: 'Evento criado com estado <strong>planeado</strong>',
      at:   ev.createdAt
    });

    events.push(ev);
    save();
    closeModal('modalEvent');
    renderEvents();
  }
}

/* ══════════════════════════════════════════════
   EVENT DETAIL VIEW
══════════════════════════════════════════════ */
function openDetail(id) {
  currentEventId = id;
  const ev = events.find(e => e.id === id);
  renderDetailView(ev);

  document.getElementById('view-eventos').classList.add('hidden');
  document.getElementById('tab-eventos').classList.remove('active');
  const dv = document.getElementById('view-detail');
  dv.classList.remove('hidden');
}

function renderDetailView(ev) {
  const formatClass = ev.format === 'online' ? 'online' : ev.format === 'híbrido' ? 'hybrid' : '';
  const sessions    = ev.sessions || [];
  const history     = ev.history  || [];

  document.getElementById('detailContent').innerHTML = `
    <div class="event-detail-header ${formatClass}">
      <div>
        <span class="status-badge badge-${ev.status}" style="margin-bottom:.5rem;display:inline-flex">${ev.status}</span>
        <h2>${ev.title}</h2>
      </div>
    </div>

    <div class="detail-grid">
      <div class="detail-item">
        <div class="detail-item-label">Data</div>
        <div class="detail-item-value">${ev.date || '—'} ${ev.time ? '· ' + ev.time : ''}</div>
      </div>
      <div class="detail-item">
        <div class="detail-item-label">Local</div>
        <div class="detail-item-value">${ev.location || '—'}</div>
      </div>
      <div class="detail-item">
        <div class="detail-item-label">Formato</div>
        <div class="detail-item-value" style="text-transform:capitalize">${ev.format}</div>
      </div>
      <div class="detail-item">
        <div class="detail-item-label">Sessões</div>
        <div class="detail-item-value">${sessions.length}</div>
      </div>
    </div>

    ${ev.description ? `
      <div style="background:var(--surface);border:1px solid var(--border);border-radius:8px;
                  padding:1rem;margin-bottom:1.5rem;font-size:.9rem;color:var(--muted);line-height:1.6">
        ${ev.description}
      </div>` : ''}

    <div style="margin-bottom:2rem">
      <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:1rem">
        <h3 style="font-family:'Fraunces',serif;font-size:1.1rem">Agenda de sessões</h3>
        <button class="btn btn-outline btn-sm" onclick="openAddSession()">+ Sessão</button>
      </div>
      ${sessions.length ? `
        <div class="agenda-timeline">
          ${sessions
            .sort((a, b) => a.start.localeCompare(b.start))
            .map(s => `
              <div class="session-card">
                <div class="session-time">
                  ${s.start}<br>
                  <small style="color:var(--muted);font-size:.7rem">${s.end}</small>
                </div>
                <div class="session-info">
                  <div class="session-title">${s.title}</div>
                  ${s.speaker ? `<div class="session-speaker">🎤 ${s.speaker}</div>` : ''}
                </div>
              </div>`).join('')}
        </div>`
        : `<p style="color:var(--muted);font-size:.9rem">Sem sessões. Adicione a primeira!</p>`}
    </div>

    <div>
      <h3 style="font-family:'Fraunces',serif;font-size:1.1rem;margin-bottom:1rem">Histórico de alterações</h3>
      <div class="history-log">
        ${history.map(h => `
          <div class="history-entry">
            <div class="history-dot"></div>
            <div class="history-text">${h.text}</div>
            <span class="history-time">${h.at}</span>
          </div>`).join('')
          || '<p style="color:var(--muted);font-size:.85rem">Sem histórico.</p>'}
      </div>
    </div>
  `;
}

/* ══════════════════════════════════════════════
   SESSIONS — US05: AGENDA E SESSÕES
══════════════════════════════════════════════ */
function openAddSession() {
  ['sesTitle', 'sesSpeaker', 'sesStart', 'sesEnd'].forEach(id => {
    document.getElementById(id).value = '';
  });
  document.getElementById('overlapWarning').classList.add('hidden');
  document.getElementById('sessionAlert').classList.add('hidden');

  // Live overlap check
  const checkOverlap = () => {
    const s  = document.getElementById('sesStart').value;
    const e  = document.getElementById('sesEnd').value;
    if (!s || !e) return;

    const ev      = events.find(x => x.id === currentEventId);
    const overlap = (ev.sessions || []).some(ses => s < ses.end && e > ses.start);
    document.getElementById('overlapWarning').classList.toggle('hidden', !overlap);
  };

  document.getElementById('sesStart').onchange = checkOverlap;
  document.getElementById('sesEnd').onchange   = checkOverlap;
  openModal('modalSession');
}

function saveSession() {
  const title   = document.getElementById('sesTitle').value.trim();
  const speaker = document.getElementById('sesSpeaker').value.trim();
  const start   = document.getElementById('sesStart').value;
  const end     = document.getElementById('sesEnd').value;

  if (!title)        return showAlert('sessionAlert', 'O título é obrigatório.');
  if (!start || !end) return showAlert('sessionAlert', 'Hora de início e fim são obrigatórias.');
  if (start >= end)   return showAlert('sessionAlert', 'A hora de fim deve ser depois do início.');

  const ev = events.find(e => e.id === currentEventId);
  ev.sessions = ev.sessions || [];
  ev.sessions.push({ id: 'ses_' + Date.now(), title, speaker, start, end });

  ev.history = ev.history || [];
  ev.history.unshift({
    text: `Sessão <strong>"${title}"</strong> adicionada`,
    at:   new Date().toLocaleString('pt-PT')
  });

  save();
  closeModal('modalSession');
  renderDetailView(ev);
}

/* ══════════════════════════════════════════════
   GLOBAL AGENDA
══════════════════════════════════════════════ */
function renderGlobalAgenda() {
  const all = myEvents()
    .flatMap(ev => (ev.sessions || []).map(s => ({
      ...s,
      eventTitle: ev.title,
      eventDate:  ev.date
    })))
    .sort((a, b) => {
      if (a.eventDate !== b.eventDate)
        return (a.eventDate || '').localeCompare(b.eventDate || '');
      return a.start.localeCompare(b.start);
    });

  const el = document.getElementById('globalAgenda');
  const em = document.getElementById('emptyAgenda');

  if (!all.length) {
    el.innerHTML = '';
    em.classList.remove('hidden');
    return;
  }

  em.classList.add('hidden');
  el.innerHTML = all.map(s => `
    <div class="session-card">
      <div class="session-time">
        ${s.start}<br>
        <small style="color:var(--muted);font-size:.7rem">${s.end}</small>
      </div>
      <div class="session-info">
        <div class="session-title">${s.title}</div>
        <div class="session-speaker">
          ${s.speaker ? '🎤 ' + s.speaker + ' · ' : ''}
          <span style="color:var(--accent)">${s.eventTitle}</span>
          ${s.eventDate ? ' · ' + s.eventDate : ''}
        </div>
      </div>
    </div>
  `).join('');
}

/* ══════════════════════════════════════════════
   PROFILE
══════════════════════════════════════════════ */
function renderProfile() {
  document.getElementById('profileAvatar').textContent = currentUser.name[0].toUpperCase();
  document.getElementById('profileInfo').innerHTML = `
    <div class="detail-grid" style="max-width:420px">
      <div class="detail-item">
        <div class="detail-item-label">Nome</div>
        <div class="detail-item-value">${currentUser.name}</div>
      </div>
      <div class="detail-item">
        <div class="detail-item-label">Email</div>
        <div class="detail-item-value" style="word-break:break-all;font-size:.85rem">${currentUser.email}</div>
      </div>
      <div class="detail-item">
        <div class="detail-item-label">Membro desde</div>
        <div class="detail-item-value">${currentUser.createdAt || '—'}</div>
      </div>
      <div class="detail-item">
        <div class="detail-item-label">Eventos criados</div>
        <div class="detail-item-value">${myEvents().length}</div>
      </div>
    </div>
  `;
}

/* ══════════════════════════════════════════════
   MODAL HELPERS
══════════════════════════════════════════════ */
function openModal(id)  { document.getElementById(id).classList.remove('hidden'); }
function closeModal(id) { document.getElementById(id).classList.add('hidden'); }

// Close modal when clicking outside
document.querySelectorAll('.modal-overlay').forEach(ov => {
  ov.addEventListener('click', e => {
    if (e.target === ov) ov.classList.add('hidden');
  });
});