import { Appointment, BlockedSlot, Service, INITIAL_SERVICES } from './bookingLogic';

const STORAGE_KEYS = {
  APPOINTMENTS: 'purazi_appointments',
  SERVICES: 'purazi_services',
  BLOCKED: 'purazi_blocked_slots',
};

// Realistic initial seed data for PURAZI Studio in Valença/RJ
const INITIAL_APPOINTMENTS: Appointment[] = [
  {
    id: 'apt-1',
    code: 'PRZ-4921',
    clientName: 'Gabriel Oliveira',
    clientPhone: '24998765432',
    serviceId: 'combo',
    serviceName: 'Combo PURΛZI (Corte + Barba)',
    price: 90,
    durationMinutes: 75,
    dateStr: new Date().toISOString().split('T')[0],
    timeStr: '10:30',
    status: 'confirmed',
    createdAt: new Date(Date.now() - 86400000).toISOString(),
  },
  {
    id: 'apt-2',
    code: 'PRZ-8120',
    clientName: 'Lucas Ferreira',
    clientPhone: '24981123344',
    serviceId: 'corte',
    serviceName: 'Corte Tradicional / Fade',
    price: 55,
    durationMinutes: 45,
    dateStr: new Date().toISOString().split('T')[0],
    timeStr: '14:30',
    status: 'confirmed',
    createdAt: new Date(Date.now() - 43200000).toISOString(),
  },
  {
    id: 'apt-3',
    code: 'PRZ-3394',
    clientName: 'Mateus Souza',
    clientPhone: '24987651234',
    serviceId: 'barba',
    serviceName: 'Barba Terapia & Alinhamento',
    price: 45,
    durationMinutes: 35,
    dateStr: new Date(Date.now() + 86400000).toISOString().split('T')[0],
    timeStr: '16:00',
    status: 'confirmed',
    createdAt: new Date().toISOString(),
  },
];

const INITIAL_BLOCKED: BlockedSlot[] = [
  {
    id: 'blk-1',
    dateStr: new Date().toISOString().split('T')[0],
    timeStr: '13:00',
    reason: 'Intervalo de almoço',
  },
];

export function getStoredAppointments(): Appointment[] {
  try {
    const data = localStorage.getItem(STORAGE_KEYS.APPOINTMENTS);
    if (!data) {
      localStorage.setItem(STORAGE_KEYS.APPOINTMENTS, JSON.stringify(INITIAL_APPOINTMENTS));
      return INITIAL_APPOINTMENTS;
    }
    return JSON.parse(data);
  } catch {
    return INITIAL_APPOINTMENTS;
  }
}

export function saveAppointment(appointment: Appointment): Appointment[] {
  const current = getStoredAppointments();
  const updated = [appointment, ...current.filter(a => a.id !== appointment.id)];
  localStorage.setItem(STORAGE_KEYS.APPOINTMENTS, JSON.stringify(updated));
  return updated;
}

export function updateAppointmentStatus(id: string, status: 'confirmed' | 'completed' | 'cancelled'): Appointment[] {
  const current = getStoredAppointments();
  const updated = current.map(a => a.id === id ? { ...a, status } : a);
  localStorage.setItem(STORAGE_KEYS.APPOINTMENTS, JSON.stringify(updated));
  return updated;
}

export function getStoredServices(): Service[] {
  try {
    const data = localStorage.getItem(STORAGE_KEYS.SERVICES);
    if (!data) {
      localStorage.setItem(STORAGE_KEYS.SERVICES, JSON.stringify(INITIAL_SERVICES));
      return INITIAL_SERVICES;
    }
    return JSON.parse(data);
  } catch {
    return INITIAL_SERVICES;
  }
}

export function saveServices(services: Service[]): void {
  localStorage.setItem(STORAGE_KEYS.SERVICES, JSON.stringify(services));
}

export function getStoredBlockedSlots(): BlockedSlot[] {
  try {
    const data = localStorage.getItem(STORAGE_KEYS.BLOCKED);
    if (!data) {
      localStorage.setItem(STORAGE_KEYS.BLOCKED, JSON.stringify(INITIAL_BLOCKED));
      return INITIAL_BLOCKED;
    }
    return JSON.parse(data);
  } catch {
    return INITIAL_BLOCKED;
  }
}

export function saveBlockedSlots(slots: BlockedSlot[]): void {
  localStorage.setItem(STORAGE_KEYS.BLOCKED, JSON.stringify(slots));
}
