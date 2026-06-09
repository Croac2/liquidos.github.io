# TransLíquidos — Sistema de Gestión de Flota

Maquetación de sistema de logística para empresa de transporte de líquidos.

## Cómo ejecutar

### Opción 1 — Abrir directo en el navegador
Abre el archivo `index.html` directamente desde tu explorador de archivos.
> Nota: algunos navegadores bloquean scripts locales. Si no carga, usa la Opción 2.

### Opción 2 — Servidor local con Python (recomendado)
```bash
cd transliquidos
python3 -m http.server 8000
```
Luego abre: http://localhost:8000

### Opción 3 — Servidor con Node.js
```bash
npx serve .
```

---

## Estructura del proyecto

```
transliquidos/
├── index.html          # Página principal
├── css/
│   └── style.css       # Estilos del dashboard
├── js/
│   └── app.js          # Lógica de la aplicación
├── data/
│   ├── trucks.js       # Datos de los camiones (editable)
│   └── log.js          # Historial de viajes (editable)
└── README.md
```

---

## Funcionalidades incluidas

- **Dashboard** con métricas en tiempo real (disponibles, en ruta, mantenimiento, utilización)
- **Filtro por tipo de líquido** — muestra qué camiones pueden transportar X producto
- **Tarjetas por camión** con gráfico dónut de nivel de carga
- **Panel de detalle** al seleccionar un camión
- **Editar cualquier camión** desde el botón "Editar" (modal completo)
- **Agregar / eliminar camiones** desde la sección "Camiones"
- **Historial de viajes** con registro de nuevas rutas
- **Reportes** con gráficos comparativos de capacidad, distribución por líquido y tendencia de utilización

---

## Editar datos iniciales

### Camiones
Edita `data/trucks.js`. Cada camión tiene estos campos:

```js
{
  id: 'TL-001',          // Identificador
  name: 'Nombre',        // Nombre del camión
  status: 'available',   // 'available' | 'transit' | 'maintenance'
  capacity: 25000,       // Litros máximos
  load: 8000,            // Litros actuales
  location: 'Ciudad',    // Ubicación actual
  destination: '—',      // Destino (si está en ruta)
  distance: 0,           // Km restantes (si está en ruta)
  liquids: ['Agua', 'Gasolina'], // Líquidos permitidos
  driver: 'Nombre',      // Conductor
  year: 2020,            // Año del vehículo
  lastService: '2025-01-01', // Fecha último servicio
  plate: 'GUA-0000'      // Placa
}
```

### Líquidos disponibles
Por defecto: Agua, Gasolina, Aceite, Ácido, Diésel.
Para agregar nuevos, edita `ALL_LIQUIDS` en `js/app.js` y agrega el color en `TAG_CLASS`.

---

## Tecnologías

- HTML5 / CSS3 / JavaScript puro (sin frameworks)
- Chart.js 4.4 (gráficos)
- Tabler Icons (iconografía)
