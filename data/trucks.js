// data/trucks.js — Datos de la flota de camiones
// Edita este archivo para personalizar los camiones iniciales

const trucksData = [
  {
    id: 'TL-001',
    name: 'Aguatrans I',
    status: 'available',
    capacity: 25000,
    load: 8000,
    location: 'Guayaquil — Base Central',
    destination: '—',
    distance: 0,
    liquids: ['Agua', 'Gasolina'],
    driver: 'Carlos Mejía',
    year: 2019,
    lastService: '2025-03-12',
    plate: 'GUA-1234',
    loadLiquid: 'Agua'
  },
  {
    id: 'TL-002',
    name: 'Oleotrans II',
    status: 'transit',
    capacity: 20000,
    load: 18500,
    location: 'En ruta — Km 87 vía Quito',
    destination: 'Quito — Planta Norte',
    distance: 87,
    liquids: ['Aceite', 'Agua'],
    driver: 'Luis Andrade',
    year: 2020,
    lastService: '2025-01-28',
    plate: 'GUA-5678',
    activeTrip: {
      origin: 'Guayaquil — Base Central',
      liquid: 'Aceite',
      vol: 18500,
      dateOut: '2025-06-07',
      receivedBy: '',
      deliveredBy: '',
      filledBy: ''
    }
  },
  {
    id: 'TL-003',
    name: 'QuimiTrans',
    status: 'available',
    capacity: 15000,
    load: 0,
    location: 'Guayaquil — Base Central',
    destination: '—',
    distance: 0,
    liquids: ['Ácido', 'Agua'],
    driver: 'María Torres',
    year: 2018,
    lastService: '2025-04-05',
    plate: 'GUA-9012'
  },
  {
    id: 'TL-004',
    name: 'DiéselMax',
    status: 'maintenance',
    capacity: 30000,
    load: 0,
    location: 'Taller Mecánico — Durán',
    destination: '—',
    distance: 0,
    liquids: ['Diésel', 'Gasolina'],
    driver: 'Pedro Vega',
    year: 2017,
    lastService: '2025-05-20',
    plate: 'GUA-3456'
  },
  {
    id: 'TL-005',
    name: 'Oleotrans III',
    status: 'transit',
    capacity: 22000,
    load: 21000,
    location: 'En ruta — Km 145 vía Cuenca',
    destination: 'Cuenca — Refinería Sur',
    distance: 145,
    liquids: ['Aceite', 'Diésel'],
    driver: 'Ana Suárez',
    year: 2021,
    lastService: '2025-02-18',
    plate: 'GUA-7890',
    activeTrip: {
      origin: 'Guayaquil — Base Central',
      liquid: 'Diésel',
      vol: 21000,
      dateOut: '2025-06-07',
      receivedBy: '',
      deliveredBy: '',
      filledBy: ''
    }
  }
];
