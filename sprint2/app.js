/* ═══════════════════════════════════════════════
   EventFlow — app.js
   ═══════════════════════════════════════════════ */

// ─── STATE ───
let currentUser  = null;
let users        = JSON.parse(localStorage.getItem('ef_users')  || '[]');
let events       = JSON.parse(localStorage.getItem('ef_events') || '[]');
let speakers     = JSON.parse(localStorage.getItem('ef_speakers') || '[]');
let editingEventId = null;
let currentEventId = null;
let editingSpeakerId = null;

// ─── PERSIST ───
function save() {
  localStorage.setItem('ef_users',  JSON.stringify(users));
  localStorage.setItem('ef_events', JSON.stringify(events));
  localStorage.setItem('ef_speakers', JSON.stringify(speakers));
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
  const tabs = ['eventos', 'detail', 'agenda', 'oradores', 'perfil'];
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
  if (tab === 'oradores') renderSpeakers();
  if (tab === 'perfil')  renderProfile();
}

function clearAlerts() {
  ['regAlert', 'loginAlert', 'eventFormAlert', 'sessionAlert', 'speakerAlert'].forEach(id => {
    const el = document.getElementById(id);
    if (el) { el.className = 'hidden'; el.textContent = ''; }
  });
}

function showAlert(id, msg, type = 'error') {
  const el = document.getElementById(id);
  if (!el) return;
  el.className = 'alert alert-' + type;
  el.innerHTML = (type === 'error' ? '⚠️ ' : '✓ ') + msg;
  // scroll modal body to top so error is visible
  const body = el.closest('.modal-body');
  if (body) body.scrollTop = 0;
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

function mySpeakers() {
  return speakers.filter(s => s.userId === currentUser?.id);
}

function speakerName(idOrName) {
  const sp = speakers.find(s => s.id === idOrName);
  return sp ? sp.name : idOrName;
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
   MAP PICKER
══════════════════════════════════════════════ */
let mapInstance  = null;
let mapMarker    = null;

function initMap() {
  if (mapInstance) { mapInstance.remove(); mapInstance = null; mapMarker = null; }

  mapInstance = L.map('mapContainer', { zoomControl: true }).setView([39.557, -7.844], 6);

  L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    attribution: '© OpenStreetMap contributors'
  }).addTo(mapInstance);

  mapInstance.on('click', async (e) => {
    const { lat, lng } = e.latlng;
    await reverseGeocode(lat, lng);
  });

  // fix tiles rendering inside modal
  setTimeout(() => mapInstance.invalidateSize(), 300);
}

async function searchMapLocation() {
  const q = document.getElementById('mapSearch').value.trim();
  if (!q) return;

  const res  = await fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(q)}&limit=1`, {
    headers: { 'Accept-Language': 'pt' }
  });
  const data = await res.json();
  if (!data.length) {
    document.getElementById('mapSelectedLabel').textContent = 'Local não encontrado. Tente outro termo.';
    return;
  }

  const { lat, lon, display_name } = data[0];
  setMapLocation(parseFloat(lat), parseFloat(lon), display_name);
}

async function reverseGeocode(lat, lng) {
  const res  = await fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}`, {
    headers: { 'Accept-Language': 'pt' }
  });
  const data = await res.json();
  const name = data.display_name || `${lat.toFixed(5)}, ${lng.toFixed(5)}`;
  setMapLocation(lat, lng, name);
}

function setMapLocation(lat, lng, name) {
  if (mapMarker) mapMarker.remove();
  mapMarker = L.marker([lat, lng]).addTo(mapInstance);
  mapInstance.setView([lat, lng], 14);

  // store values
  document.getElementById('evLocal').value = name;
  document.getElementById('evLat').value   = lat;
  document.getElementById('evLng').value   = lng;
  document.getElementById('mapSelectedLabel').innerHTML =
    `📍 <strong style="color:var(--ink)">${name}</strong>`;
}

