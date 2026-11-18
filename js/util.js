// Fechas y edad -----------------------------------------------------------

export const todayISO = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
};

const parse = (iso) => {
  const [y, m, d] = iso.split('-').map(Number);
  return { y, m, d };
};

const daysInMonth = (y, m) => new Date(y, m, 0).getDate(); // m: 1-12

/** Diferencia de calendario entre dos fechas ISO: { years, months, days, totalDays }. */
export function diff(fromISO, toISO) {
  const a = parse(fromISO);
  const b = parse(toISO);
  let years = b.y - a.y;
  let months = b.m - a.m;
  let days = b.d - a.d;
  if (days < 0) {
    months -= 1;
    // días del mes anterior a la fecha final
    const pm = b.m === 1 ? 12 : b.m - 1;
    const py = b.m === 1 ? b.y - 1 : b.y;
    days += daysInMonth(py, pm);
  }
  if (months < 0) { years -= 1; months += 12; }
  const totalDays = Math.round((Date.UTC(b.y, b.m - 1, b.d) - Date.UTC(a.y, a.m - 1, a.d)) / 86400000);
  return { years, months, days, totalDays };
}

const plural = (n, s, p) => `${n} ${n === 1 ? s : p}`;

/** Edad legible, p. ej. "3 meses y 5 días", "1 año y 2 meses". */
export function ageLabel(birthISO, atISO = todayISO()) {
  if (!birthISO) return '';
  const { years, months, days, totalDays } = diff(birthISO, atISO);
  if (totalDays < 0) {
    const w = Math.ceil(-totalDays / 7);
    return w <= 1 ? 'Antes de nacer' : `Embarazo · faltaban ${plural(w, 'semana', 'semanas')}`;
  }
  if (totalDays === 0) return 'Día de nacimiento';
  if (years === 0 && months === 0) {
    if (totalDays < 14) return plural(totalDays, 'día', 'días');
    const w = Math.floor(totalDays / 7);
    const d = totalDays % 7;
    return d ? `${plural(w, 'semana', 'semanas')} y ${plural(d, 'día', 'días')}` : plural(w, 'semana', 'semanas');
  }
  if (years === 0) return days ? `${plural(months, 'mes', 'meses')} y ${plural(days, 'día', 'días')}` : plural(months, 'mes', 'meses');
  return months ? `${plural(years, 'año', 'años')} y ${plural(months, 'mes', 'meses')}` : plural(years, 'año', 'años');
}

/** Clave y etiqueta para agrupar el álbum por mes de vida. */
export function ageGroup(birthISO, atISO) {
  if (!birthISO) {
    const { y, m } = parse(atISO);
    const label = new Date(y, m - 1, 1).toLocaleDateString('es', { month: 'long', year: 'numeric' });
    return { key: `${y}-${m}`, label };
  }
  const { years, months, totalDays } = diff(birthISO, atISO);
  if (totalDays < 0) return { key: 'pre', label: 'Antes de nacer' };
  const total = years * 12 + months;
  if (total === 0) return { key: 'm0', label: 'Primer mes' };
  if (total % 12 === 0) return { key: `m${total}`, label: `${plural(total / 12, 'año', 'años')}` };
  if (total < 24) return { key: `m${total}`, label: plural(total, 'mes', 'meses') };
  return { key: `m${total}`, label: `${plural(years, 'año', 'años')} y ${plural(months, 'mes', 'meses')}` };
}

export function formatDate(iso) {
  if (!iso) return '';
  const { y, m, d } = parse(iso);
  return new Date(y, m - 1, d).toLocaleDateString('es', { day: 'numeric', month: 'long', year: 'numeric' });
}

// DOM ----------------------------------------------------------------------

export function esc(s = '') {
  return String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}

// Fotos --------------------------------------------------------------------

/** Reduce una imagen a máx. `max` px de lado y la convierte en JPEG. */
export async function resizeImage(file, max = 1600, quality = 0.85) {
  let bitmap;
  try {
    bitmap = await createImageBitmap(file, { imageOrientation: 'from-image' });
  } catch {
    bitmap = await new Promise((resolve, reject) => {
      const img = new Image();
      img.onload = () => resolve(img);
      img.onerror = reject;
      img.src = URL.createObjectURL(file);
    });
  }
  const w = bitmap.width;
  const h = bitmap.height;
  const scale = Math.min(1, max / Math.max(w, h));
  const canvas = document.createElement('canvas');
  canvas.width = Math.round(w * scale);
  canvas.height = Math.round(h * scale);
  canvas.getContext('2d').drawImage(bitmap, 0, 0, canvas.width, canvas.height);
  if (bitmap.close) bitmap.close();
  return new Promise((resolve) => canvas.toBlob(resolve, 'image/jpeg', quality));
}

/** Fecha de un archivo (lastModified) en ISO, útil como sugerencia. */
export function fileDateISO(file) {
  if (!file.lastModified) return null;
  const d = new Date(file.lastModified);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

// Gestión de object URLs para no perder memoria entre vistas
const urls = new Set();
export function blobURL(blob) {
  const u = URL.createObjectURL(blob);
  urls.add(u);
  return u;
}
export function revokeAll() {
  urls.forEach((u) => URL.revokeObjectURL(u));
  urls.clear();
}

export const blobToDataURL = (blob) =>
  new Promise((resolve, reject) => {
    const r = new FileReader();
    r.onload = () => resolve(r.result);
    r.onerror = () => reject(r.error);
    r.readAsDataURL(blob);
  });

export const dataURLToBlob = async (dataURL) => (await fetch(dataURL)).blob();
