/* Capa de datos de la app.
 * Modo demo: guarda todo en localStorage de este dispositivo.
 * Para producción se reemplaza por un backend (p. ej. Supabase) manteniendo
 * la misma interfaz: Store.get(), Store.update(fn), Store.session...
 */
(function () {
  const KEY = 'rossy-app-v1';
  const uid = () => Math.random().toString(36).slice(2, 10);
  const today = (d = 0) => { const t = new Date(); t.setDate(t.getDate() + d); return t.toISOString().slice(0, 10); };
  const ago = (h) => new Date(Date.now() - h * 3600e3).toISOString();

  function seed() {
    return {
      version: 1,
      settings: { pin: '2026', company: 'Rossy Group', phone: '17874006223' },
      session: null,
      projects: [
        {
          id: 'p1', code: 'COCINA-2026',
          client: { name: 'Carmen Rivera', phone: '' },
          title: 'Remodelación de cocina', location: 'Guaynabo',
          cover: 'img/cocina.jpg', start: today(-16), due: today(22),
          total: 18500, status: 'activo',
          stages: [
            { id: uid(), name: 'Diseño y aprobación', status: 'done', date: today(-16) },
            { id: uid(), name: 'Demolición', status: 'done', date: today(-12) },
            { id: uid(), name: 'Gabinetes e instalación', status: 'now', date: today(-3) },
            { id: uid(), name: 'Topes y acabados', status: 'todo', date: today(15) },
            { id: uid(), name: 'Entrega final', status: 'todo', date: today(22) }
          ],
          posts: [
            { id: uid(), author: 'equipo', text: '¡Gabinetes superiores instalados! ✨ Mañana comenzamos con la isla central y la iluminación.', photo: 'img/cocina.jpg', stage: 'Gabinetes e instalación', date: ago(3), liked: false },
            { id: uid(), author: 'natalie', text: 'Carmen, ya llegaron los topes de cuarzo que elegiste 💕 Te los enseñamos el jueves en la visita.', photo: '', stage: 'Gabinetes e instalación', date: ago(26), liked: true },
            { id: uid(), author: 'equipo', text: 'Demolición completada y área limpia. Todo listo para la instalación.', photo: 'img/cortinas-zebra.jpg', stage: 'Demolición', date: ago(24 * 12), liked: false }
          ],
          payments: [
            { id: uid(), concept: 'Anticipo', amount: 5550, status: 'pagado', date: today(-16), method: 'ATH Móvil' },
            { id: uid(), concept: 'Fin de demolición', amount: 5550, status: 'pagado', date: today(-12), method: 'Tarjeta' },
            { id: uid(), concept: 'Entrega final', amount: 7400, status: 'pendiente', date: today(22), method: '' }
          ],
          changes: [
            { id: uid(), desc: 'Agregar iluminación LED bajo gabinetes', amount: 450, status: 'pendiente', date: today(-1) }
          ],
          visits: [
            { id: uid(), date: today(2), time: '08:00', note: 'Medida de topes' }
          ],
          messages: [
            { id: uid(), from: 'cliente', text: 'Hola! ¿A qué hora llegan mañana?', date: ago(5) },
            { id: uid(), from: 'equipo', text: '¡Hola Carmen! Llegamos a las 8:00 a.m. 😊', date: ago(4.5) }
          ],
          readAdmin: ago(4.5), readClient: ago(4)
        },
        {
          id: 'p2', code: 'PISCINA-7781',
          client: { name: 'Luis Ortiz', phone: '' },
          title: 'Construcción de piscina', location: 'Dorado',
          cover: 'img/piscina.jpg', start: today(-40), due: today(10),
          total: 32000, status: 'activo',
          stages: [
            { id: uid(), name: 'Permisos y diseño', status: 'done', date: today(-40) },
            { id: uid(), name: 'Excavación', status: 'done', date: today(-30) },
            { id: uid(), name: 'Estructura y plomería', status: 'done', date: today(-18) },
            { id: uid(), name: 'Losas y terminaciones', status: 'now', date: today(-5) },
            { id: uid(), name: 'Llenado y entrega', status: 'todo', date: today(10) }
          ],
          posts: [
            { id: uid(), author: 'equipo', text: 'Colocando las losas alrededor de la piscina.', photo: 'img/piscina.jpg', stage: 'Losas y terminaciones', date: ago(30), liked: true }
          ],
          payments: [
            { id: uid(), concept: 'Anticipo', amount: 12800, status: 'pagado', date: today(-40), method: 'Transferencia' },
            { id: uid(), concept: 'Estructura terminada', amount: 9600, status: 'pagado', date: today(-18), method: 'Transferencia' },
            { id: uid(), concept: 'Entrega final', amount: 9600, status: 'pendiente', date: today(10), method: '' }
          ],
          changes: [],
          visits: [],
          messages: [
            { id: uid(), from: 'cliente', text: '¿Podemos añadir luces dentro de la piscina?', date: ago(2) }
          ],
          readAdmin: ago(10), readClient: ago(2)
        },
        {
          id: 'p3', code: 'CORTINAS-3105',
          client: { name: 'Oficinas Torres', phone: '' },
          title: 'Screens enrollables', location: 'San Juan',
          cover: 'img/screens-oficina.jpg', start: today(-30), due: today(-2),
          total: 6200, status: 'terminado',
          stages: [
            { id: uid(), name: 'Medidas', status: 'done', date: today(-30) },
            { id: uid(), name: 'Fabricación', status: 'done', date: today(-15) },
            { id: uid(), name: 'Instalación', status: 'done', date: today(-2) }
          ],
          posts: [
            { id: uid(), author: 'equipo', text: 'Instalación completada en los ventanales del segundo piso.', photo: 'img/screens-oficina.jpg', stage: 'Instalación', date: ago(48), liked: true }
          ],
          payments: [
            { id: uid(), concept: 'Pago total', amount: 6200, status: 'pagado', date: today(-2), method: 'Cheque' }
          ],
          changes: [], visits: [], messages: [],
          readAdmin: ago(1), readClient: ago(1)
        }
      ]
    };
  }

  // Si el navegador bloquea el almacenamiento (vista previa, modo privado), funciona en memoria.
  let persistent = true;
  try { localStorage.setItem(KEY + '-t', '1'); localStorage.removeItem(KEY + '-t'); } catch (e) { persistent = false; }
  let data;
  try { data = (persistent && JSON.parse(localStorage.getItem(KEY))) || seed(); } catch (e) { data = seed(); }

  function save() {
    if (!persistent) return true;
    try { localStorage.setItem(KEY, JSON.stringify(data)); return true; }
    catch (e) { return false; }
  }

  window.Store = {
    uid, today,
    get: () => data,
    project: (id) => data.projects.find(p => p.id === id),
    byCode: (code) => data.projects.find(p => p.code.toUpperCase() === String(code).trim().toUpperCase()),
    update(fn) {
      const backup = JSON.stringify(data);
      fn(data);
      if (!save()) { data = JSON.parse(backup); throw new Error('quota'); }
    },
    reset() { data = seed(); save(); }
  };
  save();
})();
