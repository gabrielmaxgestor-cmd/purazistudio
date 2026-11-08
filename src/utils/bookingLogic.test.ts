import test from 'node:test';
import assert from 'node:assert/strict';
import {
  calculateTotal,
  calculateDuration,
  generateBookingCode,
  generateNext90Days,
  generateHoursForSchedule,
  isTimeSlotAvailable,
  isSlotFreeForDuration,
  isValidPhone,
  canRescheduleOrCancel,
  INITIAL_SERVICES,
  Appointment,
  BlockedSlot,
  BarberSettings,
} from './bookingLogic';

test('calculateTotal calculates sum of service prices', () => {
  const selected = [INITIAL_SERVICES[0], INITIAL_SERVICES[1]]; // 55 + 45
  assert.equal(calculateTotal(selected), 100);
  assert.equal(calculateTotal([]), 0);
});

test('calculateDuration sums service durations', () => {
  const selected = [INITIAL_SERVICES[0], INITIAL_SERVICES[1]]; // 45 + 35
  assert.equal(calculateDuration(selected), 80);
});

test('generateBookingCode creates valid PRZ-XXXX format', () => {
  const code = generateBookingCode();
  assert.match(code, /^PRZ-\d{4}$/);
});

test('generateNext90Days returns exactly 90 days', () => {
  const days = generateNext90Days(new Date('2026-10-30T10:00:00Z'));
  assert.equal(days.length, 90);
  assert.equal(days[0].dateStr, '2026-10-30');
});

test('isTimeSlotAvailable detects booked slots and blocked slots', () => {
  const dateStr = '2026-11-02';
  const appointments: Appointment[] = [
    {
      id: '1',
      code: 'PRZ-1001',
      clientName: 'Marcos Silva',
      clientPhone: '24988887777',
      serviceId: 'corte',
      serviceName: 'Corte Tradicional',
      price: 55,
      durationMinutes: 45,
      dateStr: '2026-11-02',
      timeStr: '10:30',
      status: 'confirmed',
      createdAt: new Date().toISOString(),
    },
  ];

  const blocked: BlockedSlot[] = [
    {
      id: 'b1',
      dateStr: '2026-11-02',
      timeStr: '14:30',
      reason: 'Pausa Almoço Estendido',
    },
    {
      id: 'b2',
      dateStr: '2026-11-08',
      reason: 'Folga do Barbeiro',
    },
  ];

  // Available slot
  assert.equal(isTimeSlotAvailable(dateStr, '09:00', appointments, blocked), true);
  // Booked slot
  assert.equal(isTimeSlotAvailable(dateStr, '10:30', appointments, blocked), false);
  // Blocked slot by hour
  assert.equal(isTimeSlotAvailable(dateStr, '14:30', appointments, blocked), false);
  // Blocked whole day
  assert.equal(isTimeSlotAvailable('2026-11-08', '09:00', appointments, blocked), false);
});

test('isValidPhone validates phone numbers correctly', () => {
  assert.equal(isValidPhone('24999999999'), true);
  assert.equal(isValidPhone('(24) 98888-7777'), true);
  assert.equal(isValidPhone('123'), false);
  assert.equal(isValidPhone(''), false);
});

test('canRescheduleOrCancel enforces minimum notice window (12 hours default)', () => {
  const refNow = new Date('2026-11-02T10:00:00');
  
  // 15 hours ahead -> allowed (> 12h)
  const future = canRescheduleOrCancel('2026-11-03', '01:00', refNow, 12);
  assert.equal(future.allowed, true);

  // 6 hours ahead -> disallowed (< 12h)
  const tight = canRescheduleOrCancel('2026-11-02', '16:00', refNow, 12);
  assert.equal(tight.allowed, false);
  assert.match(tight.reason || '', /mínimo 12h/);

  // In the past
  const past = canRescheduleOrCancel('2026-11-01', '10:00', refNow, 12);
  assert.equal(past.allowed, false);
});