/* ══════════════════════════════════════════════
   FORM HELPERS
══════════════════════════════════════════════ */
function updateLocalField() {
  const format      = document.getElementById('evFormat').value;
  const label       = document.getElementById('labelLocal');
  const mapWrap     = document.getElementById('mapPickerWrap');
  const linkInput   = document.getElementById('evLocalLink');
  const hybridField = document.getElementById('fieldHybridLink');

  if (format === 'online') {
    label.textContent = 'Link da reunião *';
    mapWrap.classList.add('hidden');
    linkInput.classList.remove('hidden');
    hybridField.classList.add('hidden');
  } else if (format === 'híbrido') {
    label.textContent = 'Local *';
    mapWrap.classList.remove('hidden');
    linkInput.classList.add('hidden');
    hybridField.classList.remove('hidden');
    setTimeout(() => {
      if (!mapInstance) initMap();
      else mapInstance.invalidateSize();
    }, 50);
  } else {
    // presencial
    label.textContent = 'Local *';
    mapWrap.classList.remove('hidden');
    linkInput.classList.add('hidden');
    hybridField.classList.add('hidden');
    setTimeout(() => {
      if (!mapInstance) initMap();
      else mapInstance.invalidateSize();
    }, 50);
  }
}


/* Clear the event form error whenever user types or changes any field */
function attachFormClearListeners() {
  const ids = ['evTitle', 'evDate', 'evTime', 'evLocalLink', 'evHybridLink', 'evFormat', 'evStatus', 'evDesc', 'mapSearch'];
  ids.forEach(id => {
    const el = document.getElementById(id);
    if (el) {
      el.addEventListener('input',  clearEventFormAlert, { once: false });
      el.addEventListener('change', clearEventFormAlert, { once: false });
    }
  });
}

function clearEventFormAlert() {
  const el = document.getElementById('eventFormAlert');
  if (el) { el.className = 'hidden'; el.textContent = ''; }
}

function openCreateEvent() {
  editingEventId = null;
  document.getElementById('modalEventTitle').textContent = 'Criar evento';
  ['evTitle', 'evLocal', 'evDesc'].forEach(id => document.getElementById(id).value = '');
  document.getElementById('evDate').value   = '';
  document.getElementById('evTime').value   = '';
  document.getElementById('evCapacity').value = '';
  document.getElementById('evFormat').value = 'presencial';
  document.getElementById('evStatus').value = 'planeado';
  document.getElementById('evStatus').disabled = true;
  document.getElementById('mapSearch').value = '';
  document.getElementById('mapSelectedLabel').textContent = '';
  document.getElementById('evLat').value = '';
  document.getElementById('evLng').value = '';
  document.getElementById('evLocalLink').value  = '';
  document.getElementById('evHybridLink').value = '';
  document.getElementById('fieldHybridLink').classList.add('hidden');
  clearEventFormAlert();
  if (mapInstance) { mapInstance.remove(); mapInstance = null; mapMarker = null; }
  updateLocalField();
  attachFormClearListeners();
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
  document.getElementById('evCapacity').value = ev.capacity || '';
  // reset map state
  if (mapInstance) { mapInstance.remove(); mapInstance = null; mapMarker = null; }
  document.getElementById('evLocal').value      = ev.location || '';
  document.getElementById('evLat').value        = ev.lat || '';
  document.getElementById('evLng').value        = ev.lng || '';
  document.getElementById('evLocalLink').value  = ev.format === 'online'  ? (ev.location || '') : '';
  document.getElementById('evHybridLink').value = ev.format === 'híbrido' ? (ev.hybridLink || '') : '';
  document.getElementById('mapSearch').value    = '';
  document.getElementById('mapSelectedLabel').innerHTML = ev.location && ev.format !== 'online'
    ? `📍 <strong style="color:var(--ink)">${ev.location}</strong>` : '';
  updateLocalField();
  // if presencial and has coords, place marker
  if (ev.format !== 'online' && ev.lat && ev.lng) {
    setTimeout(() => setMapLocation(parseFloat(ev.lat), parseFloat(ev.lng), ev.location), 300);
  }
  clearEventFormAlert();
  attachFormClearListeners();
  openModal('modalEvent');
}

