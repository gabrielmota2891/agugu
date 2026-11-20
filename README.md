# Rossy Group — sitio web y app

## Sitio web
- `index.html` — versión de marca (rosa)
- `empresarial.html` — versión empresarial
- `img/` — imágenes

## App de clientes (`app/`) · Fase 1
App web instalable (PWA) para seguimiento de obra.

**Cliente** (entra con el código de su proyecto): ve etapas y % de avance, próxima visita,
fotos del avance, pagos, aprueba/rechaza cambios y chatea con el equipo.

**Equipo Rossy** (entra con PIN): crea proyectos, comparte el código por WhatsApp,
actualiza etapas, publica fotos desde el celular, registra pagos, propone cambios,
programa visitas y responde mensajes.

Demo: cliente `COCINA-2026` · PIN del equipo `2026`.

### Estado actual: modo demostración
Los datos se guardan en el navegador del dispositivo (`app/store.js`). Sirve para
presentar y probar la app, pero cliente y equipo no comparten datos entre dispositivos.

### Para producción (siguiente paso)
Reemplazar `store.js` por un backend (p. ej. Supabase: base de datos, login, almacenamiento
de fotos y notificaciones) manteniendo la misma interfaz `Store`.

### Probar localmente
```
cd app && python3 -m http.server 8000
# abrir http://localhost:8000
```
Publicar: arrastrar la carpeta del repo a Netlify Drop; la app queda en `/app/`.
