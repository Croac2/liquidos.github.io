// js/app.js — Lógica principal del dashboard TransLíquidos

const trucks = trucksData;
const log    = logData;

const ALL_LIQUIDS = ['Agua', 'Gasolina', 'Aceite', 'Ácido', 'Diésel'];

const TAG_CLASS = {
  'Agua':    'tag-water',
  'Gasolina':'tag-gas',
  'Aceite':  'tag-oil',
  'Ácido':   'tag-acid',
  'Diésel':  'tag-diesel'
};

const STATUS_LABEL = { available:'Disponible', transit:'En ruta', maintenance:'Mantenimiento' };
const STATUS_DOT   = { available:'dot-available', transit:'dot-transit', maintenance:'dot-maintenance' };
const STATUS_PILL  = { available:'pill-available', transit:'pill-transit', maintenance:'pill-maintenance' };
const STATUS_COLOR = { available:'#1D9E75', transit:'#BA7517', maintenance:'#A32D2D' };
const LIQUID_COLOR = {
  'Agua':     '#2BA8DB',
  'Gasolina': '#BA7517',
  'Aceite':   '#C9922A',
  'Ácido':    '#D4537E',
  'Diésel':   '#888780'
};

let activeFilter  = 'Todos';
let logFilter     = 'Todos';
let selectedTruck = 0;
let editingIdx    = null;
let isAdding      = false;

let detailChart  = null;
let capChart, liquidChart, utilizationChart;

/* ──────────────── HELPERS ──────────────── */

function pct(t) { return Math.round(t.load / t.capacity * 100); }

function getTruckLiquid(t) {
  if (t.load <= 0) return null;
  if (t.activeTrip?.liquid) return t.activeTrip.liquid;
  if (t.loadLiquid) return t.loadLiquid;
  return t.liquids[0] || null;
}

function getTruckFillColor(t) {
  const liquid = getTruckLiquid(t);
  if (liquid && LIQUID_COLOR[liquid]) return LIQUID_COLOR[liquid];
  return STATUS_COLOR[t.status];
}

function getLoadDisplayColor(t) {
  const liquid = getTruckLiquid(t);
  if (liquid === 'Agua') return 'var(--water)';
  if (liquid === 'Aceite') return 'var(--oil)';
  if (t.status === 'available') return 'var(--green)';
  if (t.status === 'transit') return 'var(--amber)';
  return 'var(--red)';
}

function getCapacityFillClass(t) {
  const liquid = getTruckLiquid(t);
  if (liquid === 'Agua') return 'fill-water';
  if (liquid === 'Aceite') return 'fill-oil';
  return `fill-${t.status}`;
}

function ensureActiveTrip(t) {
  if (t.status !== 'transit') return null;
  if (t.activeTrip) return t.activeTrip;

  const entry = getActiveLogEntry(t.id);
  t.activeTrip = {
    origin: entry ? entry.origin : t.location,
    liquid: entry ? entry.liquid : (t.liquids[0] || 'Agua'),
    vol: entry ? entry.vol : t.load,
    dateOut: entry ? entry.dateOut : new Date().toISOString().split('T')[0],
    receivedBy: entry ? (entry.receivedBy || '') : '',
    deliveredBy: entry ? (entry.deliveredBy || '') : '',
    filledBy: entry ? (entry.filledBy || '') : ''
  };
  return t.activeTrip;
}

function getActiveLogEntry(truckId) {
  return log.find(r => r.truck === truckId && r.status === 'transit') || null;
}

function hasActiveTrip(t) {
  return t.status === 'transit' || !!getActiveLogEntry(t.id);
}

function canStartTrip(truckId) {
  return !getActiveLogEntry(truckId);
}

function logStatusLabel(status) {
  if (status === 'done') return 'Completado';
  if (status === 'cancelled') return 'Cancelado';
  return 'En curso';
}

function logStatusPill(status) {
  if (status === 'done') return 'pill-available';
  if (status === 'cancelled') return 'pill-cancelled';
  return 'pill-transit';
}

function parseDest(dest) {
  if (!dest || dest === '—') return '—';
  return dest.split('—')[0].trim() || dest;
}

function startTrip(truck, data) {
  if (!canStartTrip(data.id)) {
    alert(`El camión ${data.id} ya tiene un viaje en curso. Finaliza o cancela el viaje actual antes de iniciar otro.`);
    return false;
  }

  const trip = {
    origin: data.location,
    liquid: data.loadLiquid || data.liquids[0] || 'Agua',
    vol: data.load,
    dateOut: new Date().toISOString().split('T')[0],
    receivedBy: '',
    deliveredBy: '',
    filledBy: ''
  };
  data.activeTrip = trip;
  data.loadLiquid = trip.liquid;

  log.unshift({
    truck: data.id,
    origin: parseDest(data.location),
    dest: parseDest(data.destination),
    liquid: trip.liquid,
    vol: trip.vol,
    dateOut: trip.dateOut,
    dateIn: '',
    status: 'transit',
    receivedBy: '',
    deliveredBy: '',
    filledBy: ''
  });
  return true;
}

