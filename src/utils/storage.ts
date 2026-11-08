import {
  Appointment,
  BlockedSlot,
  Service,
  INITIAL_SERVICES,
  BarberSettings,
  DEFAULT_BARBER_SETTINGS,
} from './bookingLogic';

const STORAGE_KEYS = {
  APPOINTMENTS: 'purazi_appointments',
  SERVICES: 'purazi_services',
  BLOCKED: 'purazi_blocked_slots',
  SETTINGS: 'purazi_barber_settings',
};

// Sem dados de demonstração: o site começa com a agenda vazia.
const INITIAL_APPOINTMENTS: Appointment[] = [];
const INITIAL_BLOCKED: BlockedSlot[] = [];

// Remove, uma única vez, os agendamentos/bloqueios de exemplo que versões antigas gravavam no navegador
const DEMO_FLAG = 'purazi_demo_cleaned_v1';
function cleanDemoDataOnce() {
  try {
    if (localStorage.getItem(DEMO_FLAG)) return;
    const apts = localStorage.getItem(STORAGE_KEYS.APPOINTMENTS);
    if (apts) {
      const list: Appointment[] = JSON.parse(apts);
      const demoIds = ['apt-1', 'apt-2', 'apt-3'];
      localStorage.setItem(STORAGE_KEYS.APPOINTMENTS, JSON.stringify(list.filter((a) => !demoIds.includes(a.id))));
    }
    const blk = localStorage.getItem(STORAGE_KEYS.BLOCKED);
    if (blk) {
      const list: BlockedSlot[] = JSON.parse(blk);
      localStorage.setItem(STORAGE_KEYS.BLOCKED, JSON.stringify(list.filter((b) => b.id !== 'blk-1')));
    }
    localStorage.setItem(DEMO_FLAG, '1');
  } catch {
    /* ignora */
  }
}

export function getStoredAppointments(): Appointment[] {
  try {
    cleanDemoDataOnce();
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
    cleanDemoDataOnce();
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

export function getStoredBarberSettings(): BarberSettings {
  try {
    const data = localStorage.getItem(STORAGE_KEYS.SETTINGS);
    if (!data) {
      localStorage.setItem(STORAGE_KEYS.SETTINGS, JSON.stringify(DEFAULT_BARBER_SETTINGS));
      return DEFAULT_BARBER_SETTINGS;
    }
    const parsed = JSON.parse(data);
    return { ...DEFAULT_BARBER_SETTINGS, ...parsed, daySchedules: parsed.daySchedules || {} };
  } catch {
    return DEFAULT_BARBER_SETTINGS;
  }
}

export function saveBarberSettings(settings: BarberSettings): void {
  localStorage.setItem(STORAGE_KEYS.SETTINGS, JSON.stringify(settings));
}