function saveEvent() {
  const title  = document.getElementById('evTitle').value.trim();
  const date   = document.getElementById('evDate').value;
  const time   = document.getElementById('evTime').value;
  const format = document.getElementById('evFormat').value;
  const status = document.getElementById('evStatus').value;
  const desc   = document.getElementById('evDesc').value.trim();
  const capacity = parseInt(document.getElementById('evCapacity').value, 10) || 0;

  const isOnline  = format === 'online';
  const isHybrid  = format === 'híbrido';
  const loc       = isOnline
    ? document.getElementById('evLocalLink').value.trim()
    : document.getElementById('evLocal').value.trim();
  const hybridLink = isHybrid ? document.getElementById('evHybridLink').value.trim() : '';
  const lat = document.getElementById('evLat')?.value || '';
  const lng = document.getElementById('evLng')?.value || '';

  if (!title)  return showAlert('eventFormAlert', 'O Título do evento é obrigatório.');
  if (!date)   return showAlert('eventFormAlert', 'A Data é obrigatória.');
  if (!time)   return showAlert('eventFormAlert', 'A Hora é obrigatória.');
  if (!loc)    return showAlert('eventFormAlert', isOnline ? 'O Link da reunião é obrigatório.' : 'O Local é obrigatório — selecione um ponto no mapa.');
  if (isHybrid && !hybridLink) return showAlert('eventFormAlert', 'O Link da reunião online é obrigatório.');
  if (!format) return showAlert('eventFormAlert', 'O Formato é obrigatório.');
  if (capacity < 0) return showAlert('eventFormAlert', 'A capacidade deve ser um valor positivo.');


  if (editingEventId) {
    // EDIT existing event
    const ev  = events.find(e => e.id === editingEventId);
    const old = { ...ev };

    ev.title       = title;
    ev.date        = date;
    ev.time        = time;
    ev.location    = loc;
    ev.hybridLink  = hybridLink;
    ev.lat         = isOnline ? '' : lat || ev.lat;
    ev.lng         = isOnline ? '' : lng || ev.lng;
    ev.format      = format;
    ev.status      = status;
    ev.description = desc;
    ev.capacity    = capacity;

    // Log only what actually changed (US04)
    ev.history = ev.history || [];
    const changes = [];
    if (old.title    !== title)   changes.push(`Título alterado para <strong>"${title}"</strong>`);
    if (old.date     !== date)    changes.push(`Data alterada para <strong>${date}</strong>`);
    if (old.time     !== time)    changes.push(`Hora alterada para <strong>${time}</strong>`);
    if (old.format   !== format)  changes.push(`Formato alterado de <strong>${old.format}</strong> para <strong>${format}</strong>`);
    if (old.status   !== status)  changes.push(`Estado alterado de <strong>${old.status}</strong> para <strong>${status}</strong>`);
    if (old.location !== loc)     changes.push(`Local atualizado para <strong>"${loc}"</strong>`);
    if ((old.hybridLink || '') !== hybridLink && hybridLink) changes.push(`Link da reunião online atualizado`);
    if ((old.description || '') !== desc && desc) changes.push(`Descrição atualizada`);
    if ((old.capacity || 0) !== capacity) changes.push(`Capacidade máxima atualizada para <strong>${capacity || 'sem limite'}</strong>`);

    if (changes.length > 0) {
      const at = new Date().toLocaleString('pt-PT');
      changes.forEach(text => ev.history.unshift({ text, at }));
    }

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
      hybridLink,
      lat,
      lng,
      format,
      status:      'planeado',
      description: desc,
      capacity,
      sessions:    [],
      registrations: [],
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
  const registrations = ev.registrations || [];
  const checkedIn = registrations.filter(r => r.checkedIn).length;

  document.getElementById('detailContent').innerHTML = `

    <!-- HERO HEADER -->
    <div class="detail-hero ${formatClass}">
      <div class="detail-hero-inner">
        <span class="status-badge badge-${ev.status}">${ev.status}</span>
        <h2 class="detail-hero-title">${ev.title}</h2>
        <div class="detail-hero-meta">
          <span>📅 ${ev.date || '—'}${ev.time ? ' · ' + ev.time : ''}</span>
          <span class="detail-hero-sep">·</span>
          <span style="text-transform:capitalize">📌 ${ev.format}</span>
          ${sessions.length ? `<span class="detail-hero-sep">·</span><span>🎤 ${sessions.length} sessão(ões)</span>` : ''}
        </div>
      </div>
    </div>

    <!-- INFO ROW -->
    <div class="detail-info-row">
      ${ev.format === 'online' ? `
        <div class="detail-item">
          <div class="detail-item-label">Link da reunião</div>
          <div class="detail-item-value" style="font-size:.88rem;word-break:break-all">
            <a href="${ev.location}" target="_blank" style="color:var(--accent);text-decoration:none;display:flex;align-items:center;gap:.4rem">
              🔗 ${ev.location || '—'}
            </a>
          </div>
        </div>
      ` : ev.format === 'híbrido' ? `
        <div style="display:flex;flex-direction:column;gap:1rem">
          ${ev.lat && ev.lng ? `
            <div class="detail-map-card">
              <div class="detail-item-label" style="padding:.9rem 1rem .4rem">Local presencial</div>
              <div id="detailMapContainer" style="height:200px;"></div>
              <div class="detail-map-address">📍 ${ev.location || '—'}</div>
            </div>` : `
            <div class="detail-item">
              <div class="detail-item-label">Local presencial</div>
              <div class="detail-item-value">${ev.location || '—'}</div>
            </div>`}
          <div class="detail-item">
            <div class="detail-item-label">Link da reunião online</div>
            <div class="detail-item-value" style="font-size:.88rem;word-break:break-all">
              <a href="${ev.hybridLink}" target="_blank" style="color:var(--accent);text-decoration:none;display:flex;align-items:center;gap:.4rem">
                🔗 ${ev.hybridLink || '—'}
              </a>
            </div>
          </div>
        </div>
      ` : ev.lat && ev.lng ? `
        <div class="detail-map-card">
          <div class="detail-item-label" style="padding:.9rem 1rem .4rem">Local</div>
          <div id="detailMapContainer" style="height:200px;"></div>
          <div class="detail-map-address">📍 ${ev.location || '—'}</div>
        </div>
      ` : `
        <div class="detail-item">
          <div class="detail-item-label">Local</div>
          <div class="detail-item-value">${ev.location || '—'}</div>
        </div>
      `}
      <div class="detail-side-cards">
        <div class="detail-item">
          <div class="detail-item-label">Formato</div>
          <div class="detail-item-value" style="text-transform:capitalize">${ev.format}</div>
        </div>
        <div class="detail-item">
          <div class="detail-item-label">Sessões</div>
          <div class="detail-item-value">${sessions.length}</div>
        </div>
        <div class="detail-item">
          <div class="detail-item-label">Inscrições</div>
          <div class="detail-item-value">${registrations.length}${ev.capacity ? ' / ' + ev.capacity : ''}</div>
        </div>
        <div class="detail-item">
          <div class="detail-item-label">Check-in</div>
          <div class="detail-item-value">${checkedIn}</div>
        </div>
        ${ev.description ? `
        <div class="detail-item" style="flex:1">
          <div class="detail-item-label">Descrição</div>
          <div style="font-size:.88rem;color:var(--muted);line-height:1.6;margin-top:.2rem">${ev.description}</div>
        </div>` : ''}
      </div>
    </div>

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
                  ${s.speaker ? `<div class="session-speaker">🎤 ${speakerName(s.speaker)}</div>` : ''}
                </div>
              </div>`).join('')}
        </div>`
        : `<p style="color:var(--muted);font-size:.9rem">Sem sessões. Adicione a primeira!</p>`}
    </div>

    <div class="sprint2-panel">
      <div class="panel-title-row">
        <h3>Participação e engagement</h3>
        <span class="tag">Sprint 2</span>
      </div>

      <div class="sprint2-grid">
        <div class="sprint2-card">
          <h4>Inscrição em eventos</h4>
          <div class="compact-form">
            <input type="text" id="regParticipantName" placeholder="Nome do participante">
            <input type="email" id="regParticipantEmail" placeholder="email@exemplo.pt">
            <button class="btn btn-primary btn-sm" onclick="registerParticipant()">Inscrever</button>
          </div>
          <div class="participant-list">
            ${registrations.length ? registrations.map(r => `
              <div class="participant-row">
                <div>
                  <strong>${r.name}</strong>
                  <span>${r.email}</span>
                </div>
                <button class="btn btn-outline btn-sm" onclick="toggleCheckIn('${r.id}')">
                  ${r.checkedIn ? 'Check-in feito' : 'Check-in'}
                </button>
              </div>`).join('') : '<p class="muted-small">Sem inscrições registadas.</p>'}
          </div>
        </div>

        <div class="sprint2-card">
          <h4>Feedback das sessões</h4>
          <div class="compact-form">
            <select id="feedbackSession">${sessionOptions(sessions)}</select>
            <select id="feedbackRating">
              <option value="5">5 estrelas</option>
              <option value="4">4 estrelas</option>
              <option value="3">3 estrelas</option>
              <option value="2">2 estrelas</option>
              <option value="1">1 estrela</option>
            </select>
            <textarea id="feedbackComment" maxlength="500" placeholder="Comentário opcional"></textarea>
            <button class="btn btn-primary btn-sm" onclick="submitFeedback()">Enviar feedback</button>
          </div>
          <div class="metric-list">${feedbackSummary(sessions)}</div>
        </div>

        <div class="sprint2-card wide">
          <h4>Q&A em sessões</h4>
          <div class="compact-form qa-form">
            <select id="qaSession">${sessionOptions(sessions)}</select>
            <input type="text" id="qaQuestion" placeholder="Escreva uma pergunta para o orador">
            <button class="btn btn-primary btn-sm" onclick="submitQuestion()">Perguntar</button>
          </div>
          <div class="qa-list">${questionsList(sessions)}</div>
        </div>
      </div>
    </div>

    <div>
      <h3 style="font-family:'Fraunces',serif;font-size:1.1rem;margin-bottom:1rem">Histórico de alterações</h3>
      ${history.length === 0 ? `
        <p style="color:var(--muted);font-size:.85rem">Sem histórico.</p>
      ` : `
        <div class="history-log" id="historyList">
          ${history.slice(0, 3).map(h => `
            <div class="history-entry">
              <div class="history-dot"></div>
              <div class="history-text">${h.text}</div>
              <span class="history-time">${h.at}</span>
            </div>`).join('')}
        </div>
        ${history.length > 3 ? `
          <div id="historyExtra" class="history-log" style="display:none;margin-top:.75rem">
            ${history.slice(3).map(h => `
              <div class="history-entry">
                <div class="history-dot"></div>
                <div class="history-text">${h.text}</div>
                <span class="history-time">${h.at}</span>
              </div>`).join('')}
          </div>
          <button class="btn btn-ghost btn-sm" id="historyToggleBtn"
            style="margin-top:.75rem;color:var(--accent);padding-left:0"
            onclick="toggleHistory()">
            Ver mais ${history.length - 3} entradas ↓
          </button>
        ` : ''}
      `}
    </div>
  `;

  // Init read-only mini map in detail view
  if (ev.lat && ev.lng) {
    setTimeout(() => {
      const detailMap = L.map('detailMapContainer', {
        zoomControl: false,
        dragging: false,
        scrollWheelZoom: false,
        doubleClickZoom: false,
        touchZoom: false,
        keyboard: false,
        attributionControl: false
      }).setView([parseFloat(ev.lat), parseFloat(ev.lng)], 15);

      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png').addTo(detailMap);
      L.marker([parseFloat(ev.lat), parseFloat(ev.lng)]).addTo(detailMap);
    }, 100);
  }
}

