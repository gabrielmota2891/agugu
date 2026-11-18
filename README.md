# agugu
App para álbum de bebé 👶

PWA instalable (iPhone y Android) hecha con HTML, CSS y JavaScript, sin dependencias ni compilación.
Todo se guarda **solo en el dispositivo** (IndexedDB).

## Funciones
- **Perfil**: nombre, fecha de nacimiento y foto. La cabecera muestra la edad actual.
- **Álbum**: momentos con varias fotos, título, fecha y nota, agrupados por mes de vida.
  Las fotos se reducen a 1600 px para ahorrar espacio.
- **Hitos**: 22 hitos típicos (primera sonrisa, primer diente, primeros pasos…) con progreso.
  Al tocar un hito pendiente se crea un momento ya asociado a él.
- **Crecimiento**: registro de peso, talla y perímetro de la cabeza, con gráficas.
- **Copia de seguridad**: exportar/importar todo (fotos incluidas) en un archivo `.json`.
- **Sin conexión**: un service worker guarda la app en caché.

## Probar en local
```sh
python3 -m http.server 8000
# abre http://localhost:8000
```

## Estructura
```
index.html            Estructura y barra de navegación
css/styles.css        Estilos (modo claro y oscuro)
js/app.js             Router y pantallas
js/db.js              IndexedDB (perfil, momentos, medidas)
js/util.js            Edad, fechas, fotos
js/milestones.js      Lista de hitos
sw.js                 Service worker (offline)
manifest.webmanifest  Datos para instalar la app
icons/                Iconos
```
