/**
 * Business logic for PURAZI Studio barbershop booking, pricing, and scheduling
 */

export interface Service {
  id: string;
  name: string;
  durationMinutes: number;
  price: number;
  category: 'cabelo' | 'barba' | 'combo' | 'visagismo' | 'outro';
  description?: string;
}

export interface Appointment {
  id: string;
  code: string;
  clientName: string;
  clientPhone: string;
  serviceId: string;
  serviceName: string;
  price: number;
  durationMinutes: number;
  dateStr: string; // YYYY-MM-DD
  timeStr: string; // HH:MM
  status: 'confirmed' | 'completed' | 'cancelled';
  createdAt: string;
}

export interface BlockedSlot {
  id: string;
  dateStr: string; // YYYY-MM-DD
  timeStr?: string; // HH:MM inicial, ou undefined para o dia inteiro
  endTimeStr?: string; // HH:MM final (exclusivo). Se existir, bloqueia a faixa timeStr–endTimeStr
  reason: string;
}

export interface BarberSettings {
  fixedOffDays: number[]; // 0 = Domingo, 1 = Segunda, 2 = Terça, 3 = Quarta, 4 = Quinta, 5 = Sexta, 6 = Sábado
  workStart: string; // HH:MM e.g. '09:00'
  workEnd: string; // HH:MM e.g. '20:00'
  intervalMinutes: number; // e.g. 45
  /**
   * Horário próprio de um dia da semana (0–6). Ex.: sábado reduzido { 6: { start: '09:00', end: '14:00' } }.
   * Dias sem entrada usam workStart/workEnd. Dias em fixedOffDays continuam sendo folga total.
   */
  daySchedules?: Record<number, { start: string; end: string }>;
}

export const DEFAULT_BARBER_SETTINGS: BarberSettings = {
  fixedOffDays: [0], // Domingo como folga fixa inicial
  workStart: '09:00',
  workEnd: '20:00',
  intervalMinutes: 45,
  daySchedules: {},
};

/** Data de hoje no fuso LOCAL em YYYY-MM-DD (toISOString usa UTC e vira "amanhã" depois das 21h no Brasil). */
export function todayStr(d: Date = new Date()): string {
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  return `${yyyy}-${mm}-${dd}`;
}

function weekdayOf(dateStr: string): number {
  const [yyyy, mm, dd] = dateStr.split('-').map(Number);
  return new Date(yyyy, mm - 1, dd).getDay();
}

/** Expediente de uma data específica: { start, end } ou null quando é folga. */
export function getDaySchedule(
  dateStr: string,
  settings: BarberSettings = DEFAULT_BARBER_SETTINGS
): { start: string; end: string } | null {
  const wd = weekdayOf(dateStr);
  if (settings.fixedOffDays?.includes(wd)) return null;
  const custom = settings.daySchedules?.[wd];
  if (custom && custom.start && custom.end) return { start: custom.start, end: custom.end };
  return { start: settings.workStart, end: settings.workEnd };
}

export interface DayOption {
  dateStr: string; // YYYY-MM-DD
  dayNumber: number;
  dayName: string; // Seg, Ter, Qua...
  monthName: string; // Out, Nov, Dez...
  fullLabel: string;
  isOffDay?: boolean;
}

export const INITIAL_SERVICES: Service[] = [
  {
    id: 'corte',
    name: 'Corte Tradicional / Fade',
    durationMinutes: 45,
    price: 55,
    category: 'cabelo',
    description: 'Corte com visagismo básico, tesoura ou máquina com acabamento navalhado e alinhamento impecável.',
  },
  {
    id: 'barba',
    name: 'Barba Terapia & Alinhamento',
    durationMinutes: 35,
    price: 45,
    category: 'barba',
    description: 'Toalha quente com óleos essenciais, massagem facial e desenho sob medida com navalha afiada.',
  },
  {
    id: 'combo',
    name: 'Combo PURΛZI (Corte + Barba)',
    durationMinutes: 75,
    price: 90,
    category: 'combo',
    description: 'Nossa experiência completa: corte personalizado, barba terapia relaxante e finalização premium.',
  },
  {
    id: 'sobrancelha',
    name: 'Design de Sobrancelha',
    durationMinutes: 15,
    price: 20,
    category: 'outro',
    description: 'Limpeza e alinhamento na navalha ou pinça mantendo a naturalidade do olhar masculino.',
  },
  {
    id: 'visagismo',
    name: 'Consultoria de Visagismo',
    durationMinutes: 30,
    price: 40,
    category: 'visagismo',
    description: 'Análise de formato de rosto, linhas e proporções para definir o corte ideal para sua imagem pessoal.',
  },
];

