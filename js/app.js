import * as db from './db.js';
import {
  ageLabel, ageGroup, formatDate, todayISO, esc, resizeImage, fileDateISO,
  blobURL, revokeAll, blobToDataURL, dataURLToBlob,
} from './util.js';
import { MILESTONES, milestoneById } from './milestones.js';

const $view = document.getElementById('view');
const $title = document.getElementById('title');
const $subtitle = document.getElementById('subtitle');

let profile = null;

// Utilidades de UI -----------------------------------------------------------

let toastTimer;
function toast(msg) {
  const t = document.getElementById('toast');
  t.textContent = msg;
  t.classList.add('show');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => t.classList.remove('show'), 2200);
}

function setActiveTab(tab) {
  document.querySelectorAll('.tabbar a').forEach((a) => a.classList.toggle('active', a.dataset.tab === tab));
}

function updateHeader() {
  if (profile?.name) {
    $title.textContent = profile.name;
    $subtitle.textContent = profile.birth ? ageLabel(profile.birth) : '';
  } else {
    $title.textContent = 'Agugu';
    $subtitle.textContent = 'Álbum de bebé';
  }
}

const go = (hash) => { location.hash = hash; };

// Router ---------------------------------------------------------------------

const routes = [
  [/^#?\/?$/, 'album', viewAlbum],
  [/^#\/nuevo(?:\?hito=([\w-]+))?$/, 'nuevo', (hito) => viewEntryForm(null, hito)],
  [/^#\/editar\/([\w-]+)$/, 'album', (id) => viewEntryForm(id)],
  [/^#\/entrada\/([\w-]+)$/, 'album', viewEntry],
  [/^#\/hitos$/, 'hitos', viewMilestones],
  [/^#\/crecimiento$/, 'crecimiento', viewGrowth],
  [/^#\/perfil$/, 'perfil', viewProfile],
];

async function render() {
  revokeAll();
  const hash = location.hash || '#/';
  for (const [re, tab, fn] of routes) {
    const m = hash.match(re);
    if (m) {
      setActiveTab(tab);
      try {
        await fn(...m.slice(1));
      } catch (err) {
        console.error(err);
        $view.innerHTML = `<div class="card">Algo salió mal: ${esc(err.message)}</div>`;
      }
      window.scrollTo(0, 0);
      return;
    }
  }
  go('#/');
}

// Álbum ----------------------------------------------------------------------

function photosHTML(photos, max = 3) {
  if (!photos?.length) return '';
  const shown = photos.slice(0, max);
  const cols = shown.length === 1 ? 1 : shown.length === 2 ? 2 : 3;
  return `<div class="photos n${shown.length}" style="--cols:${cols}">${
    shown.map((b) => `<img src="${blobURL(b)}" alt="" loading="lazy">`).join('')
  }</div>`;
}

async function viewAlbum() {
  const entries = await db.listEntries();

  if (!profile?.name && !entries.length) {
    $view.innerHTML = `
      <div class="card empty">
        <div class="big">👶</div>
        <h2>¡Bienvenidos a Agugu!</h2>
        <p class="muted">Empieza contándonos quién es el protagonista de este álbum.</p>
        <a class="btn" href="#/perfil">Crear perfil</a>
      </div>`;
    return;
  }

  if (!entries.length) {
    $view.innerHTML = `
      <div class="card empty">
        <div class="big">📷</div>
        <h2>Tu álbum está vacío</h2>
        <p class="muted">Añade la primera foto o momento especial.</p>
        <a class="btn" href="#/nuevo">Añadir momento</a>
      </div>`;
    return;
  }

  let html = '';
  let lastKey = null;
  for (const e of entries) {
    const g = ageGroup(profile?.birth, e.date);
    if (g.key !== lastKey) {
      html += `<h2 class="month-header">${esc(g.label)}</h2>`;
      lastKey = g.key;
    }
    const ms = e.milestone && milestoneById(e.milestone);
    html += `
      <a class="card entry" href="#/entrada/${e.id}">
        ${photosHTML(e.photos)}
        <div class="body">
          ${ms ? `<span class="badge">${ms.icon} Hito</span>` : ''}
          <h3>${esc(e.title || (ms ? ms.title : 'Momento'))}</h3>
          <div class="meta">${esc(formatDate(e.date))}${profile?.birth ? ' · ' + esc(ageLabel(profile.birth, e.date)) : ''}</div>
          ${e.note ? `<p>${esc(e.note.length > 180 ? e.note.slice(0, 180) + '…' : e.note)}</p>` : ''}
        </div>
      </a>`;
  }
  $view.innerHTML = html;
}

// Detalle --------------------------------------------------------------------

async function viewEntry(id) {
  const e = await db.getEntry(id);
  if (!e) { go('#/'); return; }
  const ms = e.milestone && milestoneById(e.milestone);
  $view.innerHTML = `
    <div class="card">
      <div class="detail-photos">${(e.photos || []).map((b) => `<img src="${blobURL(b)}" alt="">`).join('')}</div>
      ${ms ? `<span class="badge">${ms.icon} ${esc(ms.title)}</span>` : ''}
      <h2 style="margin:6px 0 2px">${esc(e.title || (ms ? ms.title : 'Momento'))}</h2>
      <div class="muted">${esc(formatDate(e.date))}${profile?.birth ? ' · ' + esc(ageLabel(profile.birth, e.date)) : ''}</div>
      ${e.note ? `<p style="white-space:pre-wrap">${esc(e.note)}</p>` : ''}
      <div class="actions">
        <a class="btn secondary" href="#/editar/${e.id}">Editar</a>
        <a class="btn ghost" href="#/">Volver</a>
      </div>
    </div>`;
}

// Formulario de momento ------------------------------------------------------

async function viewEntryForm(id, presetMilestone) {
  const existing = id ? await db.getEntry(id) : null;
  if (id && !existing) { go('#/'); return; }

  const entry = existing || {
    id: db.uid(), title: '',
    date: presetMilestone === 'nacimiento' && profile?.birth ? profile.birth : todayISO(), note: '',
    milestone: presetMilestone || '', photos: [], createdAt: Date.now(),
  };
  let photos = [...(entry.photos || [])];
  let dateTouched = !!existing || presetMilestone === 'nacimiento';

  // Hitos ya usados por otras entradas (para no duplicarlos)
  const used = new Set((await db.listEntries()).filter((x) => x.id !== entry.id && x.milestone).map((x) => x.milestone));

  $view.innerHTML = `
    <form class="card" id="entry-form" autocomplete="off">
      <h2 style="margin-top:0">${existing ? 'Editar momento' : 'Nuevo momento'}</h2>
      <div class="field">
        <label>Fotos</label>
        <div class="photo-picker" id="picker"></div>
      </div>
      <div class="field">
        <label for="f-title">Título</label>
        <input type="text" id="f-title" maxlength="120" placeholder="Ej.: Primer paseo al parque" value="${esc(entry.title)}">
      </div>
      <div class="row">
        <div class="field">
          <label for="f-date">Fecha</label>
          <input type="date" id="f-date" required value="${esc(entry.date)}">
        </div>
        <div class="field">
          <label for="f-ms">Hito</label>
          <select id="f-ms">
            <option value="">— Ninguno —</option>
            ${MILESTONES.map((m) => `<option value="${m.id}" ${m.id === entry.milestone ? 'selected' : ''} ${used.has(m.id) ? 'disabled' : ''}>${m.icon} ${esc(m.title)}${used.has(m.id) ? ' ✓' : ''}</option>`).join('')}
          </select>
        </div>
      </div>
      <p class="muted" id="f-age" style="margin:-6px 0 12px;font-size:.85rem"></p>
      <div class="field">
        <label for="f-note">Nota</label>
        <textarea id="f-note" placeholder="¿Qué pasó? ¿Cómo te sentiste?">${esc(entry.note)}</textarea>
      </div>
      <div class="actions">
        <button class="btn" type="submit">Guardar</button>
        <a class="btn ghost" href="${existing ? '#/entrada/' + entry.id : '#/'}">Cancelar</a>
        ${existing ? '<button class="btn danger" type="button" id="f-delete">Eliminar</button>' : ''}
      </div>
    </form>`;

  const $picker = document.getElementById('picker');
  const $date = document.getElementById('f-date');
  const $age = document.getElementById('f-age');

  const updateAge = () => { $age.textContent = profile?.birth && $date.value ? `Edad: ${ageLabel(profile.birth, $date.value)}` : ''; };
  $date.addEventListener('input', () => { dateTouched = true; updateAge(); });
  updateAge();

  function drawPicker() {
    $picker.innerHTML = photos.map((b, i) => `
      <div class="thumb"><img src="${blobURL(b)}" alt=""><button type="button" class="remove" data-i="${i}" aria-label="Quitar foto">✕</button></div>
    `).join('') + `
      <label class="add-photo">＋<br>Añadir fotos<input type="file" accept="image/*" multiple></label>`;
  }
  drawPicker();

  $picker.addEventListener('click', (ev) => {
    const btn = ev.target.closest('.remove');
    if (!btn) return;
    photos.splice(Number(btn.dataset.i), 1);
    drawPicker();
  });

  $picker.addEventListener('change', async (ev) => {
    const files = [...(ev.target.files || [])];
    if (!files.length) return;
    toast('Procesando fotos…');
    for (const f of files) {
      try {
        photos.push(await resizeImage(f));
      } catch (err) {
        console.error(err);
        toast('No se pudo leer una de las fotos');
      }
    }
    if (!dateTouched) {
      const d = fileDateISO(files[0]);
      if (d && d <= todayISO()) { $date.value = d; updateAge(); }
    }
    drawPicker();
  });

  document.getElementById('entry-form').addEventListener('submit', async (ev) => {
    ev.preventDefault();
    const data = {
      ...entry,
      title: document.getElementById('f-title').value.trim(),
      date: $date.value,
      milestone: document.getElementById('f-ms').value,
      note: document.getElementById('f-note').value.trim(),
      photos,
      updatedAt: Date.now(),
    };
    if (!data.title && !data.milestone && !data.photos.length && !data.note) {
      toast('Añade al menos una foto, un título o una nota');
      return;
    }
    await db.saveEntry(data);
    toast('Guardado');
    go(`#/entrada/${data.id}`);
  });

  document.getElementById('f-delete')?.addEventListener('click', async () => {
    if (!confirm('¿Eliminar este momento? No se puede deshacer.')) return;
    await db.deleteEntry(entry.id);
    toast('Eliminado');
    go('#/');
  });
}

// Hitos ----------------------------------------------------------------------

async function viewMilestones() {
  const entries = await db.listEntries();
  const byMs = new Map(entries.filter((e) => e.milestone).map((e) => [e.milestone, e]));
  const done = MILESTONES.filter((m) => byMs.has(m.id)).length;

  $view.innerHTML = `
    <div class="card">
      <strong>${done} de ${MILESTONES.length} hitos</strong>
      <div class="progress"><div style="width:${(done / MILESTONES.length) * 100}%"></div></div>
      <p class="muted" style="margin:8px 0 0;font-size:.85rem">Las edades son orientativas: cada bebé tiene su ritmo.</p>
    </div>
    <div class="card" style="padding:4px 12px">
      ${MILESTONES.map((m) => {
        const e = byMs.get(m.id);
        const href = e ? `#/entrada/${e.id}` : `#/nuevo?hito=${m.id}`;
        const sub = e
          ? `${formatDate(e.date)}${profile?.birth ? ' · ' + ageLabel(profile.birth, e.date) : ''}`
          : m.typical ? `Suele ser hacia los ${m.typical} meses` : 'Los primeros días';
        return `
          <a class="milestone ${e ? 'done' : ''}" href="${href}">
            <span class="icon">${m.icon}</span>
            <span class="txt">${esc(m.title)}<small>${esc(sub)}</small></span>
            <span class="check">${e ? '✓' : 'Añadir'}</span>
          </a>`;
      }).join('')}
    </div>`;
}

// Crecimiento ----------------------------------------------------------------

function lineChart(points, unit) {
  // points: [{x: días, y: valor}]
  if (points.length < 2) return '<p class="muted" style="font-size:.85rem">Añade al menos dos medidas para ver la gráfica.</p>';
  const W = 320, H = 160, P = { l: 34, r: 10, t: 10, b: 22 };
  const xs = points.map((p) => p.x), ys = points.map((p) => p.y);
  const x0 = Math.min(...xs), x1 = Math.max(...xs);
  let y0 = Math.min(...ys), y1 = Math.max(...ys);
  const pad = (y1 - y0) * 0.1 || 1;
  y0 -= pad; y1 += pad;
  const sx = (x) => P.l + ((x - x0) / (x1 - x0 || 1)) * (W - P.l - P.r);
  const sy = (y) => H - P.b - ((y - y0) / (y1 - y0)) * (H - P.t - P.b);
  const d = points.map((p, i) => `${i ? 'L' : 'M'}${sx(p.x).toFixed(1)},${sy(p.y).toFixed(1)}`).join(' ');
  const fmt = (v) => (Math.abs(v) >= 10 ? v.toFixed(0) : v.toFixed(1));
  return `
    <svg viewBox="0 0 ${W} ${H}" role="img" aria-label="Evolución en ${unit}">
      <line class="axis" x1="${P.l}" y1="${H - P.b}" x2="${W - P.r}" y2="${H - P.b}"/>
      <line class="axis" x1="${P.l}" y1="${P.t}" x2="${P.l}" y2="${H - P.b}"/>
      <text class="lbl" x="${P.l - 4}" y="${sy(y1 - pad) + 3}" text-anchor="end">${fmt(y1 - pad)}</text>
      <text class="lbl" x="${P.l - 4}" y="${sy(y0 + pad) + 3}" text-anchor="end">${fmt(y0 + pad)}</text>
      <text class="lbl" x="${W - P.r}" y="${H - 6}" text-anchor="end">${unit}</text>
      <path class="line" d="${d}"/>
      ${points.map((p) => `<circle class="dot" cx="${sx(p.x).toFixed(1)}" cy="${sy(p.y).toFixed(1)}" r="3.5"/>`).join('')}
    </svg>`;
}

async function viewGrowth() {
  const rows = await db.listGrowth();
  const dayOf = (iso) => Date.parse(iso + 'T00:00:00Z') / 86400000;
  const series = (k) => rows.filter((r) => r[k] != null).map((r) => ({ x: dayOf(r.date), y: r[k] }));
  const num = (v) => (v == null ? '—' : String(v).replace('.', ','));

  $view.innerHTML = `
    <form class="card" id="g-form">
      <h2 style="margin-top:0">Nueva medida</h2>
      <div class="field">
        <label for="g-date">Fecha</label>
        <input type="date" id="g-date" required value="${todayISO()}">
      </div>
      <div class="row">
        <div class="field"><label for="g-w">Peso (kg)</label><input type="number" id="g-w" step="0.01" min="0" max="60" inputmode="decimal"></div>
        <div class="field"><label for="g-h">Talla (cm)</label><input type="number" id="g-h" step="0.1" min="0" max="200" inputmode="decimal"></div>
        <div class="field"><label for="g-c">Cabeza (cm)</label><input type="number" id="g-c" step="0.1" min="0" max="80" inputmode="decimal"></div>
      </div>
      <button class="btn block" type="submit">Añadir</button>
    </form>

    ${rows.length ? `
    <div class="card chart"><strong>Peso</strong>${lineChart(series('weight'), 'kg')}</div>
    <div class="card chart"><strong>Talla</strong>${lineChart(series('height'), 'cm')}</div>
    <div class="card">
      <table class="growth">
        <thead><tr><th>Fecha</th><th>Edad</th><th>kg</th><th>cm</th><th>Cabeza</th><th></th></tr></thead>
        <tbody>
          ${rows.slice().reverse().map((r) => `
            <tr>
              <td>${esc(new Date(r.date + 'T00:00').toLocaleDateString('es', { day: 'numeric', month: 'short', year: '2-digit' }))}</td>
              <td>${profile?.birth ? esc(ageLabel(profile.birth, r.date)) : ''}</td>
              <td>${num(r.weight)}</td><td>${num(r.height)}</td><td>${num(r.head)}</td>
              <td><button data-del="${r.id}" aria-label="Borrar">🗑</button></td>
            </tr>`).join('')}
        </tbody>
      </table>
    </div>` : '<div class="card empty"><div class="big">📏</div><p class="muted">Registra el peso y la talla en cada revisión para ver cómo crece.</p></div>'}
  `;

  const val = (id) => {
    const v = document.getElementById(id).value;
    return v === '' ? null : Number(v);
  };

  document.getElementById('g-form').addEventListener('submit', async (ev) => {
    ev.preventDefault();
    const r = { id: db.uid(), date: document.getElementById('g-date').value, weight: val('g-w'), height: val('g-h'), head: val('g-c') };
    if (r.weight == null && r.height == null && r.head == null) { toast('Introduce al menos una medida'); return; }
    await db.saveGrowth(r);
    toast('Medida guardada');
    render();
  });

  $view.querySelectorAll('[data-del]').forEach((b) => b.addEventListener('click', async () => {
    if (!confirm('¿Borrar esta medida?')) return;
    await db.deleteGrowth(b.dataset.del);
    render();
  }));
}

// Perfil y copia de seguridad ------------------------------------------------

async function viewProfile() {
  const p = profile || { name: '', birth: '', avatar: null };
  let avatar = p.avatar || null;

  $view.innerHTML = `
    <form class="card" id="p-form">
      <div class="center">
        <label for="p-avatar" style="cursor:pointer">
          <div id="p-avatar-view"></div>
          <span class="muted" style="font-weight:400">Cambiar foto</span>
        </label>
        <input type="file" id="p-avatar" accept="image/*" class="hidden">
      </div>
      <div class="field">
        <label for="p-name">Nombre</label>
        <input type="text" id="p-name" required maxlength="60" value="${esc(p.name)}" placeholder="Nombre del bebé">
      </div>
      <div class="field">
        <label for="p-birth">Fecha de nacimiento</label>
        <input type="date" id="p-birth" value="${esc(p.birth)}">
      </div>
      <button class="btn block" type="submit">Guardar perfil</button>
    </form>

    <div class="card">
      <h3 style="margin-top:0">Copia de seguridad</h3>
      <p class="muted" style="font-size:.9rem">Las fotos se guardan solo en este dispositivo. Exporta una copia de vez en cuando
      para no perderlas si borras los datos del navegador o cambias de móvil.</p>
      <div class="actions">
        <button class="btn secondary" id="b-export" type="button">Exportar copia</button>
        <label class="btn ghost" style="margin:0">Importar copia<input type="file" id="b-import" accept="application/json,.json" class="hidden"></label>
      </div>
      <p class="muted" id="b-usage" style="font-size:.8rem;margin-bottom:0"></p>
    </div>`;

  const $av = document.getElementById('p-avatar-view');
  const drawAvatar = () => {
    $av.innerHTML = avatar ? `<img class="avatar" src="${blobURL(avatar)}" alt="">` : '<div class="avatar">👶</div>';
  };
  drawAvatar();

  document.getElementById('p-avatar').addEventListener('change', async (ev) => {
    const f = ev.target.files?.[0];
    if (!f) return;
    avatar = await resizeImage(f, 512);
    drawAvatar();
  });

  document.getElementById('p-form').addEventListener('submit', async (ev) => {
    ev.preventDefault();
    profile = {
      name: document.getElementById('p-name').value.trim(),
      birth: document.getElementById('p-birth').value,
      avatar,
    };
    await db.saveProfile(profile);
    db.requestPersistence();
    updateHeader();
    toast('Perfil guardado');
  });

  document.getElementById('b-export').addEventListener('click', exportBackup);
  document.getElementById('b-import').addEventListener('change', (ev) => {
    const f = ev.target.files?.[0];
    if (f) importBackup(f);
    ev.target.value = '';
  });

  if (navigator.storage?.estimate) {
    const { usage } = await navigator.storage.estimate();
    if (usage != null) document.getElementById('b-usage').textContent = `Espacio usado: ${(usage / 1048576).toFixed(1)} MB`;
  }
}

async function exportBackup() {
  toast('Preparando copia…');
  const entries = await db.listEntries();
  const growth = await db.listGrowth();
  const data = {
    app: 'agugu',
    version: 1,
    exportedAt: new Date().toISOString(),
    profile: profile ? { ...profile, avatar: profile.avatar ? await blobToDataURL(profile.avatar) : null } : null,
    entries: await Promise.all(entries.map(async (e) => ({
      ...e, photos: await Promise.all((e.photos || []).map(blobToDataURL)),
    }))),
    growth,
  };
  const name = `agugu-${(profile?.name || 'album').toLowerCase().replace(/[^a-z0-9áéíóúñü]+/gi, '-')}-${todayISO()}.json`;
  const file = new File([JSON.stringify(data)], name, { type: 'application/json' });

  if (navigator.canShare?.({ files: [file] })) {
    try {
      await navigator.share({ files: [file], title: 'Copia de Agugu' });
      return;
    } catch (err) {
      if (err.name === 'AbortError') return;
    }
  }
  const a = document.createElement('a');
  a.href = URL.createObjectURL(file);
  a.download = name;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(a.href), 5000);
}

async function importBackup(file) {
  let data;
  try {
    data = JSON.parse(await file.text());
  } catch {
    toast('El archivo no es una copia válida');
    return;
  }
  if (data?.app !== 'agugu') { toast('El archivo no es una copia de Agugu'); return; }
  if (!confirm('Importar reemplazará todo lo que hay ahora en este dispositivo. ¿Continuar?')) return;

  toast('Importando…');
  await db.clearAll();
  if (data.profile) {
    profile = { ...data.profile, avatar: data.profile.avatar ? await dataURLToBlob(data.profile.avatar) : null };
    await db.saveProfile(profile);
  } else {
    profile = null;
  }
  for (const e of data.entries || []) {
    await db.saveEntry({ ...e, photos: await Promise.all((e.photos || []).map(dataURLToBlob)) });
  }
  for (const g of data.growth || []) await db.saveGrowth(g);
  updateHeader();
  toast('Copia importada');
  if (location.hash === '#/' || !location.hash) render(); else go('#/');
}

// Arranque -------------------------------------------------------------------

async function start() {
  profile = (await db.getProfile()) || null;
  updateHeader();
  window.addEventListener('hashchange', render);
  await render();

  if ('serviceWorker' in navigator && location.protocol !== 'file:') {
    navigator.serviceWorker.register('sw.js').catch((err) => console.warn('SW no registrado', err));
  }
}

start();