function toggleHistory() {
  const extra = document.getElementById('historyExtra');
  const btn   = document.getElementById('historyToggleBtn');
  const ev    = events.find(e => e.id === currentEventId);
  const remaining = (ev?.history?.length || 0) - 3;

  if (extra.style.display === 'none') {
    extra.style.display = 'block';
    btn.textContent = 'Ver menos ↑';
  } else {
    extra.style.display = 'none';
    btn.textContent = `Ver mais ${remaining} entradas ↓`;
  }
}


function openAddSession() {
  ['sesTitle', 'sesStart', 'sesEnd'].forEach(id => {
    document.getElementById(id).value = '';
  });
  const speakerSelect = document.getElementById('sesSpeaker');
  speakerSelect.innerHTML = '<option value="">Sem orador associado</option>' +
    mySpeakers().map(s => `<option value="${s.id}">${s.name} — ${s.area}</option>`).join('');
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
  const speaker = document.getElementById('sesSpeaker').value;
  const start   = document.getElementById('sesStart').value;
  const end     = document.getElementById('sesEnd').value;

  if (!title)        return showAlert('sessionAlert', 'O título é obrigatório.');
  if (!start || !end) return showAlert('sessionAlert', 'Hora de início e fim são obrigatórias.');
  if (start >= end)   return showAlert('sessionAlert', 'A hora de fim deve ser depois do início.');

  const ev = events.find(e => e.id === currentEventId);
  ev.sessions = ev.sessions || [];
  ev.sessions.push({ id: 'ses_' + Date.now(), title, speaker, start, end, feedback: [], questions: [] });

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
   US06 — REGISTO E PERFIL DE ORADORES
══════════════════════════════════════════════ */
function renderSpeakers() {
  const list = mySpeakers();
  const grid = document.getElementById('speakersGrid');
  const empty = document.getElementById('emptySpeakers');

  if (!list.length) {
    grid.innerHTML = '';
    empty.classList.remove('hidden');
    return;
  }

  empty.classList.add('hidden');
  grid.innerHTML = list.map(s => `
    <div class="speaker-card">
      <div class="speaker-photo">${s.photo ? `<img src="${s.photo}" alt="${s.name}">` : s.name[0].toUpperCase()}</div>
      <div class="speaker-info">
        <div class="speaker-card-head">
          <div>
            <h3>${s.name}</h3>
            <span>${s.area}</span>
          </div>
          <div class="speaker-actions">
            <button class="btn btn-outline btn-sm" onclick="editSpeaker('${s.id}')">Editar</button>
            <button class="btn btn-outline btn-sm danger-action" onclick="deleteSpeaker('${s.id}')">Apagar</button>
          </div>
        </div>
        <p>${s.bio}</p>
        ${s.contact ? `<a href="mailto:${s.contact}">${s.contact}</a>` : ''}
      </div>
    </div>
  `).join('');
}

function openSpeakerModal() {
  editingSpeakerId = null;
  document.getElementById('modalSpeakerTitle').textContent = 'Registar orador';
  document.getElementById('speakerSaveBtn').textContent = 'Guardar orador';
  ['spName', 'spPhoto', 'spArea', 'spContact', 'spBio'].forEach(id => document.getElementById(id).value = '');
  document.getElementById('speakerAlert').className = 'hidden';
  openModal('modalSpeaker');
}

function editSpeaker(id) {
  const sp = speakers.find(s => s.id === id);
  if (!sp) return;

  editingSpeakerId = id;
  document.getElementById('modalSpeakerTitle').textContent = 'Editar orador';
  document.getElementById('speakerSaveBtn').textContent = 'Guardar alterações';
  document.getElementById('spName').value = sp.name || '';
  document.getElementById('spPhoto').value = sp.photo || '';
  document.getElementById('spArea').value = sp.area || '';
  document.getElementById('spContact').value = sp.contact || '';
  document.getElementById('spBio').value = sp.bio || '';
  document.getElementById('speakerAlert').className = 'hidden';
  openModal('modalSpeaker');
}

function saveSpeaker() {
  const name = document.getElementById('spName').value.trim();
  const photo = document.getElementById('spPhoto').value.trim();
  const area = document.getElementById('spArea').value.trim();
  const contact = document.getElementById('spContact').value.trim();
  const bio = document.getElementById('spBio').value.trim();

  if (!name || !area || !bio)
    return showAlert('speakerAlert', 'Nome, área de especialização e biografia são obrigatórios.');

  if (editingSpeakerId) {
    const sp = speakers.find(s => s.id === editingSpeakerId);
    if (!sp) return showAlert('speakerAlert', 'Orador não encontrado.');

    sp.name = name;
    sp.photo = photo;
    sp.area = area;
    sp.contact = contact;
    sp.bio = bio;
    sp.updatedAt = new Date().toLocaleString('pt-PT');
  } else {
    speakers.push({
      id: 'sp_' + Date.now(),
      userId: currentUser.id,
      name,
      photo,
      area,
      contact,
      bio,
      createdAt: new Date().toLocaleString('pt-PT')
    });
  }

  save();
  closeModal('modalSpeaker');
  editingSpeakerId = null;
  renderSpeakers();
}

function deleteSpeaker(id) {
  const sp = speakers.find(s => s.id === id);
  if (!sp) return;

  const activeUse = events.some(ev =>
    ev.userId === currentUser?.id &&
    ev.status === 'ativo' &&
    (ev.sessions || []).some(session => session.speaker === id)
  );

  if (activeUse) {
    alert('Este orador está associado a uma sessão de um evento ativo. Altere o estado do evento ou remova a associação antes de apagar.');
    return;
  }

  if (!confirm(`Apagar o orador "${sp.name}"?`)) return;

  speakers = speakers.filter(s => s.id !== id);
  events.forEach(ev => {
    (ev.sessions || []).forEach(session => {
      if (session.speaker === id) session.speaker = '';
    });
  });

  save();
  renderSpeakers();
  if (currentEventId) {
    const ev = events.find(e => e.id === currentEventId);
    if (ev) renderDetailView(ev);
  }
}

/* ══════════════════════════════════════════════
   US07 — INSCRIÇÃO EM EVENTOS
══════════════════════════════════════════════ */
function sessionOptions(sessions) {
  if (!sessions.length) return '<option value="">Sem sessões disponíveis</option>';
  return sessions.map(s => `<option value="${s.id}">${s.title}</option>`).join('');
}

function currentEvent() {
  return events.find(e => e.id === currentEventId);
}

function registerParticipant() {
  const ev = currentEvent();
  const name = document.getElementById('regParticipantName').value.trim();
  const email = document.getElementById('regParticipantEmail').value.trim().toLowerCase();
  if (!name || !email) return alert('Preencha nome e email do participante.');

  ev.registrations = ev.registrations || [];
  if (ev.registrations.some(r => r.email === email))
    return alert('Este participante já está inscrito.');
  if (ev.capacity && ev.registrations.length >= ev.capacity)
    return alert('Capacidade máxima atingida.');

  ev.registrations.push({
    id: 'reg_' + Date.now(),
    name,
    email,
    checkedIn: false,
    registeredAt: new Date().toLocaleString('pt-PT')
  });
  save();
  renderDetailView(ev);
}

/* ══════════════════════════════════════════════
   US08 — CHECK-IN DIGITAL
══════════════════════════════════════════════ */
function toggleCheckIn(id) {
  const ev = currentEvent();
  const participant = (ev.registrations || []).find(r => r.id === id);
  if (!participant) return;
  participant.checkedIn = !participant.checkedIn;
  participant.checkedInAt = participant.checkedIn ? new Date().toLocaleString('pt-PT') : '';
  save();
  renderDetailView(ev);
}

/* ══════════════════════════════════════════════
   US09 — SISTEMA DE FEEDBACK
══════════════════════════════════════════════ */
function feedbackSummary(sessions) {
  if (!sessions.length) return '<p class="muted-small">Adicione sessões para recolher feedback.</p>';
  return sessions.map(s => {
    const feedback = s.feedback || [];
    const avg = feedback.length
      ? (feedback.reduce((sum, f) => sum + Number(f.rating), 0) / feedback.length).toFixed(1)
      : '—';
    return `<div class="metric-row"><strong>${s.title}</strong><span>${avg} ★ (${feedback.length})</span></div>`;
  }).join('');
}

function submitFeedback() {
  const ev = currentEvent();
  const session = (ev.sessions || []).find(s => s.id === document.getElementById('feedbackSession').value);
  if (!session) return alert('Selecione uma sessão.');
  session.feedback = session.feedback || [];
  session.feedback.push({
    rating: Number(document.getElementById('feedbackRating').value),
    comment: document.getElementById('feedbackComment').value.trim(),
    at: new Date().toLocaleString('pt-PT')
  });
  save();
  renderDetailView(ev);
}

/* ══════════════════════════════════════════════
   US10 — Q&A EM SESSÕES
══════════════════════════════════════════════ */
function questionsList(sessions) {
  const rows = sessions.flatMap(s => (s.questions || []).map(q => ({ ...q, sessionTitle: s.title, sessionId: s.id })));
  if (!rows.length) return '<p class="muted-small">Ainda não existem perguntas.</p>';

  return rows.map(q => `
    <div class="qa-row ${q.hidden ? 'is-hidden' : ''}">
      <div>
        <strong>${q.sessionTitle}</strong>
        <p>${q.text}</p>
        <span>${q.answered ? 'Respondida' : 'Por responder'} · ${q.votes || 0} voto(s)</span>
      </div>
      <div class="qa-actions">
        <button class="btn btn-outline btn-sm" onclick="voteQuestion('${q.sessionId}', '${q.id}')">Votar</button>
        <button class="btn btn-outline btn-sm" onclick="markAnswered('${q.sessionId}', '${q.id}')">Responder</button>
        <button class="btn btn-outline btn-sm" onclick="hideQuestion('${q.sessionId}', '${q.id}')">Ocultar</button>
      </div>
    </div>
  `).join('');
}

function submitQuestion() {
  const ev = currentEvent();
  const session = (ev.sessions || []).find(s => s.id === document.getElementById('qaSession').value);
  const text = document.getElementById('qaQuestion').value.trim();
  if (!session || !text) return alert('Selecione uma sessão e escreva a pergunta.');
  session.questions = session.questions || [];
  session.questions.push({
    id: 'q_' + Date.now(),
    text,
    votes: 0,
    answered: false,
    hidden: false,
    at: new Date().toLocaleString('pt-PT')
  });
  save();
  renderDetailView(ev);
}

function findQuestion(sessionId, questionId) {
  const ev = currentEvent();
  const session = (ev.sessions || []).find(s => s.id === sessionId);
  const question = session ? (session.questions || []).find(q => q.id === questionId) : null;
  return { ev, question };
}

function voteQuestion(sessionId, questionId) {
  const { ev, question } = findQuestion(sessionId, questionId);
  if (!question) return;
  question.votes = (question.votes || 0) + 1;
  save();
  renderDetailView(ev);
}

function markAnswered(sessionId, questionId) {
  const { ev, question } = findQuestion(sessionId, questionId);
  if (!question) return;
  question.answered = !question.answered;
  save();
  renderDetailView(ev);
}

function hideQuestion(sessionId, questionId) {
  const { ev, question } = findQuestion(sessionId, questionId);
  if (!question) return;
  question.hidden = !question.hidden;
  save();
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
          ${s.speaker ? '🎤 ' + speakerName(s.speaker) + ' · ' : ''}
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
function closeModal(id) {
  document.getElementById(id).classList.add('hidden');
  if (id === 'modalEvent') clearEventFormAlert();
}

// Close modal when clicking outside
document.querySelectorAll('.modal-overlay').forEach(ov => {
  ov.addEventListener('click', e => {
    if (e.target === ov) ov.classList.add('hidden');
  });
});
