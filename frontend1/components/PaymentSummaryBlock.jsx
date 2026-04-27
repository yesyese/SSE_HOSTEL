import React from 'react';
import { computeBookingMath, formatINR } from '../utils/bookingMath';

// Shared payment summary block. Used on:
//   - admin Booking wizard (Step 4: with `amountNow` from input)
//   - student PayU modal (with `amountNow` from input)
//   - read-only booking cards / payment status (no `amountNow`)
//
// Pass `booking` (any shape compatible with computeBookingMath) and optionally
// `amountNow` (the live value from the entry input). Concession and Paying-now
// rows are hidden when not relevant.

const Row = ({ label, value, bold, negative, divider }) => (
  <div
    className={`flex justify-between text-sm ${
      divider ? 'border-t border-current/20 mt-1 pt-1' : ''
    }`}
  >
    <span>{label}:</span>
    <span className={bold ? 'font-bold' : undefined}>
      {negative ? `−${formatINR(Math.abs(value))}` : typeof value === 'number' ? formatINR(value) : value}
    </span>
  </div>
);

export default function PaymentSummaryBlock({ booking, amountNow, className = '' }) {
  const m = computeBookingMath(booking);
  const showAmountNow = amountNow !== undefined && amountNow !== null && amountNow !== '';
  const balanceAfter = showAmountNow ? Math.max(0, m.pending - Number(amountNow)) : m.pending;

  return (
    <div className={`p-4 rounded-xl bg-primary-purple/10 text-primary-purple ${className}`}>
      <h4 className="font-bold mb-2">Payment Summary</h4>
      <Row label="Total Room Price" value={m.totalPrice} />
      {m.concession > 0 && <Row label="Concession" value={m.concession} negative />}
      <Row label="Payable Amount" value={m.payable} bold divider={m.concession > 0} />
      {m.totalPaid > 0 && <Row label="Already Paid" value={m.totalPaid} />}
      {showAmountNow && <Row label="Paying Now" value={Number(amountNow)} bold />}
      <Row label={showAmountNow ? 'Balance After' : 'Pending Balance'} value={balanceAfter} bold />
      {showAmountNow && (
        <Row label="Payment Type" value={m.derivePaymentType(amountNow)} />
      )}
      {m.isOverpaid && (
        <div className="text-xs text-red-600 mt-2">
          Note: total paid exceeds payable amount. Please contact support.
        </div>
      )}
    </div>
  );
}