function syncTripFieldsToLog(truck) {
  const trip = truck.activeTrip;
  if (!trip) return;
  const entry = getActiveLogEntry(truck.id);
  if (!entry) return;
  entry.receivedBy = trip.receivedBy;
  entry.deliveredBy = trip.deliveredBy;
  entry.filledBy = trip.filledBy;
}

function updateTripField(field, value) {
  const t = trucks[selectedTruck];
  if (!t.activeTrip) ensureActiveTrip(t);
  if (!t.activeTrip) return;
  t.activeTrip[field] = value.trim();
  syncTripFieldsToLog(t);
}

function canCompleteTrip(t) {
  const trip = ensureActiveTrip(t);
  if (!trip) return false;
  return trip.receivedBy && trip.deliveredBy && trip.filledBy;
}

function completeTrip() {
  const t = trucks[selectedTruck];
  const trip = ensureActiveTrip(t);
  const checkbox = document.getElementById('tripCompleted');
  const nextStatus = document.getElementById('tripNextStatus').value;

  if (!checkbox || !checkbox.checked) {
    alert('Marca la casilla de recorrido completado para confirmar la llegada.');
    return;
  }
  if (!canCompleteTrip(t)) {
    alert('Completa los campos: Quién recibió, Quién entregó y Quién llenó.');
    return;
  }

  const entry = getActiveLogEntry(t.id);
  const dateIn = new Date().toISOString().split('T')[0];

  if (entry) {
    entry.status = 'done';
    entry.dateIn = dateIn;
    entry.receivedBy = trip.receivedBy;
    entry.deliveredBy = trip.deliveredBy;
    entry.filledBy = trip.filledBy;
    entry.dest = parseDest(t.destination);
  } else {
    log.unshift({
      truck: t.id,
      origin: parseDest(trip.origin),
      dest: parseDest(t.destination),
      liquid: trip.liquid,
      vol: trip.vol,
      dateOut: trip.dateOut,
      dateIn,
      status: 'done',
      receivedBy: trip.receivedBy,
      deliveredBy: trip.deliveredBy,
      filledBy: trip.filledBy
    });
  }

  t.location = t.destination !== '—' ? t.destination : t.location;
  t.destination = '—';
  t.distance = 0;
  t.load = 0;
  delete t.loadLiquid;
  t.status = nextStatus;
  delete t.activeTrip;

  renderAll();
}

function cancelTrip() {
  const t = trucks[selectedTruck];
  if (t.status !== 'transit') return;

  if (!confirm(`¿Cancelar el viaje de ${t.id}? El camión volverá a estar disponible en su punto de origen.`)) return;

  const trip = ensureActiveTrip(t);
  const entry = getActiveLogEntry(t.id);
  const dateIn = new Date().toISOString().split('T')[0];

  if (entry) {
    entry.status = 'cancelled';
    entry.dateIn = dateIn;
  }

  t.location = trip?.origin || t.location;
  t.destination = '—';
  t.distance = 0;
  t.status = 'available';
  delete t.activeTrip;

  renderAll();
}

function tagsHtml(liquids) {
  return liquids.map(l => `<span class="tag ${TAG_CLASS[l] || ''}">${l}</span>`).join('');
}

function truckSvgHtml(t, i) {
  const p = pct(t);
  const color = getTruckFillColor(t);
  const tankX = 10, tankY = 14, tankW = 128, tankH = 42;
  const fillH = Math.round(tankH * p / 100);
  const fillY = tankY + tankH - fillH;
  const textColor = p > 35 ? '#fff' : 'var(--text-primary)';

  return `
    <svg viewBox="0 0 220 72" class="truck-svg" role="img" aria-label="Nivel de carga ${t.id}: ${p}%">
      <defs>
        <clipPath id="tank-clip-${i}">
          <rect x="${tankX}" y="${tankY}" width="${tankW}" height="${tankH}" rx="5"/>
        </clipPath>
      </defs>
      <line x1="12" y1="56" x2="208" y2="56" class="truck-chassis"/>
      <circle cx="38" cy="60" r="7" class="truck-wheel"/>
      <circle cx="38" cy="60" r="3" class="truck-wheel-hub"/>
      <circle cx="72" cy="60" r="7" class="truck-wheel"/>
      <circle cx="72" cy="60" r="3" class="truck-wheel-hub"/>
      <circle cx="142" cy="60" r="7" class="truck-wheel"/>
      <circle cx="142" cy="60" r="3" class="truck-wheel-hub"/>
      <circle cx="176" cy="60" r="7" class="truck-wheel"/>
      <circle cx="176" cy="60" r="3" class="truck-wheel-hub"/>
      <rect x="${tankX}" y="${tankY}" width="${tankW}" height="${tankH}" rx="5" class="truck-tank"/>
      ${p > 0 ? `<rect x="${tankX}" y="${fillY}" width="${tankW}" height="${fillH}" fill="${color}" clip-path="url(#tank-clip-${i})"/>` : ''}
      <line x1="52" y1="${tankY + 3}" x2="52" y2="${tankY + tankH - 3}" class="truck-divider"/>
      <line x1="94" y1="${tankY + 3}" x2="94" y2="${tankY + tankH - 3}" class="truck-divider"/>
      <text x="${tankX + tankW / 2}" y="39" text-anchor="middle" class="truck-pct" fill="${textColor}">${p}%</text>
      <rect x="144" y="22" width="52" height="34" rx="4" class="truck-cabin"/>
      <rect x="176" y="27" width="16" height="22" rx="2" class="truck-window"/>
    </svg>`;
}

