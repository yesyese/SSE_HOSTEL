// Single source of truth for all booking-money math. Every screen that
// displays or validates monetary fields must compute through this helper
// so admin view, student view, PayU modal, and reports always agree.
//
// Contract:
//   total_price       = Room.price_per_year (raw)
//   concession        = Student.concession_amount (default 0)
//   payable           = max(0, total_price - concession)
//   total_paid        = booking.total_amount_paid (sum of successful payments)
//   pending           = max(0, payable - total_paid)
//   min_advance       = ceil(payable * 0.5)            -- 50% rule
//   payment_type(amt) = 'Full Payment' if total_paid + amt >= payable
//                       'Advance'      if total_paid == 0
//                       'Installment'  otherwise

export const ADVANCE_PERCENT = 0.5;

const num = (v) => {
  const n = Number(v);
  return Number.isFinite(n) ? n : 0;
};

export function computeBookingMath(booking) {
  const totalPrice = num(
    booking?.total_price ??
    booking?.room?.price_per_year ??
    booking?.price_per_year ??
    booking?.booked_room_price
  );
  const concession = num(booking?.concession_amount);
  const payable    = Math.max(0, totalPrice - concession);
  const totalPaid  = num(booking?.total_amount_paid);
  const pending    = Math.max(0, payable - totalPaid);
  const minAdvance = Math.ceil(payable * ADVANCE_PERCENT);
  const isOverpaid = totalPaid > payable;

  function derivePaymentType(amountNow) {
    const a = num(amountNow);
    const after = totalPaid + a;
    if (after >= payable) return 'Full Payment';
    if (totalPaid === 0)  return 'Advance';
    return 'Installment';
  }

  function validate(amountNow) {
    const a = num(amountNow);
    if (a <= 0) {
      return { ok: false, reason: 'Amount must be greater than 0' };
    }
    if (a > pending) {
      return {
        ok: false,
        reason: `Amount exceeds pending balance (₹${pending.toLocaleString()})`,
        snapTo: pending,
      };
    }
    // 50% rule applies only on the FIRST payment for this booking
    if (totalPaid === 0 && a < minAdvance) {
      return {
        ok: false,
        reason: `Advance must be at least ₹${minAdvance.toLocaleString()} (50% of payable)`,
        snapTo: minAdvance,
      };
    }
    return { ok: true };
  }

  return {
    totalPrice,
    concession,
    payable,
    totalPaid,
    pending,
    minAdvance,
    isOverpaid,
    derivePaymentType,
    validate,
  };
}

export const formatINR = (n) => `₹${num(n).toLocaleString('en-IN')}`;
