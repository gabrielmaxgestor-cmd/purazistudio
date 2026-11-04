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
  timeStr?: string; // HH:MM or undefined for whole day
  reason: string;
}

export interface DayOption {
  dateStr: string; // YYYY-MM-DD
  dayNumber: number;
  dayName: string; // Seg, Ter, Qua...
  monthName: string; // Out, Nov, Dez...
  fullLabel: string;
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
export function generateNext90Days(startDate: Date = new Date()): DayOption[] {
  const days: DayOption[] = [];
  const dayNames = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];
  const monthNames = [
    'Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun',
    'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'
  ];

  for (let i = 0; i < 90; i++) {
    const d = new Date(startDate);
    d.setDate(d.getDate() + i);
    
    // Ignore Sundays if the barber is closed on Sundays, or keep all days
    // In Valença barbershops usually work Mon-Sat, but we let them select any day or mark day blocked
    const yyyy = d.getFullYear();
    const mm = String(d.getMonth() + 1).padStart(2, '0');
    const dd = String(d.getDate()).padStart(2, '0');
    const dateStr = `${yyyy}-${mm}-${dd}`;
    
    days.push({
      dateStr,
      dayNumber: d.getDate(),
      dayName: dayNames[d.getDay()],
      monthName: monthNames[d.getMonth()],
      fullLabel: `${dayNames[d.getDay()]}, ${d.getDate()} de ${monthNames[d.getMonth()]}`
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
  blockedSlots: BlockedSlot[]
): boolean {
  // Check if whole day is blocked
  const isDayBlocked = blockedSlots.some(
    b => b.dateStr === dateStr && (!b.timeStr || b.timeStr === '')
  );
  if (isDayBlocked) return false;

  // Check if specific hour is blocked by barber
  const isSlotBlocked = blockedSlots.some(
    b => b.dateStr === dateStr && b.timeStr === timeStr
  );
  if (isSlotBlocked) return false;

  // Check if already booked with active appointment
  const isBooked = appointments.some(
    a => a.dateStr === dateStr && a.timeStr === timeStr && a.status === 'confirmed'
  );
  if (isBooked) return false;

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
 * Checks if an appointment can be cancelled/rescheduled based on minimum notice hours (default 2 hours)
 */
export function canRescheduleOrCancel(
  appointmentDateStr: string,
  appointmentTimeStr: string,
  currentDate: Date = new Date(),
  minHoursNotice: number = 2
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
