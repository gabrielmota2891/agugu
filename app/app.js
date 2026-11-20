/* Rossy Group App · Fase 1 — portal de clientes + panel del equipo */
(function () {
  'use strict';
  const app = document.getElementById('app');
  const S = window.Store;

  /* ---------- utilidades ---------- */
  const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const money = n => '$' + Number(n || 0).toLocaleString('en-US', { maximumFractionDigits: 0 });
  const ic = (id, cls = '') => `<svg class="${cls}"><use href="#i-${id}"/></svg>`;
  const check = '<svg viewBox="0 0 24 24"><path d="m5 12 5 5 9-10" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"/></svg>';
  const heart = '<svg viewBox="0 0 24 24"><path d="M12 20s-7.5-4.6-9.3-9.2C1.5 7.6 3.6 4.5 7 4.5c2 0 3.4 1.1 5 3 1.6-1.9 3-3 5-3 3.4 0 5.5 3.1 4.3 6.3C19.5 15.4 12 20 12 20z" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linejoin="round"/></svg>';
  const send = '<svg viewBox="0 0 24 24"><path d="M4 12 20 4l-6 16-3-7z" fill="none" stroke="currentColor" stroke-width="2" stroke-linejoin="round"/></svg>';
  const logout = '<svg viewBox="0 0 24 24"><path d="M15 4h3a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2h-3M10 16l-4-4 4-4M6 12h10" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round"/></svg>';
  const trash = '<svg viewBox="0 0 24 24"><path d="M4 7h16M9 7V4h6v3M6 7l1 13h10l1-13" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round"/></svg>';
  const back = '<svg viewBox="0 0 24 24"><path d="m15 5-7 7 7 7" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"/></svg>';
  const camera = '<svg viewBox="0 0 24 24"><path d="M4 8h3l2-3h6l2 3h3v11H4z" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linejoin="round"/><circle cx="12" cy="13" r="3.5" fill="none" stroke="currentColor" stroke-width="1.8"/></svg>';
  const edit = '<svg viewBox="0 0 24 24"><path d="M4 20h4L19 9l-4-4L4 16zM14 6l4 4" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linejoin="round"/></svg>';

  const d0 = s => new Date(String(s).length <= 10 ? s + 'T12:00:00' : s);
  const fdate = (s, opt = { day: 'numeric', month: 'short' }) => s ? d0(s).toLocaleDateString('es-PR', opt) : '';
  const fday = s => fdate(s, { weekday: 'long', day: 'numeric', month: 'short' });
  function ago(iso) {
    const m = (Date.now() - d0(iso)) / 60000;
    if (m < 1) return 'Ahora';
    if (m < 60) return `Hace ${Math.floor(m)} min`;
    if (m < 60 * 24) return `Hace ${Math.floor(m / 60)} h`;
    if (m < 60 * 48) return 'Ayer';
    return fdate(iso);
  }
  const hour = t => { if (!t) return ''; const [h, m] = t.split(':').map(Number); return `${(h % 12) || 12}:${String(m).padStart(2, '0')} ${h < 12 ? 'a.m.' : 'p.m.'}`; };
  const first = n => String(n || '').split(' ')[0];
  const initials = n => String(n || '?').trim().split(/\s+/).slice(0, 2).map(w => w[0]).join('').toUpperCase();

  function progress(p) {
    const n = p.stages.length; if (!n) return 0;
    const done = p.stages.filter(s => s.status === 'done').length;
    const now = p.stages.some(s => s.status === 'now') ? .5 : 0;
    return Math.min(100, Math.round((done + now) / n * 100));
  }
  function stageIdx(p) { const i = p.stages.findIndex(s => s.status === 'now'); return i >= 0 ? i + 1 : p.stages.filter(s => s.status === 'done').length; }
  function totals(p) {
    const extra = p.changes.filter(c => c.status === 'aprobado').reduce((a, c) => a + +c.amount, 0);
    const total = +p.total + extra;
    const paid = p.payments.filter(x => x.status === 'pagado').reduce((a, x) => a + +x.amount, 0);
    return { total, paid, pending: Math.max(0, total - paid), extra, pct: total ? Math.round(paid / total * 100) : 0 };
  }
  const unread = (p, who) => who === 'admin'
    ? p.messages.filter(m => m.from === 'cliente' && m.date > (p.readAdmin || '')).length
    : p.messages.filter(m => m.from === 'equipo' && m.date > (p.readClient || '')).length;
  const nextVisit = p => p.visits.filter(v => v.date >= S.today()).sort((a, b) => (a.date + a.time).localeCompare(b.date + b.time))[0];

  function toast(msg) {
    document.querySelectorAll('.toast').forEach(t => t.remove());
    const t = document.createElement('div'); t.className = 'toast'; t.textContent = msg;
    document.body.appendChild(t); setTimeout(() => t.remove(), 2400);
  }
  function save(fn, ok) {
    try { S.update(fn); if (ok) toast(ok); render(); return true; }
    catch (e) { toast('No hay espacio suficiente en este dispositivo. Borra fotos antiguas.'); return false; }
  }
  function sheet(html) {
    closeSheet();
    const bg = document.createElement('div'); bg.className = 'sheet-bg';
    bg.innerHTML = `<div class="sheet" role="dialog"><div class="grab"></div>${html}</div>`;
    bg.addEventListener('click', e => { if (e.target === bg) closeSheet(); });
    document.body.appendChild(bg);
    const f = bg.querySelector('input:not([type=file]),textarea'); if (f && matchMedia('(pointer:fine)').matches) f.focus();
  }
  function closeSheet() { document.querySelectorAll('.sheet-bg').forEach(x => x.remove()); }
  function confirmSheet(text, action, id) {
    sheet(`<h2>${esc(text)}</h2><div class="btns"><button class="btn alt" data-a="close">Cancelar</button><button class="btn" style="background:var(--bad)" data-a="${action}" data-id="${id}">Eliminar</button></div>`);
  }

  function compress(file, max = 1280, q = .78) {
    return new Promise((res, rej) => {
      const r = new FileReader();
      r.onerror = rej;
      r.onload = () => {
        const img = new Image();
        img.onerror = rej;
        img.onload = () => {
          const k = Math.min(1, max / Math.max(img.width, img.height));
          const c = document.createElement('canvas'); c.width = Math.round(img.width * k); c.height = Math.round(img.height * k);
          c.getContext('2d').drawImage(img, 0, 0, c.width, c.height);
          res(c.toDataURL('image/jpeg', q));
        };
        img.src = r.result;
      };
      r.readAsDataURL(file);
    });
  }

  /* ---------- router ---------- */
  const sess = () => S.get().session;
  function go(h) { if (location.hash === h) render(); else location.hash = h; }
  window.addEventListener('hashchange', render);

  function render() {
    const h = location.hash.replace(/^#/, '') || '/';
    const [path, qs] = h.split('?');
    const parts = path.split('/').filter(Boolean);
    const s = sess();
    let html = '';
    if (parts[0] === 'c' && s && s.role === 'cliente' && S.project(s.projectId)) html = client(S.project(s.projectId), parts[1] || 'inicio');
    else if (parts[0] === 'a' && s && s.role === 'admin') {
      if (parts[1] === 'p' && S.project(parts[2])) html = adminProject(S.project(parts[2]), parts[3] || 'resumen');
      else html = adminList(parts[1] || 'activos');
    } else if (s && parts[0] !== 'login') { return go(s.role === 'admin' ? '#/a' : '#/c/inicio'); }
    else html = login(new URLSearchParams(qs || ''));
    app.innerHTML = html;
    const chat = app.querySelector('.chat');
    if (chat) {
      window.scrollTo(0, document.body.scrollHeight);
      const p = S.project(s.role === 'admin' ? parts[2] : s.projectId);
      const key = s.role === 'admin' ? 'readAdmin' : 'readClient';
      try { S.update(() => { p[key] = new Date().toISOString(); }); } catch (e) { }
    }
  }

  /* ---------- login ---------- */
  let loginTab = 'cliente';
  function login(q) {
    const code = q.get('code') || '';
    if (code) loginTab = 'cliente';
    return `<div class="login">
      <div class="brand"><svg><use href="#i-logo"/></svg><h1>ROSSY GROUP</h1><p>Construimos tus sueños, creamos realidades.</p></div>
      <div class="seg"><button class="${loginTab === 'cliente' ? 'on' : ''}" data-a="loginTab" data-id="cliente">Soy cliente</button><button class="${loginTab === 'admin' ? 'on' : ''}" data-a="loginTab" data-id="admin">Equipo Rossy</button></div>
      ${loginTab === 'cliente' ? `
      <form data-f="loginClient">
        <div class="field"><label class="l" for="code">Código de tu proyecto</label><input class="in" id="code" name="code" placeholder="Ej. COCINA-2026" value="${esc(code)}" autocapitalize="characters" autocomplete="off" required></div>
        <button class="btn block">Ver mi proyecto</button>
      </form>
      <p class="small muted" style="text-align:center;margin-top:14px">Rossy Group te envía este código al comenzar tu proyecto.</p>` : `
      <form data-f="loginAdmin">
        <div class="field"><label class="l" for="pin">PIN del equipo</label><input class="in" id="pin" name="pin" type="password" inputmode="numeric" placeholder="••••" required></div>
        <button class="btn block dark">Entrar al panel</button>
      </form>`}
      <div class="hint">Modo demostración · Cliente: <b>COCINA-2026</b> · Equipo: PIN <b>2026</b></div>
    </div>`;
  }

  /* ---------- cliente ---------- */
  function tabbar(base, cur, items) {
    return `<nav class="tabbar">${items.map(([k, label, icon, badge]) => `<a href="#${base}/${k}" class="${cur === k ? 'on' : ''}">${ic(icon)}${label}${badge ? `<span class="badge">${badge}</span>` : ''}</a>`).join('')}</nav>`;
  }
  function client(p, tab) {
    const u = unread(p, 'cliente');
    const pendingChanges = p.changes.filter(c => c.status === 'pendiente').length;
    const views = { inicio: cHome, avances: cFeed, pagos: cPay, mensajes: cChat };
    const body = (views[tab] || cHome)(p);
    return body + tabbar('/c', tab, [['inicio', 'Inicio', 'house'], ['avances', 'Avances', 'floor'], ['pagos', 'Pagos', 'shield', pendingChanges], ['mensajes', 'Mensajes', 'wa', u]]);
  }
  function projCard(p) {
    const pr = progress(p), st = p.status === 'terminado';
    return `<div class="card proj"><div class="img" style="background-image:url('${esc(p.cover)}')"><span class="chip ${st ? 'ok' : ''}">● ${st ? 'Terminado' : 'En progreso'}</span></div>
      <div class="bd"><h3>${esc(p.title)}</h3><div class="small muted">${esc(p.location)} · ${st ? 'Entregado' : 'Entrega estimada'}: ${fdate(p.due)}</div>
      <div class="bar"><i style="width:${pr}%"></i></div><div class="pct"><span>Etapa ${stageIdx(p)} de ${p.stages.length}</span><span>${pr}%</span></div></div></div>`;
  }
  function stagesList(p, admin) {
    if (!p.stages.length) return `<div class="empty">Aún no hay etapas.</div>`;
    return `<ul class="steps">${p.stages.map((s, i) => `<li class="${s.status}"><span class="dot">${s.status === 'done' ? check : ''}</span><div class="st"><b>${esc(s.name)}</b><small>${s.status === 'done' ? 'Completado · ' + fdate(s.date) : s.status === 'now' ? 'En curso' + (admin ? ' desde ' + fdate(s.date) : ' · nuestro equipo está trabajando') : 'Estimado · ' + fdate(s.date)}</small>
      ${admin ? `<div class="tools">${s.status === 'now' ? `<button class="btn sm ok" data-a="stageDone" data-id="${s.id}">${check} Completar</button>` : ''}${s.status === 'todo' ? `<button class="btn sm alt" data-a="stageStart" data-id="${s.id}">Iniciar</button>` : ''}${s.status === 'done' ? `<button class="btn sm alt" data-a="stageReopen" data-id="${s.id}">Reabrir</button>` : ''}<button class="btn sm alt" data-a="stageEdit" data-id="${s.id}">${edit}</button>${i > 0 ? `<button class="btn sm alt" data-a="stageUp" data-id="${s.id}">↑</button>` : ''}<button class="btn sm danger" data-a="askStageDel" data-id="${s.id}">${trash}</button></div>` : ''}
      </div></li>`).join('')}</ul>`;
  }
  function visitCard(v, admin) {
    if (!v) return '';
    return `<div class="card row-ic"><div class="ic">${ic('clock')}</div><div class="grow"><b>${admin ? 'Visita' : 'Próxima visita'}</b><small>${fday(v.date)} · ${hour(v.time)}${v.note ? ' · ' + esc(v.note) : ''}</small></div>${admin ? `<button class="icon-btn" data-a="askVisitDel" data-id="${v.id}" aria-label="Eliminar">${trash}</button>` : ''}</div>`;
  }
  let deferredInstall = null, installDismissed = false;
  window.addEventListener('beforeinstallprompt', e => { e.preventDefault(); deferredInstall = e; });
  function installBanner() {
    const standalone = matchMedia('(display-mode: standalone)').matches || navigator.standalone;
    let dis = installDismissed; try { dis = dis || !!localStorage.getItem('rg-install-dismiss'); } catch (e) { }
    if (standalone || dis) return '';
    const ios = /iphone|ipad|ipod/i.test(navigator.userAgent);
    if (!deferredInstall && !ios) return '';
    return `<div class="install">${ic('logo')}<div><b>Instala la app</b>${ios ? 'Toca Compartir → "Agregar a inicio"' : 'Accede a tu obra con un toque'}</div>${ios ? `<button class="btn sm alt" data-a="dismissInstall">OK</button>` : `<button class="btn sm" data-a="install">Instalar</button>`}</div>`;
  }
  function cHome(p) {
    const v = nextVisit(p);
    const ch = p.changes.filter(c => c.status === 'pendiente');
    const last = p.posts.slice().sort((a, b) => b.date.localeCompare(a.date))[0];
    const tel = S.get().settings.phone;
    return `<main class="view">
      <div class="top"><div class="t"><small>¡Hola, ${esc(first(p.client.name))}! 👋</small><h1>Mi proyecto</h1></div><div class="act"><svg class="logo-r"><use href="#i-logo"/></svg><button class="icon-btn" data-a="logout" aria-label="Salir">${logout}</button></div></div>
      ${installBanner()}
      ${projCard(p)}
      ${ch.length ? `<a href="#/c/pagos" class="card row-ic" style="text-decoration:none;color:inherit;border:1.5px dashed var(--pink);box-shadow:none"><div class="ic">📝</div><div class="grow"><b>${ch.length === 1 ? 'Tienes un cambio por aprobar' : `Tienes ${ch.length} cambios por aprobar`}</b><small>${esc(ch[0].desc)} · +${money(ch[0].amount)}</small></div></a>` : ''}
      ${visitCard(v)}
      <div class="sec"><h2>Etapas</h2></div>
      <div class="card">${stagesList(p)}</div>
      ${last ? `<div class="sec"><h2>Último avance</h2><a href="#/c/avances">Ver todos</a></div>${postCard(p, last)}` : ''}
      <div class="sec"><h2>¿Necesitas algo?</h2></div>
      <div class="btns"><a class="btn alt" href="#/c/mensajes">${ic('wa')}Escribir</a><a class="btn alt" href="tel:+${tel}">${ic('phone')}Llamar</a></div>
    </main>`;
  }
  function postCard(p, x, admin) {
    const who = x.author === 'natalie' ? ['Natalie Rossy', 'N', 'dark'] : ['Equipo Rossy Group', 'R', ''];
    return `<article class="card post">${x.photo ? `<img class="ph" src="${esc(x.photo)}" alt="" loading="lazy" data-a="zoom" data-id="${esc(x.photo)}">` : ''}
      <div class="bd"><div class="who"><div class="av sm ${who[2]}">${who[1]}</div><div><b>${who[0]}</b><small>${ago(x.date)}</small></div></div>
      <p>${esc(x.text)}</p>
      <div class="foot">${x.stage ? `<span class="chip">${esc(x.stage)}</span>` : '<span></span>'}
      ${admin ? `<div class="btns" style="flex:none">${x.photo && x.photo !== p.cover ? `<button class="btn sm alt" data-a="setCover" data-id="${x.id}">Portada</button>` : ''}<button class="btn sm danger" data-a="askPostDel" data-id="${x.id}">${trash}</button></div>` : `<button class="like ${x.liked ? 'on' : ''}" data-a="like" data-id="${x.id}">${heart}${x.liked ? 'Te encanta' : 'Me encanta'}</button>`}</div></div></article>`;
  }
  function feed(p, admin) {
    const posts = p.posts.slice().sort((a, b) => b.date.localeCompare(a.date));
    const photos = posts.filter(x => x.photo).map(x => x.photo);
    return `${photos.length ? `<div class="sec" style="margin-top:4px"><h2>Galería</h2><span class="small muted">${photos.length} foto${photos.length > 1 ? 's' : ''}</span></div><div class="gal" style="margin-bottom:6px">${photos.slice(0, 6).map(ph => `<img src="${esc(ph)}" alt="" loading="lazy" data-a="zoom" data-id="${esc(ph)}">`).join('')}</div>` : ''}
      <div class="sec"><h2>Publicaciones</h2></div>
      ${posts.length ? posts.map(x => postCard(p, x, admin)).join('') : `<div class="empty">${camera}<br>${admin ? 'Publica la primera foto del avance.' : 'Pronto verás aquí las fotos de tu obra.'}</div>`}`;
  }
  function cFeed(p) {
    return `<main class="view"><div class="top"><div class="t"><small>${esc(p.title)}</small><h1>Avances</h1></div><div class="av">${initials(p.client.name)}</div></div>${feed(p)}</main>`;
  }
  function payBlock(p, admin) {
    const t = totals(p);
    const pays = p.payments.slice().sort((a, b) => a.date.localeCompare(b.date));
    const ch = p.changes.slice().sort((a, b) => b.date.localeCompare(a.date));
    return `<div class="card total"><small>Total del proyecto${t.extra ? ` (incluye ${money(t.extra)} en cambios)` : ''}</small><div class="big">${money(t.total)}</div>
      <div class="bar"><i style="width:${t.pct}%"></i></div><div class="pct"><span>Pagado: ${money(t.paid)}</span><span>Pendiente: ${money(t.pending)}</span></div></div>
      <div class="sec"><h2>Pagos</h2>${admin ? `<button data-a="newPay">+ Añadir</button>` : ''}</div>
      <div class="card" style="padding:4px 16px">${pays.length ? pays.map(x => `<div class="pay"><div class="ic ${x.status === 'pagado' ? 'ok' : 'pend'}">${x.status === 'pagado' ? ic('check') : ic('time')}</div>
        <div class="t"><b>${esc(x.concept)}</b><small>${x.status === 'pagado' ? fdate(x.date) + (x.method ? ' · ' + esc(x.method) : '') : 'Previsto · ' + fdate(x.date)}</small></div>
        <div class="amt">${money(x.amount)}<small class="${x.status === 'pagado' ? 'okc' : 'pk'}">${x.status === 'pagado' ? 'Pagado' : 'Pendiente'}</small></div></div>
        ${admin ? `<div class="btns" style="padding-bottom:10px">${x.status === 'pendiente' ? `<button class="btn sm ok" data-a="markPaid" data-id="${x.id}">Marcar pagado</button>` : `<button class="btn sm alt" data-a="markPending" data-id="${x.id}">Marcar pendiente</button>`}<button class="btn sm danger" style="flex:none" data-a="askPayDel" data-id="${x.id}">${trash}</button></div>` : ''}`).join('') : '<div class="empty">Sin pagos registrados.</div>'}</div>
      <div class="sec"><h2>Cambios al proyecto</h2>${admin ? `<button data-a="newChange">+ Proponer</button>` : ''}</div>
      ${ch.length ? ch.map(c => `<div class="card chg ${c.status !== 'pendiente' ? 'resolved' : ''}">
        <div style="display:flex;justify-content:space-between;gap:10px;align-items:flex-start"><b>${esc(c.desc)}</b><b style="white-space:nowrap">+${money(c.amount)}</b></div>
        <p>Propuesto el ${fdate(c.date)} · ${c.status === 'pendiente' ? '<span class="wc">Esperando aprobación</span>' : c.status === 'aprobado' ? '<span class="okc">Aprobado ✓</span>' : 'Rechazado'}</p>
        ${c.status === 'pendiente' && !admin ? `<div class="btns"><button class="btn" data-a="approve" data-id="${c.id}">Aprobar</button><button class="btn alt" data-a="reject" data-id="${c.id}">Rechazar</button></div>` : ''}
        ${admin ? `<div class="btns"><button class="btn sm danger" style="flex:none" data-a="askChangeDel" data-id="${c.id}">${trash} Eliminar</button></div>` : ''}
      </div>`).join('') : `<div class="card flat empty" style="padding:18px">No hay cambios propuestos.</div>`}`;
  }
  function cPay(p) {
    return `<main class="view"><div class="top"><div class="t"><small>${esc(p.title)}</small><h1>Pagos</h1></div><div class="av">${initials(p.client.name)}</div></div>${payBlock(p)}
      <p class="small muted" style="text-align:center;margin-top:16px">Para pagar, contacta a Rossy Group por mensaje o ATH Móvil.</p></main>`;
  }
  function chat(p, me) {
    return `<div class="chat">${p.messages.length ? p.messages.map(m => {
      const mine = (me === 'cliente') === (m.from === 'cliente');
      return `<div class="msg ${mine ? 'me' : 'them'}">${!mine ? `<div class="from">${m.from === 'cliente' ? esc(p.client.name) : 'Rossy Group'}</div>` : ''}${esc(m.text)}<small>${ago(m.date)}</small></div>`;
    }).join('') : `<div class="empty">${ic('wa')}<br>Escribe tu primer mensaje.</div>`}</div>`;
  }
  function cChat(p) {
    return `<main class="view"><div class="top"><div class="t"><small>Equipo Rossy Group</small><h1>Mensajes</h1></div><svg class="logo-r"><use href="#i-logo"/></svg></div>
      ${chat(p, 'cliente')}<form class="composer" data-f="msg" data-id="${p.id}"><input class="in" name="t" placeholder="Escribe un mensaje…" autocomplete="off"><button class="btn" aria-label="Enviar">${send}</button></form></main>`;
  }

  /* ---------- admin ---------- */
  let adminFilter = 'activos';
  function adminList(f) {
    const d = S.get();
    const ps = d.projects.filter(p => adminFilter === 'todos' || (adminFilter === 'activos' ? p.status === 'activo' : p.status === 'terminado'));
    const act = d.projects.filter(p => p.status === 'activo');
    const due = d.projects.reduce((a, p) => a + totals(p).pending, 0);
    const msgs = d.projects.reduce((a, p) => a + unread(p, 'admin'), 0);
    const chg = d.projects.reduce((a, p) => a + p.changes.filter(c => c.status === 'pendiente').length, 0);
    return `<main class="view no-tab" style="padding-bottom:100px">
      <div class="top"><div class="t"><small>Panel del equipo</small><h1>Proyectos</h1></div><div class="act"><svg class="logo-r"><use href="#i-logo"/></svg><button class="icon-btn" data-a="logout" aria-label="Salir">${logout}</button></div></div>
      <div class="stats"><div class="stat"><b>${act.length}</b><small>Activos</small></div><div class="stat"><b>${money(due)}</b><small>Por cobrar</small></div><div class="stat"><b>${msgs}</b><small>Mensajes nuevos</small></div></div>
      ${chg ? `<p class="small muted" style="margin:8px 2px 0">📝 ${chg} cambio${chg > 1 ? 's' : ''} esperando aprobación del cliente</p>` : ''}
      <div class="seg" style="margin-top:16px">${[['activos', 'Activos'], ['terminados', 'Terminados'], ['todos', 'Todos']].map(([k, l]) => `<button class="${adminFilter === k ? 'on' : ''}" data-a="filter" data-id="${k}">${l}</button>`).join('')}</div>
      ${ps.length ? ps.map(p => { const u = unread(p, 'admin'), pr = progress(p); return `<a class="card pcard" href="#/a/p/${p.id}"><div class="th" style="background-image:url('${esc(p.cover)}')"></div><div class="grow"><b>${esc(p.title)}</b><span class="small muted">${esc(p.client.name)} · ${esc(p.location)}</span><div class="bar"><i style="width:${pr}%"></i></div></div><div style="text-align:right;flex:none"><b style="font-size:14px;color:var(--pink)">${pr}%</b>${u ? `<span class="chip" style="margin-top:6px">${u} nuevo${u > 1 ? 's' : ''}</span>` : ''}</div></a>`; }).join('') : `<div class="empty">No hay proyectos aquí.</div>`}
      <button class="fab" style="bottom:calc(24px + var(--safe-b))" data-a="newProject" aria-label="Nuevo proyecto">${ic('plus')}</button>
      <p class="small muted" style="text-align:center;margin-top:20px"><button data-a="resetDemo" style="color:var(--muted);text-decoration:underline;font-size:12px">Restablecer datos de demostración</button></p>
    </main>`;
  }
  function adminProject(p, tab) {
    const u = unread(p, 'admin');
    const tabs = [['resumen', 'Resumen'], ['etapas', 'Etapas'], ['avances', 'Avances'], ['pagos', 'Pagos'], ['mensajes', 'Mensajes', u]];
    let body = '';
    if (tab === 'resumen') body = aSummary(p);
    else if (tab === 'etapas') body = `<div class="card">${stagesList(p, true)}</div><form class="card" data-f="addStage" data-id="${p.id}"><div class="two"><div class="field" style="margin:0"><label class="l">Nueva etapa</label><input class="in" name="name" placeholder="Ej. Pintura" required></div><div class="field" style="margin:0"><label class="l">Fecha estimada</label><input class="in" type="date" name="date" value="${S.today(7)}" required></div></div><button class="btn block alt" style="margin-top:12px">+ Añadir etapa</button></form>`;
    else if (tab === 'avances') body = `<button class="btn block" data-a="newPost">${camera} Publicar avance</button><div style="height:8px"></div>${feed(p, true)}`;
    else if (tab === 'pagos') body = payBlock(p, true);
    else if (tab === 'mensajes') body = chat(p, 'admin') + `<form class="composer notab" data-f="msg" data-id="${p.id}"><input class="in" name="t" placeholder="Responder a ${esc(first(p.client.name))}…" autocomplete="off"><button class="btn" aria-label="Enviar">${send}</button></form>`;
    return `<main class="view no-tab" data-pid="${p.id}">
      <a class="back" href="#/a">${back} Proyectos</a>
      <div class="top" style="margin-top:0"><div class="t"><small>${esc(p.client.name)} · ${esc(p.location)}</small><h1>${esc(p.title)}</h1></div></div>
      <div class="seg">${tabs.map(([k, l, b]) => `<button class="${tab === k ? 'on' : ''}" data-a="tab" data-id="${k}">${l}${b ? `<span class="badge">${b}</span>` : ''}</button>`).join('')}</div>
      ${body}</main>`;
  }
  function shareUrl(p) { return location.origin + location.pathname + '#/login?code=' + encodeURIComponent(p.code); }
  function aSummary(p) {
    const vs = p.visits.slice().sort((a, b) => (a.date + a.time).localeCompare(b.date + b.time)).filter(v => v.date >= S.today(-1));
    const t = totals(p);
    return `${projCard(p)}
      <div class="card"><div class="row-ic"><div class="ic">${ic('shield')}</div><div class="grow"><b>Acceso del cliente</b><small>Código: <span class="code">${esc(p.code)}</span></small></div></div>
        <div class="btns" style="margin-top:12px"><button class="btn wa sm" data-a="shareWa">${ic('wa')} Enviar por WhatsApp</button><button class="btn alt sm" data-a="copyLink">Copiar enlace</button></div></div>
      <div class="stats"><div class="stat"><b>${money(t.total)}</b><small>Total</small></div><div class="stat"><b>${money(t.paid)}</b><small>Cobrado</small></div><div class="stat"><b>${money(t.pending)}</b><small>Pendiente</small></div></div>
      <div class="sec"><h2>Visitas programadas</h2><button data-a="newVisit">+ Programar</button></div>
      ${vs.length ? vs.map(v => visitCard(v, true)).join('') : `<div class="card flat empty" style="padding:18px">Sin visitas programadas.</div>`}
      <div class="sec"><h2>Datos del proyecto</h2><button data-a="editProject">Editar</button></div>
      <div class="card small" style="display:grid;gap:6px">
        <div><span class="muted">Cliente:</span> ${esc(p.client.name)}${p.client.phone ? ' · ' + esc(p.client.phone) : ''}</div>
        <div><span class="muted">Inicio:</span> ${fdate(p.start, { day: 'numeric', month: 'long', year: 'numeric' })} · <span class="muted">Entrega:</span> ${fdate(p.due, { day: 'numeric', month: 'long', year: 'numeric' })}</div>
        <div><span class="muted">Presupuesto base:</span> ${money(p.total)} · <span class="muted">Estado:</span> ${p.status === 'activo' ? 'Activo' : 'Terminado'}</div>
      </div>
      <button class="btn block danger" style="margin-top:8px" data-a="askProjectDel">${trash} Eliminar proyecto</button>`;
  }
  function projectForm(p) {
    const n = !p; p = p || { title: '', location: '', client: { name: '', phone: '' }, total: '', start: S.today(), due: S.today(30), status: 'activo' };
    return `<h2>${n ? 'Nuevo proyecto' : 'Editar proyecto'}</h2><form data-f="${n ? 'createProject' : 'saveProject'}">
      <div class="field"><label class="l">Proyecto</label><input class="in" name="title" value="${esc(p.title)}" placeholder="Ej. Remodelación de baño" required></div>
      <div class="two"><div class="field"><label class="l">Cliente</label><input class="in" name="client" value="${esc(p.client.name)}" required></div><div class="field"><label class="l">Teléfono cliente</label><input class="in" name="phone" type="tel" value="${esc(p.client.phone)}" placeholder="787-000-0000"></div></div>
      <div class="two"><div class="field"><label class="l">Pueblo</label><input class="in" name="location" value="${esc(p.location)}" required></div><div class="field"><label class="l">Presupuesto ($)</label><input class="in" name="total" type="number" min="0" step="1" value="${esc(p.total)}" required></div></div>
      <div class="two"><div class="field"><label class="l">Inicio</label><input class="in" type="date" name="start" value="${p.start}" required></div><div class="field"><label class="l">Entrega estimada</label><input class="in" type="date" name="due" value="${p.due}" required></div></div>
      ${n ? `<div class="field"><label class="l">Etapas (una por línea)</label><textarea class="in" name="stages">Diseño y aprobación\nDemolición / preparación\nConstrucción e instalación\nAcabados\nEntrega final</textarea></div>` : `<div class="field"><label class="l">Estado</label><select class="in" name="status"><option value="activo" ${p.status === 'activo' ? 'selected' : ''}>Activo</option><option value="terminado" ${p.status === 'terminado' ? 'selected' : ''}>Terminado</option></select></div>`}
      <button class="btn block">${n ? 'Crear proyecto' : 'Guardar cambios'}</button></form>`;
  }
  const curPid = () => (app.querySelector('[data-pid]') || {}).dataset?.pid;
  const curP = () => S.project(curPid());
  const pTab = () => location.hash.split('/')[4] || 'resumen';

  /* ---------- acciones ---------- */
  const A = {
    close: closeSheet,
    loginTab: id => { loginTab = id; render(); },
    logout: () => { loginTab = 'cliente'; S.update(d => { d.session = null; }); go('#/login'); },
    dismissInstall: () => { try { localStorage.setItem('rg-install-dismiss', '1'); } catch (e) { } installDismissed = true; render(); },
    install: async () => { if (deferredInstall) { deferredInstall.prompt(); await deferredInstall.userChoice; deferredInstall = null; render(); } },
    zoom: src => { const l = document.createElement('div'); l.className = 'lightbox'; l.innerHTML = `<img src="${esc(src)}" alt="">`; l.onclick = () => l.remove(); document.body.appendChild(l); },
    like: id => { const p = S.project(sess().projectId); save(() => { const x = p.posts.find(x => x.id === id); x.liked = !x.liked; }); },
    approve: id => { const p = S.project(sess().projectId); save(() => { const c = p.changes.find(c => c.id === id); c.status = 'aprobado'; p.messages.push({ id: S.uid(), from: 'cliente', text: `✅ Aprobé el cambio: ${c.desc} (+${money(c.amount)})`, date: new Date().toISOString() }); }, 'Cambio aprobado'); },
    reject: id => { const p = S.project(sess().projectId); save(() => { const c = p.changes.find(c => c.id === id); c.status = 'rechazado'; p.messages.push({ id: S.uid(), from: 'cliente', text: `❌ No aprobé el cambio: ${c.desc}`, date: new Date().toISOString() }); }, 'Cambio rechazado'); },
    filter: id => { adminFilter = id; render(); },
    tab: id => go(`#/a/p/${curPid()}/${id}`),
    newProject: () => sheet(projectForm()),
    editProject: () => sheet(projectForm(curP())),
    resetDemo: () => { if (confirm('¿Restablecer todos los datos de demostración?')) { S.reset(); S.update(d => { d.session = { role: 'admin' }; }); toast('Datos restablecidos'); render(); } },
    shareWa: () => { const p = curP(); const msg = `¡Hola ${first(p.client.name)}! 👋 Puedes seguir el avance de tu proyecto "${p.title}" con Rossy Group aquí:\n${shareUrl(p)}\n\nTu código de acceso: ${p.code}`; const ph = (p.client.phone || '').replace(/\D/g, ''); window.open(`https://wa.me/${ph ? (ph.length === 10 ? '1' + ph : ph) : ''}?text=${encodeURIComponent(msg)}`, '_blank', 'noopener'); },
    copyLink: async () => { const p = curP(); const t = `${shareUrl(p)}\nCódigo: ${p.code}`; try { await navigator.clipboard.writeText(t); toast('Enlace copiado'); } catch (e) { prompt('Copia este enlace:', t); } },
    newVisit: () => sheet(`<h2>Programar visita</h2><form data-f="addVisit"><div class="two"><div class="field"><label class="l">Fecha</label><input class="in" type="date" name="date" value="${S.today(1)}" required></div><div class="field"><label class="l">Hora</label><input class="in" type="time" name="time" value="08:00" required></div></div><div class="field"><label class="l">Motivo</label><input class="in" name="note" placeholder="Ej. Medida de topes"></div><button class="btn block">Guardar visita</button></form>`),
    askVisitDel: id => confirmSheet('¿Eliminar esta visita?', 'visitDel', id),
    visitDel: id => { closeSheet(); const p = curP(); save(() => { p.visits = p.visits.filter(v => v.id !== id); }, 'Visita eliminada'); },
    stageDone: id => { const p = curP(); save(() => { const i = p.stages.findIndex(s => s.id === id); p.stages[i].status = 'done'; p.stages[i].date = S.today(); const nx = p.stages.slice(i + 1).find(s => s.status === 'todo'); if (nx) { nx.status = 'now'; nx.date = S.today(); } else if (p.stages.every(s => s.status === 'done')) p.status = 'terminado'; }, '¡Etapa completada!'); },
    stageStart: id => { const p = curP(); save(() => { p.stages.forEach(s => { if (s.status === 'now') s.status = 'todo'; }); const s = p.stages.find(s => s.id === id); s.status = 'now'; s.date = S.today(); p.status = 'activo'; }, 'Etapa en curso'); },
    stageReopen: id => { const p = curP(); save(() => { p.stages.forEach(s => { if (s.status === 'now') s.status = 'todo'; }); p.stages.find(s => s.id === id).status = 'now'; p.status = 'activo'; }); },
    stageUp: id => { const p = curP(); save(() => { const i = p.stages.findIndex(s => s.id === id); [p.stages[i - 1], p.stages[i]] = [p.stages[i], p.stages[i - 1]]; }); },
    stageEdit: id => { const s = curP().stages.find(s => s.id === id); sheet(`<h2>Editar etapa</h2><form data-f="saveStage" data-id="${id}"><div class="field"><label class="l">Nombre</label><input class="in" name="name" value="${esc(s.name)}" required></div><div class="field"><label class="l">Fecha</label><input class="in" type="date" name="date" value="${s.date}" required></div><button class="btn block">Guardar</button></form>`); },
    askStageDel: id => confirmSheet('¿Eliminar esta etapa?', 'stageDel', id),
    stageDel: id => { closeSheet(); const p = curP(); save(() => { p.stages = p.stages.filter(s => s.id !== id); }, 'Etapa eliminada'); },
    newPost: () => { const p = curP(); const cur = p.stages.find(s => s.status === 'now'); sheet(`<h2>Publicar avance</h2><form data-f="addPost">
      <label class="photo-pick" id="pick"><input type="file" name="photo" accept="image/*">${camera}<br>Tomar o elegir foto</label>
      <div class="field" style="margin-top:14px"><label class="l">Mensaje para el cliente</label><textarea class="in" name="text" placeholder="Ej. ¡Hoy terminamos la instalación de gabinetes!" required></textarea></div>
      <div class="two"><div class="field"><label class="l">Etapa</label><select class="in" name="stage"><option value="">—</option>${p.stages.map(s => `<option ${cur && cur.id === s.id ? 'selected' : ''}>${esc(s.name)}</option>`).join('')}</select></div>
      <div class="field"><label class="l">Publicar como</label><select class="in" name="author"><option value="equipo">Equipo Rossy</option><option value="natalie">Natalie Rossy</option></select></div></div>
      <button class="btn block">Publicar</button></form>`); },
    setCover: id => { const p = curP(); save(() => { p.cover = p.posts.find(x => x.id === id).photo; }, 'Portada actualizada'); },
    askPostDel: id => confirmSheet('¿Eliminar esta publicación?', 'postDel', id),
    postDel: id => { closeSheet(); const p = curP(); save(() => { p.posts = p.posts.filter(x => x.id !== id); }, 'Publicación eliminada'); },
    newPay: () => sheet(`<h2>Nuevo pago</h2><form data-f="addPay"><div class="field"><label class="l">Concepto</label><input class="in" name="concept" placeholder="Ej. Segundo pago" required></div>
      <div class="two"><div class="field"><label class="l">Monto ($)</label><input class="in" type="number" min="0" step="1" name="amount" required></div><div class="field"><label class="l">Fecha</label><input class="in" type="date" name="date" value="${S.today()}" required></div></div>
      <div class="two"><div class="field"><label class="l">Estado</label><select class="in" name="status"><option value="pendiente">Pendiente</option><option value="pagado">Pagado</option></select></div><div class="field"><label class="l">Método</label><select class="in" name="method"><option></option><option>ATH Móvil</option><option>Tarjeta</option><option>Transferencia</option><option>Cheque</option><option>Efectivo</option></select></div></div>
      <button class="btn block">Guardar pago</button></form>`),
    markPaid: id => { const x = curP().payments.find(x => x.id === id); sheet(`<h2>Registrar pago</h2><p class="muted" style="margin:-6px 0 14px">${esc(x.concept)} · ${money(x.amount)}</p><form data-f="confirmPaid" data-id="${id}"><div class="two"><div class="field"><label class="l">Fecha</label><input class="in" type="date" name="date" value="${S.today()}" required></div><div class="field"><label class="l">Método</label><select class="in" name="method"><option>ATH Móvil</option><option>Tarjeta</option><option>Transferencia</option><option>Cheque</option><option>Efectivo</option></select></div></div><button class="btn block ok">Confirmar pago</button></form>`); },
    markPending: id => { const p = curP(); save(() => { p.payments.find(x => x.id === id).status = 'pendiente'; }); },
    askPayDel: id => confirmSheet('¿Eliminar este pago?', 'payDel', id),
    payDel: id => { closeSheet(); const p = curP(); save(() => { p.payments = p.payments.filter(x => x.id !== id); }, 'Pago eliminado'); },
    newChange: () => sheet(`<h2>Proponer cambio</h2><p class="muted small" style="margin:-6px 0 14px">El cliente lo verá en su app y podrá aprobarlo o rechazarlo.</p><form data-f="addChange"><div class="field"><label class="l">Descripción</label><input class="in" name="desc" placeholder="Ej. Cambiar a piso de porcelanato" required></div><div class="field"><label class="l">Costo adicional ($)</label><input class="in" type="number" min="0" step="1" name="amount" required></div><button class="btn block">Enviar al cliente</button></form>`),
    askChangeDel: id => confirmSheet('¿Eliminar este cambio?', 'changeDel', id),
    changeDel: id => { closeSheet(); const p = curP(); save(() => { p.changes = p.changes.filter(c => c.id !== id); }, 'Cambio eliminado'); },
    askProjectDel: () => confirmSheet('¿Eliminar este proyecto y todos sus datos?', 'projectDel', curPid()),
    projectDel: id => { closeSheet(); save(d => { d.projects = d.projects.filter(p => p.id !== id); }, 'Proyecto eliminado'); go('#/a'); }
  };

  document.addEventListener('click', e => {
    const el = e.target.closest('[data-a]'); if (!el) return;
    const fn = A[el.dataset.a]; if (!fn) return;
    e.preventDefault(); fn(el.dataset.id, el);
  });

  /* vista previa de foto */
  document.addEventListener('change', async e => {
    if (e.target.matches('#pick input[type=file]') && e.target.files[0]) {
      const pick = document.getElementById('pick');
      try { const url = await compress(e.target.files[0]); pick.dataset.photo = url; pick.innerHTML = `<input type="file" name="photo" accept="image/*"><img src="${url}" alt=""><span class="small">Toca para cambiar</span>`; }
      catch (err) { toast('No se pudo leer la imagen'); }
    }
  });

  const F = {
    loginClient: f => { const p = S.byCode(f.code.value); if (!p) return toast('Código no encontrado'); save(d => { d.session = { role: 'cliente', projectId: p.id }; }); go('#/c/inicio'); },
    loginAdmin: f => { if (f.pin.value !== S.get().settings.pin) return toast('PIN incorrecto'); save(d => { d.session = { role: 'admin' }; }); go('#/a'); },
    msg: (f, form) => { const t = f.t.value.trim(); if (!t) return; const p = S.project(form.dataset.id); const who = sess().role === 'admin' ? 'equipo' : 'cliente'; save(() => { const now = new Date().toISOString(); p.messages.push({ id: S.uid(), from: who, text: t, date: now }); p[who === 'equipo' ? 'readAdmin' : 'readClient'] = now; }); const i = app.querySelector('.composer .in'); if (i) i.focus(); },
    createProject: f => {
      const id = S.uid(); const slug = (f.title.value.split(' ').pop() || 'OBRA').normalize('NFD').replace(/[^A-Za-z]/g, '').toUpperCase().slice(0, 8) || 'OBRA';
      const code = slug + '-' + String(Math.floor(1000 + Math.random() * 9000));
      const stages = f.stages.value.split('\n').map(s => s.trim()).filter(Boolean).map((name, i) => ({ id: S.uid(), name, status: i === 0 ? 'now' : 'todo', date: S.today(i * 7) }));
      const ok = save(d => d.projects.unshift({ id, code, client: { name: f.client.value.trim(), phone: f.phone.value.trim() }, title: f.title.value.trim(), location: f.location.value.trim(), cover: 'img/casa.jpg', start: f.start.value, due: f.due.value, total: +f.total.value, status: 'activo', stages, posts: [], payments: [], changes: [], visits: [], messages: [], readAdmin: '', readClient: '' }), 'Proyecto creado');
      if (ok) { closeSheet(); go(`#/a/p/${id}/resumen`); }
    },
    saveProject: f => { const p = curP(); closeSheet(); save(() => { Object.assign(p, { title: f.title.value.trim(), location: f.location.value.trim(), total: +f.total.value, start: f.start.value, due: f.due.value, status: f.status.value }); p.client = { name: f.client.value.trim(), phone: f.phone.value.trim() }; }, 'Proyecto actualizado'); },
    addVisit: f => { const p = curP(); closeSheet(); save(() => p.visits.push({ id: S.uid(), date: f.date.value, time: f.time.value, note: f.note.value.trim() }), 'Visita programada'); },
    addStage: (f, form) => { const p = S.project(form.dataset.id); save(() => p.stages.push({ id: S.uid(), name: f.name.value.trim(), status: 'todo', date: f.date.value }), 'Etapa añadida'); },
    saveStage: (f, form) => { const p = curP(); closeSheet(); save(() => { const s = p.stages.find(s => s.id === form.dataset.id); s.name = f.name.value.trim(); s.date = f.date.value; }); },
    addPost: (f, form) => { const p = curP(); const photo = (document.getElementById('pick') || {}).dataset?.photo || ''; const ok = save(() => p.posts.push({ id: S.uid(), author: f.author.value, text: f.text.value.trim(), photo, stage: f.stage.value, date: new Date().toISOString(), liked: false }), 'Avance publicado'); if (ok) closeSheet(); },
    addPay: f => { const p = curP(); closeSheet(); save(() => p.payments.push({ id: S.uid(), concept: f.concept.value.trim(), amount: +f.amount.value, date: f.date.value, status: f.status.value, method: f.method.value }), 'Pago guardado'); },
    confirmPaid: (f, form) => { const p = curP(); closeSheet(); save(() => { const x = p.payments.find(x => x.id === form.dataset.id); x.status = 'pagado'; x.date = f.date.value; x.method = f.method.value; }, 'Pago registrado'); },
    addChange: f => { const p = curP(); closeSheet(); save(() => p.changes.push({ id: S.uid(), desc: f.desc.value.trim(), amount: +f.amount.value, status: 'pendiente', date: S.today() }), 'Cambio enviado al cliente'); }
  };
  document.addEventListener('submit', e => {
    const form = e.target.closest('form[data-f]'); if (!form) return;
    e.preventDefault(); const fn = F[form.dataset.f]; if (fn) fn(form.elements, form);
  });

  render();
  if ('serviceWorker' in navigator && location.protocol.startsWith('http')) navigator.serviceWorker.register('sw.js').catch(() => { });
})();