test('BarberSettings fixed off-days and working hours are respected in availability', () => {
  const customSettings: BarberSettings = {
    workStart: '10:00',
    workEnd: '18:00',
    intervalMinutes: 45,
    fixedOffDays: [0, 6], // Sunday & Saturday
  };

  // 2026-11-01 is a Sunday (day 0) -> should be unavailable
  const isSundayAvailable = isTimeSlotAvailable('2026-11-01', '10:00', [], [], customSettings);
  assert.equal(isSundayAvailable, false);

  // 2026-11-07 is a Saturday (day 6) -> should be unavailable
  const isSaturdayAvailable = isTimeSlotAvailable('2026-11-07', '11:00', [], [], customSettings);
  assert.equal(isSaturdayAvailable, false);

  // 2026-11-02 is a Monday (day 1) -> available between 10:00 and 18:00
  const isMonday10Available = isTimeSlotAvailable('2026-11-02', '10:00', [], [], customSettings);
  assert.equal(isMonday10Available, true);

  // Slot outside working hours: 09:00 (< 10:00) -> should be unavailable
  const isEarlySlotAvailable = isTimeSlotAvailable('2026-11-02', '09:00', [], [], customSettings);
  assert.equal(isEarlySlotAvailable, false);

  // Slot outside working hours: 19:00 (> 18:00) -> should be unavailable
  const isLateSlotAvailable = isTimeSlotAvailable('2026-11-02', '19:00', [], [], customSettings);
  assert.equal(isLateSlotAvailable, false);
});

test('daySchedules: sábado com horário reduzido libera só o expediente reduzido', () => {
  const settings: BarberSettings = {
    workStart: '09:00',
    workEnd: '20:00',
    intervalMinutes: 45,
    fixedOffDays: [0],
    daySchedules: { 6: { start: '09:00', end: '14:00' } },
  };
  // 2026-11-14 é sábado
  assert.equal(isTimeSlotAvailable('2026-11-14', '10:30', [], [], settings), true);
  assert.equal(isTimeSlotAvailable('2026-11-14', '14:00', [], [], settings), false);
  assert.equal(isTimeSlotAvailable('2026-11-14', '16:45', [], [], settings), false);
  // 2026-11-13 é sexta: expediente padrão até 20:00
  assert.equal(isTimeSlotAvailable('2026-11-13', '16:45', [], [], settings), true);
});

test('bloqueio parcial por faixa bloqueia só os horários da faixa', () => {
  const blocked: BlockedSlot[] = [
    { id: 'b1', dateStr: '2026-11-16', timeStr: '12:00', endTimeStr: '14:00', reason: 'Almoço' },
  ];
  assert.equal(isTimeSlotAvailable('2026-11-16', '11:15', [], blocked), true);
  assert.equal(isTimeSlotAvailable('2026-11-16', '12:00', [], blocked), false);
  assert.equal(isTimeSlotAvailable('2026-11-16', '13:45', [], blocked), false);
  assert.equal(isTimeSlotAvailable('2026-11-16', '14:00', [], blocked), true);
});

test('generateHoursForSchedule respeita o dia da semana', () => {
  const settings: BarberSettings = {
    workStart: '09:00',
    workEnd: '20:00',
    intervalMinutes: 60,
    fixedOffDays: [0],
    daySchedules: { 6: { start: '09:00', end: '12:00' } },
  };
  assert.deepEqual(generateHoursForSchedule(settings, '2026-11-14'), ['09:00', '10:00', '11:00']);
  assert.deepEqual(generateHoursForSchedule(settings, '2026-11-15'), []); // domingo = folga
});

test('isSlotFreeForDuration impede sobreposição e serviço que passa do fechamento', () => {
  const settings: BarberSettings = { workStart: '09:00', workEnd: '12:00', intervalMinutes: 45, fixedOffDays: [0], daySchedules: {} };
  const apts: Appointment[] = [
    { id: 'a', code: 'PRZ-1', clientName: 'X', clientPhone: '24999999999', serviceId: 'combo', serviceName: 'Combo', price: 90, durationMinutes: 75, dateStr: '2026-11-16', timeStr: '10:30', status: 'confirmed', createdAt: '' },
  ];
  // 10:30 + 75min ocupa até 11:45 -> 11:15 está ocupado, mesmo sem agendamento nesse horário
  assert.equal(isSlotFreeForDuration('2026-11-16', '11:15', 45, apts, [], settings), false);
  // 09:45 + 45min = 10:30 -> termina exatamente quando o outro começa
  assert.equal(isSlotFreeForDuration('2026-11-16', '09:45', 45, apts, [], settings), true);
  // 11:15 + 75min passaria das 12:00
  assert.equal(isSlotFreeForDuration('2026-11-17', '11:15', 75, [], [], settings), false);
});