function updateDate() {
  const now = new Date();
  document.getElementById('topbarDate').textContent =
    now.toLocaleDateString('es-EC', { weekday:'long', year:'numeric', month:'long', day:'numeric' });
}

/* ──────────────── NAVIGATION ──────────────── */

document.querySelectorAll('.nav-item').forEach(item => {
  item.addEventListener('click', e => {
    e.preventDefault();
    const page = item.dataset.page;
    document.querySelectorAll('.nav-item').forEach(n => n.classList.remove('active'));
    item.classList.add('active');
    document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
    document.getElementById('page-' + page).classList.add('active');
    document.getElementById('pageTitle').textContent = item.textContent.trim();
    if (page === 'reports') renderReportCharts();
    if (page === 'trucks') renderTruckTable();
  });
});

function toggleSidebar() {
  const sb = document.getElementById('sidebar');
  if (window.innerWidth <= 768) {
    sb.classList.toggle('open');
  } else {
    sb.classList.toggle('collapsed');
  }
}

/* ──────────────── METRICS ──────────────── */

function renderMetrics(containerId) {
  const avail = trucks.filter(t => t.status === 'available').length;
  const inRt  = trucks.filter(t => t.status === 'transit').length;
  const maint = trucks.filter(t => t.status === 'maintenance').length;
  const totalCap  = trucks.reduce((a, t) => a + t.capacity, 0);
  const totalLoad = trucks.reduce((a, t) => a + t.load, 0);
  const utilPct   = Math.round(totalLoad / totalCap * 100);

  document.getElementById(containerId).innerHTML = `
    <div class="metric-card">
      <div class="metric-label">Camiones disponibles</div>
      <div class="metric-value mv-green">${avail}</div>
      <div class="metric-sub">de ${trucks.length} unidades</div>
    </div>
    <div class="metric-card">
      <div class="metric-label">En ruta</div>
      <div class="metric-value mv-amber">${inRt}</div>
      <div class="metric-sub">viajes activos</div>
    </div>
    <div class="metric-card">
      <div class="metric-label">En mantenimiento</div>
      <div class="metric-value mv-red">${maint}</div>
      <div class="metric-sub">fuera de servicio</div>
    </div>
    <div class="metric-card">
      <div class="metric-label">Utilización de flota</div>
      <div class="metric-value mv-blue">${utilPct}%</div>
      <div class="metric-sub">${totalLoad.toLocaleString()} / ${totalCap.toLocaleString()} L</div>
    </div>`;
}

/* ──────────────── FILTERS ──────────────── */

function renderFilters() {
  const wrap = document.getElementById('filters');
  wrap.innerHTML = ['Todos', ...ALL_LIQUIDS].map(l =>
    `<button class="filter-btn${activeFilter === l ? ' active' : ''}" onclick="setFilter('${l}')">${l}</button>`
  ).join('');
}

function setFilter(l) {
  activeFilter = l;
  renderFilters();
  renderTrucks();
}

/* ──────────────── TRUCKS GRID ──────────────── */

function renderTrucks() {
  const grid = document.getElementById('trucksGrid');

  grid.innerHTML = trucks.map((t, i) => {
    const show = activeFilter === 'Todos' || t.liquids.includes(activeFilter);
    const p    = pct(t);
    const loadColor = getLoadDisplayColor(t);
    return `
      <div class="truck-card${i === selectedTruck ? ' selected' : ''}${!show ? ' dimmed' : ''}"
           onclick="selectTruck(${i})" role="button" tabindex="0"
           aria-label="Camión ${t.id}, ${STATUS_LABEL[t.status]}">
        <div class="truck-top">
          <div>
            <div class="truck-id">${t.name}</div>
            <div class="truck-name">${t.id} · ${t.plate || '—'}</div>
          </div>
          <span class="status-pill ${STATUS_PILL[t.status]}">${STATUS_LABEL[t.status]}</span>
        </div>
        <div class="truck-viz">${truckSvgHtml(t, i)}</div>
        <div class="truck-stats">
          <div class="truck-stat">
            <span class="truck-stat-val" style="color:${loadColor}">${p}%</span>
            <span class="truck-stat-lbl">Carga</span>
          </div>
          <div class="truck-stat">
            <span class="truck-stat-val">${(t.capacity / 1000).toFixed(0)}k</span>
            <span class="truck-stat-lbl">Cap. L</span>
          </div>
          <div class="truck-stat">
            <span class="truck-stat-val">${(t.load / 1000).toFixed(1)}k</span>
            <span class="truck-stat-lbl">Actual</span>
          </div>
        </div>
        <div class="truck-tags">${tagsHtml(t.liquids)}</div>
        <div class="truck-meta">
          <span><i class="ti ti-map-pin" aria-hidden="true"></i>${t.location}</span>
          ${t.status === 'transit'
            ? `<span><i class="ti ti-route" aria-hidden="true"></i>${t.distance} km restantes</span>`
            : ''}
        </div>
      </div>`;
  }).join('');

  renderDetail();
}