export const AVAILABLE_HOURS = [
  '09:00', '09:45', '10:30', '11:15', '13:00',
  '13:45', '14:30', '15:15', '16:00', '16:45',
  '17:30', '18:15', '19:00', '19:45'
];

/**
 * Generates slot hours between workStart and workEnd based on intervalMinutes
 */
export function generateHoursForSchedule(
  settings: BarberSettings = DEFAULT_BARBER_SETTINGS,
  dateStr?: string
): string[] {
  let start = settings.workStart;
  let end = settings.workEnd;
  if (dateStr) {
    const day = getDaySchedule(dateStr, settings);
    if (!day) return [];
    start = day.start;
    end = day.end;
  }
  const [startH, startM] = start.split(':').map(Number);
  const [endH, endM] = end.split(':').map(Number);
  
  const startTotal = startH * 60 + startM;
  const endTotal = endH * 60 + endM;
  const interval = settings.intervalMinutes || 45;

  const hours: string[] = [];
  for (let m = startTotal; m < endTotal; m += interval) {
    const hh = String(Math.floor(m / 60)).padStart(2, '0');
    const mm = String(m % 60).padStart(2, '0');
    hours.push(`${hh}:${mm}`);
  }
  return hours.length > 0 || dateStr ? hours : AVAILABLE_HOURS;
}

/**
 * Calculates total price of an array of services
 */
export function calculateTotal(services: Service[]): number {
  return services.reduce((acc, curr) => acc + curr.price, 0);
}

/**
 * Calculates total duration in minutes
 */
export function calculateDuration(services: Service[]): number {
  return services.reduce((acc, curr) => acc + curr.durationMinutes, 0);
}

/**
 * Generates an uppercase 6-character code like PRZ-7241
 */
export function generateBookingCode(): string {
  const digits = Math.floor(1000 + Math.random() * 9000);
  return `PRZ-${digits}`;
}

/**
 * Generates the next 90 days from a reference date
 */
export function generateNext90Days(startDate: Date = new Date(), settings: BarberSettings = DEFAULT_BARBER_SETTINGS): DayOption[] {
  const days: DayOption[] = [];
  const dayNames = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];
  const monthNames = [
    'Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun',
    'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'
  ];

  for (let i = 0; i < 90; i++) {
    const d = new Date(startDate);
    d.setDate(d.getDate() + i);
    
    const dayOfWeek = d.getDay();
    const yyyy = d.getFullYear();
    const mm = String(d.getMonth() + 1).padStart(2, '0');
    const dd = String(d.getDate()).padStart(2, '0');
    const dateStr = `${yyyy}-${mm}-${dd}`;
    const isOffDay = !getDaySchedule(dateStr, settings);
    
    days.push({
      dateStr,
      dayNumber: d.getDate(),
      dayName: dayNames[dayOfWeek],
      monthName: monthNames[d.getMonth()],
      fullLabel: `${dayNames[dayOfWeek]}, ${d.getDate()} de ${monthNames[d.getMonth()]}`,
      isOffDay,
    });
  }

  return days;
}

/**
 * Checks if a specific date and time slot is available
 */
export function isTimeSlotAvailable(
  dateStr: string,
  timeStr: string,
  appointments: Appointment[],
  blockedSlots: BlockedSlot[],
  settings?: BarberSettings
): boolean {
  const activeSettings = settings || DEFAULT_BARBER_SETTINGS;

  // Expediente do dia (folga fixa ou horário reduzido, ex.: sábado)
  const day = getDaySchedule(dateStr, activeSettings);
  if (!day) return false;
  if (timeStr < day.start || timeStr >= day.end) return false;

  // Horário que já passou (hoje)
  if (dateStr === todayStr()) {
    const now = new Date();
    const nowStr = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
    if (timeStr <= nowStr) return false;
  }

  // Dia inteiro bloqueado
  const isDayBlocked = blockedSlots.some(
    b => b.dateStr === dateStr && (!b.timeStr || b.timeStr === '')
  );
  if (isDayBlocked) return false;

  // Horário avulso ou faixa de horários bloqueada
  const isSlotBlocked = blockedSlots.some(b => {
    if (b.dateStr !== dateStr || !b.timeStr) return false;
    if (b.endTimeStr) return timeStr >= b.timeStr && timeStr < b.endTimeStr;
    return b.timeStr === timeStr;
  });
  if (isSlotBlocked) return false;

  // Check if already booked with active appointment
  const isBooked = appointments.some(
    a => a.dateStr === dateStr && a.timeStr === timeStr && a.status === 'confirmed'
  );
  if (isBooked) return false;

  return true;
}

