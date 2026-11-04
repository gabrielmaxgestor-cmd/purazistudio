import test from 'node:test';
import assert from 'node:assert/strict';
import {
  calculateTotal,
  calculateDuration,
  generateBookingCode,
  generateNext90Days,
  isTimeSlotAvailable,
  isValidPhone,
  canRescheduleOrCancel,
  INITIAL_SERVICES,
  Appointment,
  BlockedSlot,
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

test('canRescheduleOrCancel enforces minimum notice window', () => {
  const refNow = new Date('2026-11-02T10:00:00');
  
  // 5 hours ahead -> allowed
  const future = canRescheduleOrCancel('2026-11-02', '15:00', refNow, 2);
  assert.equal(future.allowed, true);

  // 1 hour ahead -> disallowed (< 2h)
  const tight = canRescheduleOrCancel('2026-11-02', '10:45', refNow, 2);
  assert.equal(tight.allowed, false);
  assert.match(tight.reason || '', /mínimo 2h/);

  // In the past
  const past = canRescheduleOrCancel('2026-11-01', '10:00', refNow, 2);
  assert.equal(past.allowed, false);
});