/* ──────────────── DETAIL PANEL ──────────────── */

function selectTruck(i) {
  selectedTruck = i;
  renderTrucks();
}

function renderDetail() {
  const t = trucks[selectedTruck];
  const p = pct(t);
  const color = getTruckFillColor(t);

  if (detailChart) { detailChart.destroy(); detailChart = null; }

  document.getElementById('detailTitle').textContent = `${t.id} — ${t.name}`;

  document.getElementById('detailBody').innerHTML = `
    <div>
      <div style="font-size:12px;color:var(--text-muted);margin-bottom:8px">Nivel de carga</div>
      <div class="detail-chart-wrap">
        <canvas id="detailChart" role="img" aria-label="Carga actual ${t.id}: ${p}%">${p}% de ${t.capacity.toLocaleString()} L</canvas>
        <div class="detail-chart-center">
          <div class="detail-chart-pct">${p}%</div>
          <div class="detail-chart-sub">${t.load.toLocaleString()} L</div>
        </div>
      </div>
      <div style="text-align:center;font-size:12px;color:var(--text-muted);margin-top:6px">
        de ${t.capacity.toLocaleString()} L de capacidad
      </div>
    </div>
    <div class="detail-info">
      <div class="info-row">
        <span class="info-label">Estado</span>
        <span class="status-pill ${STATUS_PILL[t.status]}">${STATUS_LABEL[t.status]}</span>
      </div>
      <div class="info-row">
        <span class="info-label">Conductor</span>
        <span class="info-value">${t.driver}</span>
      </div>
      <div class="info-row">
        <span class="info-label">Placa</span>
        <span class="info-value">${t.plate || '—'}</span>
      </div>
      <div class="info-row">
        <span class="info-label">Ubicación</span>
        <span class="info-value">${t.location}</span>
      </div>
      <div class="info-row">
        <span class="info-label">Destino</span>
        <span class="info-value">${t.destination}</span>
      </div>
      ${t.status === 'transit' ? `
      <div class="info-row">
        <span class="info-label">Distancia restante</span>
        <span class="info-value">${t.distance} km</span>
      </div>` : ''}
      <div class="info-row">
        <span class="info-label">Año del vehículo</span>
        <span class="info-value">${t.year}</span>
      </div>
      <div class="info-row">
        <span class="info-label">Último servicio</span>
        <span class="info-value">${t.lastService}</span>
      </div>
      <div class="info-row">
        <span class="info-label">Líquidos permitidos</span>
        <span style="display:flex;gap:4px;flex-wrap:wrap">${tagsHtml(t.liquids)}</span>
      </div>
    </div>
    ${t.status === 'transit' ? renderTripPanel(t) : ''}`;

  const dc = document.getElementById('detailChart');
  if (dc) {
    detailChart = new Chart(dc, {
      type: 'doughnut',
      data: {
        datasets: [{
          data: [p, 100 - p],
          backgroundColor: [color, 'rgba(136,135,128,0.12)'],
          borderWidth: 0
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        cutout: '72%',
        plugins: { legend: { display: false }, tooltip: { enabled: false } }
      }
    });
  }
}

function renderTripPanel(t) {
  const trip = ensureActiveTrip(t);
  return `
    <div class="trip-panel">
      <div class="trip-panel-header">
        <div class="trip-panel-title"><i class="ti ti-route"></i> Viaje activo</div>
        <span class="status-pill pill-transit">En ruta</span>
      </div>
      <div class="trip-summary">
        <div class="trip-summary-item">
          <div class="trip-summary-label">Origen</div>
          <div class="trip-summary-value">${trip.origin}</div>
        </div>
        <div class="trip-summary-item">
          <div class="trip-summary-label">Destino</div>
          <div class="trip-summary-value">${t.destination}</div>
        </div>
        <div class="trip-summary-item">
          <div class="trip-summary-label">Líquido / Volumen</div>
          <div class="trip-summary-value">${trip.liquid} · ${trip.vol.toLocaleString()} L</div>
        </div>
        <div class="trip-summary-item">
          <div class="trip-summary-label">Salida</div>
          <div class="trip-summary-value">${trip.dateOut}</div>
        </div>
      </div>
      <div class="trip-fields">
        <div class="trip-field">
          <label for="tripReceivedBy">Quién recibió</label>
          <input type="text" id="tripReceivedBy" placeholder="Nombre completo"
                 value="${trip.receivedBy}"
                 oninput="updateTripField('receivedBy', this.value)">
        </div>
        <div class="trip-field">
          <label for="tripDeliveredBy">Quién entregó</label>
          <input type="text" id="tripDeliveredBy" placeholder="Nombre completo"
                 value="${trip.deliveredBy}"
                 oninput="updateTripField('deliveredBy', this.value)">
        </div>
        <div class="trip-field">
          <label for="tripFilledBy">Quién llenó</label>
          <input type="text" id="tripFilledBy" placeholder="Nombre completo"
                 value="${trip.filledBy}"
                 oninput="updateTripField('filledBy', this.value)">
        </div>
      </div>
      <div class="trip-complete">
        <div class="trip-complete-left">
          <label class="trip-check">
            <input type="checkbox" id="tripCompleted">
            Recorrido completado
          </label>
          <div class="trip-status-select">
            <span>Estado al llegar:</span>
            <select id="tripNextStatus">
              <option value="available">Disponible</option>
              <option value="maintenance">Mantenimiento</option>
            </select>
          </div>
        </div>
        <div class="trip-complete-btns">
          <button class="btn btn-success" onclick="completeTrip()">
            <i class="ti ti-check"></i> Confirmar llegada
          </button>
          <button class="btn btn-danger" onclick="cancelTrip()">
            <i class="ti ti-x"></i> Cancelar viaje
          </button>
        </div>
      </div>
      <p class="trip-notice" style="margin-top:10px;margin-bottom:0">
        Un camión en ruta no puede iniciar otro viaje ni pasar a disponible hasta confirmar la llegada o cancelar.
      </p>
    </div>`;
}

/* ──────────────── TRUCK TABLE ──────────────── */

function renderTruckTable() {
  document.getElementById('truckTableBody').innerHTML = trucks.map((t, i) => `
    <tr>
      <td><strong>${t.id}</strong></td>
      <td>${t.name}</td>
      <td><span class="status-pill ${STATUS_PILL[t.status]}">${STATUS_LABEL[t.status]}</span></td>
      <td>
        <div style="display:flex;align-items:center;gap:8px">
          <div style="flex:1;max-width:80px">
            <div class="capacity-bar" style="margin:0">
              <div class="capacity-fill ${getCapacityFillClass(t)}" style="width:${pct(t)}%"></div>
            </div>
          </div>
          <span style="font-size:12px;color:var(--text-muted);white-space:nowrap">${t.load.toLocaleString()} L</span>
        </div>
      </td>
      <td>${t.capacity.toLocaleString()} L</td>
      <td>${tagsHtml(t.liquids)}</td>
      <td style="max-width:160px;font-size:12px">${t.location}</td>
      <td>${t.driver}</td>
      <td>
        <div style="display:flex;gap:6px">
          <button class="btn" onclick="openModal(${i})" style="padding:5px 8px" title="Editar">
            <i class="ti ti-edit" aria-hidden="true"></i>
          </button>
          <button class="btn btn-danger" onclick="deleteTruck(${i})" style="padding:5px 8px" title="Eliminar">
            <i class="ti ti-trash" aria-hidden="true"></i>
          </button>
        </div>
      </td>
    </tr>`).join('');
}

function deleteTruck(i) {
  if (hasActiveTrip(trucks[i])) {
    alert('No puedes eliminar un camión con un viaje en curso. Finaliza o cancela el viaje primero.');
    return;
  }
  if (!confirm(`¿Eliminar el camión ${trucks[i].id}?`)) return;
  trucks.splice(i, 1);
  if (selectedTruck >= trucks.length) selectedTruck = trucks.length - 1;
  renderAll();
}

/* ──────────────── LOG TABLE ──────────────── */

function renderLogFilters() {
  const wrap = document.getElementById('logFilters');
  if (!wrap) return;
  wrap.innerHTML = ['Todos', 'En curso', 'Completados', 'Cancelados'].map(f =>
    `<button class="filter-btn${logFilter === f ? ' active' : ''}" onclick="setLogFilter('${f}')">${f}</button>`
  ).join('');
}

function setLogFilter(f) {
  logFilter = f;
  renderLogFilters();
  renderLog();
}

function renderLog() {
  const statusMap = { 'En curso': 'transit', 'Completados': 'done', 'Cancelados': 'cancelled' };
  const filtered = logFilter === 'Todos'
    ? log
    : log.filter(r => r.status === statusMap[logFilter]);

  document.getElementById('logBody').innerHTML = filtered.length
    ? filtered.map(r => `
    <tr class="${r.status === 'transit' ? 'log-row-active' : ''}">
      <td><strong>${r.truck}</strong></td>
      <td>${r.origin}</td>
      <td>${r.dest}</td>
      <td><span class="tag ${TAG_CLASS[r.liquid] || ''}">${r.liquid}</span></td>
      <td>${r.vol.toLocaleString()}</td>
      <td>${r.receivedBy || '—'}</td>
      <td>${r.deliveredBy || '—'}</td>
      <td>${r.filledBy || '—'}</td>
      <td>${r.dateOut}</td>
      <td>${r.dateIn || '—'}</td>
      <td><span class="status-pill ${logStatusPill(r.status)}">${logStatusLabel(r.status)}</span></td>
    </tr>`).join('')
    : `<tr><td colspan="11" style="text-align:center;color:var(--text-muted);padding:1.5rem">No hay viajes en esta categoría</td></tr>`;
}

/* ──────────────── MODAL EDITAR ──────────────── */

function getCheckedLiquids() {
  return Array.from(document.querySelectorAll('#liquidCheckboxes .liquid-check.checked'))
    .map(l => l.textContent.trim());
}

function buildLoadLiquidSelect(allowedLiquids, current) {
  const sel = document.getElementById('editLoadLiquid');
  if (!sel) return;

  if (!allowedLiquids.length) {
    sel.innerHTML = '<option value="">— Sin líquidos permitidos —</option>';
    sel.disabled = true;
    return;
  }

  sel.disabled = false;
  sel.innerHTML = allowedLiquids.map(l =>
    `<option value="${l}">${l}</option>`
  ).join('');

  const pick = current && allowedLiquids.includes(current) ? current : allowedLiquids[0];
  sel.value = pick;
}

function updateLoadLiquidVisibility() {
  const group = document.getElementById('editLoadLiquidGroup');
  const sel = document.getElementById('editLoadLiquid');
  if (!group || !sel) return;

  const hasLiquids = getCheckedLiquids().length > 0;
  const load = parseInt(document.getElementById('editLoad').value) || 0;
  group.style.opacity = hasLiquids ? '1' : '0.55';
  sel.disabled = !hasLiquids;
  group.querySelector('.form-hint').textContent = load > 0
    ? 'Requerido mientras haya carga en el tanque.'
    : 'Selecciona el líquido cargado. Obligatorio si la carga es mayor a 0.';
}

function refreshLoadLiquidSelect(preferred) {
  const allowed = getCheckedLiquids();
  const sel = document.getElementById('editLoadLiquid');
  const current = preferred || sel?.value;
  buildLoadLiquidSelect(allowed, current);
  updateLoadLiquidVisibility();
}

function buildLiquidCheckboxes(selected, currentLiquid) {
  const wrap = document.getElementById('liquidCheckboxes');
  wrap.innerHTML = ALL_LIQUIDS.map(l => {
    const checked = selected.includes(l);
    return `<label class="liquid-check${checked ? ' checked' : ''}" onclick="toggleLiquid(this, '${l}')">
      <input type="checkbox" ${checked ? 'checked' : ''}>${l}
    </label>`;
  }).join('');
  refreshLoadLiquidSelect(currentLiquid || selected[0]);
}

function toggleLiquid(label, liquid) {
  label.classList.toggle('checked');
  const cb = label.querySelector('input[type="checkbox"]');
  cb.checked = !cb.checked;
  refreshLoadLiquidSelect();
}

function configureStatusSelect(truck) {
  const sel = document.getElementById('editStatus');
  const notice = document.getElementById('editTransitNotice');
  const inTransit = truck && truck.status === 'transit';

  if (notice) notice.style.display = inTransit ? 'block' : 'none';

  Array.from(sel.options).forEach(opt => {
    opt.disabled = inTransit && opt.value !== 'transit';
  });
  if (inTransit) sel.value = 'transit';
}

function openModal(idx) {
  isAdding    = false;
  editingIdx  = idx;
  const t     = trucks[idx];

  document.getElementById('modalTitle').textContent = `Editar — ${t.id}`;
  document.getElementById('editId').value          = t.id;
  document.getElementById('editName').value        = t.name;
  document.getElementById('editCap').value         = t.capacity;
  document.getElementById('editLoad').value        = t.load;
  document.getElementById('editStatus').value      = t.status;
  document.getElementById('editDriver').value      = t.driver;
  document.getElementById('editYear').value        = t.year;
  document.getElementById('editService').value     = t.lastService;
  document.getElementById('editLocation').value    = t.location;
  document.getElementById('editDestination').value = t.destination;
  document.getElementById('editDistance').value    = t.distance;

  buildLiquidCheckboxes(t.liquids, t.loadLiquid || t.activeTrip?.liquid || getTruckLiquid(t));
  configureStatusSelect(t);
  document.getElementById('modalOverlay').classList.add('open');
}

function openAddModal() {
  isAdding   = true;
  editingIdx = null;

  document.getElementById('modalTitle').textContent = 'Agregar camión';
  ['editId','editName','editCap','editLoad','editDriver','editYear',
   'editService','editLocation','editDestination','editDistance'].forEach(id => {
    document.getElementById(id).value = '';
  });
  document.getElementById('editStatus').value = 'available';
  buildLiquidCheckboxes([], null);
  configureStatusSelect(null);
  document.getElementById('modalOverlay').classList.add('open');
}

function closeModal() {
  document.getElementById('modalOverlay').classList.remove('open');
}

function handleOverlayClick(e) {
  if (e.target === document.getElementById('modalOverlay')) closeModal();
}

function saveEdit() {
  const checked = Array.from(document.querySelectorAll('#liquidCheckboxes .liquid-check.checked'))
    .map(l => l.textContent.trim());

  const prevStatus = isAdding ? null : trucks[editingIdx].status;

  const data = {
    id:          document.getElementById('editId').value.trim()          || (isAdding ? `TL-00${trucks.length+1}` : trucks[editingIdx].id),
    name:        document.getElementById('editName').value.trim()        || 'Sin nombre',
    capacity:    parseInt(document.getElementById('editCap').value)      || 20000,
    load:        parseInt(document.getElementById('editLoad').value)     || 0,
    status:      document.getElementById('editStatus').value,
    driver:      document.getElementById('editDriver').value.trim()      || '—',
    year:        parseInt(document.getElementById('editYear').value)     || new Date().getFullYear(),
    lastService: document.getElementById('editService').value            || '—',
    location:    document.getElementById('editLocation').value.trim()    || '—',
    destination: document.getElementById('editDestination').value.trim() || '—',
    distance:    parseInt(document.getElementById('editDistance').value) || 0,
    liquids:     checked.length ? checked : ['Agua'],
    plate:       isAdding ? '' : (trucks[editingIdx].plate || '')
  };

  if (data.status === 'transit' && data.destination === '—') {
    alert('Indica un destino para poner el camión en ruta.');
    return;
  }

  if (!isAdding && prevStatus === 'transit' && data.status !== 'transit') {
    alert('Este camión tiene un viaje en curso. Confirma la llegada o cancela el viaje desde el panel de detalle.');
    return;
  }

  if (data.status === 'transit' && prevStatus !== 'transit' && !canStartTrip(data.id)) {
    return;
  }

  const selectedLoadLiquid = document.getElementById('editLoadLiquid').value;

  if (data.load > 0) {
    if (!selectedLoadLiquid || !data.liquids.includes(selectedLoadLiquid)) {
      alert('Selecciona un líquido transportando de los permitidos para este camión.');
      return;
    }
    data.loadLiquid = selectedLoadLiquid;
  } else {
    delete data.loadLiquid;
  }

  if (isAdding) {
    if (data.status === 'transit' && !startTrip(null, data)) return;
    trucks.push(data);
  } else {
    const existing = trucks[editingIdx];
    if (data.status === 'transit' && prevStatus !== 'transit') {
      if (!startTrip(existing, data)) return;
    } else if (data.status === 'transit' && existing.activeTrip) {
      data.activeTrip = existing.activeTrip;
      if (data.loadLiquid) {
        data.activeTrip.liquid = data.loadLiquid;
        data.activeTrip.vol = data.load;
        const entry = getActiveLogEntry(data.id);
        if (entry) {
          entry.liquid = data.loadLiquid;
          entry.vol = data.load;
        }
      }
    }
    Object.assign(trucks[editingIdx], data);
  }

  closeModal();
  renderAll();
}

/* ──────────────── LOG MODAL ──────────────── */

function addLogEntry() {
  const sel = document.getElementById('logTruck');
  const eligible = trucks.filter(t => !hasActiveTrip(t));
  if (!eligible.length) {
    alert('No hay camiones disponibles para registrar un viaje. Todos tienen un viaje en curso o están en ruta.');
    return;
  }
  sel.innerHTML = eligible.map(t =>
    `<option value="${t.id}">${t.id} — ${t.name} (${STATUS_LABEL[t.status]})</option>`
  ).join('');
  document.getElementById('logDateOut').value = new Date().toISOString().split('T')[0];
  document.getElementById('logStatus').value = 'done';
  document.getElementById('logModalOverlay').classList.add('open');
}

function closeLogModal() {
  document.getElementById('logModalOverlay').classList.remove('open');
}

function handleLogOverlayClick(e) {
  if (e.target === document.getElementById('logModalOverlay')) closeLogModal();
}

function saveLog() {
  const truckId = document.getElementById('logTruck').value;
  const status  = document.getElementById('logStatus').value;

  if (status === 'transit' && !canStartTrip(truckId)) {
    alert('Este camión ya tiene un viaje en curso. No puede iniciar otro hasta finalizarlo o cancelarlo.');
    return;
  }

  if (status === 'transit') {
    const truck = trucks.find(t => t.id === truckId);
    if (truck && truck.status === 'maintenance') {
      alert('Un camión en mantenimiento no puede iniciar un viaje. Cambia su estado primero.');
      return;
    }
  }

  log.unshift({
    truck:   document.getElementById('logTruck').value,
    origin:  document.getElementById('logOrigin').value.trim() || '—',
    dest:    document.getElementById('logDest').value.trim()   || '—',
    liquid:  document.getElementById('logLiquid').value,
    vol:     parseInt(document.getElementById('logVol').value) || 0,
    dateOut: document.getElementById('logDateOut').value,
    dateIn:  document.getElementById('logDateIn').value,
    status:  document.getElementById('logStatus').value,
    receivedBy: document.getElementById('logReceivedBy').value.trim() || '',
    deliveredBy: document.getElementById('logDeliveredBy').value.trim() || '',
    filledBy: document.getElementById('logFilledBy').value.trim() || ''
  });
  closeLogModal();
  renderLog();
}

/* ──────────────── REPORT CHARTS ──────────────── */

function renderReportCharts() {
  renderMetrics('reportMetrics');

  const labels = trucks.map(t => t.id);
  const caps   = trucks.map(t => t.capacity);
  const loads  = trucks.map(t => t.load);
  const colors = trucks.map(t => getTruckFillColor(t));

  if (capChart) capChart.destroy();
  capChart = new Chart(document.getElementById('capChart'), {
    type: 'bar',
    data: {
      labels,
      datasets: [
        { label: 'Capacidad máx.', data: caps, backgroundColor: 'rgba(24,95,165,0.15)', borderColor: '#185FA5', borderWidth: 1.5, borderRadius: 4 },
        { label: 'Carga actual',   data: loads, backgroundColor: colors.map(c => c + 'CC'), borderWidth: 0, borderRadius: 4 }
      ]
    },
    options: {
      responsive: true, maintainAspectRatio: false,
      plugins: { legend: { display: false }, tooltip: { callbacks: { label: ctx => ` ${ctx.dataset.label}: ${ctx.raw.toLocaleString()} L` } } },
      scales: { y: { ticks: { callback: v => (v/1000).toFixed(0) + 'k L' }, grid: { color: 'rgba(0,0,0,0.05)' } }, x: { grid: { display: false } } }
    }
  });

  // Liquid distribution
  const liquidCounts = {};
  log.forEach(r => { liquidCounts[r.liquid] = (liquidCounts[r.liquid] || 0) + 1; });
  const lqLabels = Object.keys(liquidCounts);
  const lqData   = Object.values(liquidCounts);
  const lqColors = lqLabels.map(l => LIQUID_COLOR[l] || '#888780');

  if (liquidChart) liquidChart.destroy();
  liquidChart = new Chart(document.getElementById('liquidChart'), {
    type: 'doughnut',
    data: {
      labels: lqLabels,
      datasets: [{ data: lqData, backgroundColor: lqColors.slice(0, lqLabels.length), borderWidth: 2, borderColor: '#fff' }]
    },
    options: {
      responsive: true, maintainAspectRatio: false,
      plugins: {
        legend: { position: 'bottom', labels: { font: { size: 12 }, padding: 12, usePointStyle: true } },
        tooltip: { callbacks: { label: ctx => ` ${ctx.label}: ${ctx.raw} viajes` } }
      }
    }
  });

  // Utilization trend
  const months = ['Ene','Feb','Mar','Abr','May','Jun'];
  const utilData = [62, 71, 58, 80, 75, 83];

  if (utilizationChart) utilizationChart.destroy();
  utilizationChart = new Chart(document.getElementById('utilizationChart'), {
    type: 'line',
    data: {
      labels: months,
      datasets: [{
        label: 'Utilización %',
        data: utilData,
        borderColor: '#185FA5',
        backgroundColor: 'rgba(24,95,165,0.08)',
        borderWidth: 2,
        pointBackgroundColor: '#185FA5',
        pointRadius: 4,
        tension: 0.35,
        fill: true
      }]
    },
    options: {
      responsive: true, maintainAspectRatio: false,
      plugins: { legend: { display: false }, tooltip: { callbacks: { label: ctx => ` ${ctx.raw}% utilización` } } },
      scales: {
        y: { min: 0, max: 100, ticks: { callback: v => v + '%' }, grid: { color: 'rgba(0,0,0,0.05)' } },
        x: { grid: { display: false } }
      }
    }
  });
}

/* ──────────────── RENDER ALL ──────────────── */

function renderAll() {
  renderMetrics('metricsGrid');
  renderFilters();
  renderTrucks();
  renderTruckTable();
  renderLogFilters();
  renderLog();
}

/* ──────────────── INIT ──────────────── */

updateDate();
setInterval(updateDate, 60000);
renderAll();