const toMin = (t: string) => {
  const [h, m] = t.split(':').map(Number);
  return h * 60 + m;
};

/**
 * Verifica se um horário comporta o serviço inteiro: cabe antes do fechamento e não se sobrepõe
 * a outros agendamentos (considerando a duração de cada um) nem a bloqueios.
 */
export function isSlotFreeForDuration(
  dateStr: string,
  timeStr: string,
  durationMinutes: number,
  appointments: Appointment[],
  blockedSlots: BlockedSlot[],
  settings?: BarberSettings
): boolean {
  const active = settings || DEFAULT_BARBER_SETTINGS;
  if (!isTimeSlotAvailable(dateStr, timeStr, appointments, blockedSlots, active)) return false;
  const day = getDaySchedule(dateStr, active);
  if (!day) return false;
  const start = toMin(timeStr);
  const end = start + durationMinutes;
  if (end > toMin(day.end)) return false;
  for (const a of appointments) {
    if (a.dateStr !== dateStr || a.status !== 'confirmed') continue;
    const as = toMin(a.timeStr);
    if (start < as + a.durationMinutes && end > as) return false;
  }
  for (const b of blockedSlots) {
    if (b.dateStr !== dateStr || !b.timeStr) continue;
    const bs = toMin(b.timeStr);
    const be = b.endTimeStr ? toMin(b.endTimeStr) : bs + (active.intervalMinutes || 45);
    if (start < be && end > bs) return false;
  }
  return true;
}

/**
 * Validates Brazilian phone numbers (e.g. 24999999999)
 */
export function isValidPhone(phone: string): boolean {
  const cleaned = phone.replace(/\D/g, '');
  return cleaned.length >= 10 && cleaned.length <= 11;
}

/**
 * Formats a WhatsApp booking confirmation message
 */
export function formatWhatsAppBookingMessage(appointment: Appointment): string {
  const [yyyy, mm, dd] = appointment.dateStr.split('-');
  const dateFormatted = `${dd}/${mm}/${yyyy}`;
  
  return encodeURIComponent(
    `💈 *Agendamento Confirmado - PURΛZI Studio*\n\n` +
    `Olá ${appointment.clientName}!\n` +
    `Seu agendamento foi registrado com sucesso:\n\n` +
    `• *Código:* ${appointment.code}\n` +
    `• *Serviço:* ${appointment.serviceName}\n` +
    `• *Data:* ${dateFormatted}\n` +
    `• *Horário:* ${appointment.timeStr}\n` +
    `• *Valor:* R$ ${appointment.price.toFixed(2).replace('.', ',')}\n` +
    `• *Local:* Av. Nilo Peçanha, 1027 - Valença/RJ\n\n` +
    `Para consultar, remarcar ou cancelar seu horário, use o código *${appointment.code}* no nosso site.`
  );
}

/**
 * Checks if an appointment can be cancelled/rescheduled based on minimum notice hours (default 12 hours)
 */
export function canRescheduleOrCancel(
  appointmentDateStr: string,
  appointmentTimeStr: string,
  currentDate: Date = new Date(),
  minHoursNotice: number = 12
): { allowed: boolean; reason?: string } {
  const [yyyy, mm, dd] = appointmentDateStr.split('-').map(Number);
  const [hh, min] = appointmentTimeStr.split(':').map(Number);
  
  const apptDate = new Date(yyyy, mm - 1, dd, hh, min);
  const diffMs = apptDate.getTime() - currentDate.getTime();
  const diffHours = diffMs / (1000 * 60 * 60);

  if (diffHours < 0) {
    return { allowed: false, reason: 'Este agendamento já ocorreu ou expirou.' };
  }

  if (diffHours < minHoursNotice) {
    return { 
      allowed: false, 
      reason: `Remarcações ou cancelamentos devem ser feitos com no mínimo ${minHoursNotice}h de antecedência. Entre em contato diretamente pelo WhatsApp.`
    };
  }

  return { allowed: true };
}
