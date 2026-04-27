import React, { useState } from 'react';
import { useAppContext } from '../../context/AppContext';
import { useToast } from '../../context/ToastContext';
import { initiatePayUPayment, redirectToPayU } from '../../apiService';
import Button from '../ui/Button';
import Input from '../ui/Input';
import Modal from '../ui/Modal';
import PaymentSummaryBlock from '../PaymentSummaryBlock';
import { computeBookingMath } from '../../utils/bookingMath';
import { CreditCard, Loader2, AlertCircle, CheckCircle } from 'lucide-react';

const PayUPayment = ({ booking, onPaymentInitiated, isOpen, onClose }) => {
  const { authToken } = useAppContext();
  const { showSuccess, showError, showWarning } = useToast();

  // Single source of truth for all money math on this modal.
  const math = computeBookingMath(booking);

  const [paymentAmount, setPaymentAmount] = useState(math.pending);
  const [isProcessing, setIsProcessing] = useState(false);
  const [errors, setErrors] = useState({});

  const minPayment = 1; // any positive amount allowed (advance rule applies only at booking time)
  const maxPayment = math.pending;

  const validatePayment = () => {
    const v = math.validate(paymentAmount);
    const newErrors = v.ok ? {} : { amount: v.reason };
    setErrors(newErrors);
    return v.ok;
  };

  const handlePaymentInitiation = async () => {
    if (!validatePayment()) {
      showError('Please fix the payment amount');
      return;
    }

    setIsProcessing(true);

    try {

      // Call backend to initiate payment
      const paymentData = {
        booking_id: booking.booking_id || booking.id,
        student_id: booking.student_id || booking.student?.student_id,
        amount: paymentAmount,
        room_id: booking.room_id || booking.room?.room_id,
        cot_id: booking.cot_id
      };

      const response = await initiatePayUPayment(paymentData, authToken);

      if (response.success && response.payment_data) {
        showSuccess('Redirecting to payment gateway...');

        // Ensure URLs include transaction ID
        if (response.payment_data.txnid) {
          const txnid = response.payment_data.txnid;
          // Ensure URLs have the txnid parameter
          if (response.payment_data.surl && !response.payment_data.surl.includes('txnid=')) {
            response.payment_data.surl += (response.payment_data.surl.includes('?') ? '&' : '?') + `txnid=${txnid}`;
          }
          if (response.payment_data.furl && !response.payment_data.furl.includes('txnid=')) {
            response.payment_data.furl += (response.payment_data.furl.includes('?') ? '&' : '?') + `txnid=${txnid}`;
          }
        }

        // Notify parent component
        if (onPaymentInitiated) {
          onPaymentInitiated(response);
        }

        // Small delay to show success message
        setTimeout(() => {
          // Redirect to PayU gateway
          redirectToPayU(response.payment_data);
        }, 1500);

      } else {
        throw new Error(response.message || 'Failed to initiate payment');
      }

    } catch (error) {
      console.error('❌ Payment initiation failed:', error);
      showError(error.message || 'Failed to initiate payment. Please try again.');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleAmountChange = (e) => {
    const value = parseFloat(e.target.value) || 0;
    setPaymentAmount(value);

    // Clear errors when user starts typing
    if (errors.amount) {
      setErrors({ ...errors, amount: '' });
    }
  };

  const setQuickAmount = (amount) => {
    setPaymentAmount(amount);
    setErrors({ ...errors, amount: '' });
  };

  if (!booking) {
    return null;
  }

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Make Payment - PayU Gateway"
      size="md"
    >
      <div className="space-y-6">
        {/* Booking Summary - shared block */}
        <div>
          <div className="text-sm text-gray-600 mb-2">
            Booking ID: <span className="font-mono">{booking.booking_id || booking.id}</span>
          </div>
          <PaymentSummaryBlock booking={booking} amountNow={paymentAmount} />
        </div>

        {/* Payment Amount Input */}
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Payment Amount
            </label>
            <Input
              type="number"
              min={minPayment}
              max={maxPayment}
              value={paymentAmount}
              onChange={handleAmountChange}
              placeholder="Enter amount"
              className={errors.amount ? 'border-red-500' : ''}
            />
            {errors.amount && (
              <p className="mt-1 text-sm text-red-600 flex items-center">
                <AlertCircle className="w-4 h-4 mr-1" />
                {errors.amount}
              </p>
            )}
          </div>

          {/* Quick Amount Buttons */}
          <div className="space-y-2">
            <label className="block text-sm font-medium text-gray-700">
              Quick Select:
            </label>
            <div className="flex flex-wrap gap-2">
              {math.pending >= 5000 && (
                <Button
                  variant="secondary"
                  onClick={() => setQuickAmount(5000)}
                  className="text-xs px-3 py-1"
                >
                  ₹5,000
                </Button>
              )}
              {math.pending >= 10000 && (
                <Button
                  variant="secondary"
                  onClick={() => setQuickAmount(10000)}
                  className="text-xs px-3 py-1"
                >
                  ₹10,000
                </Button>
              )}
              {math.pending >= 15000 && (
                <Button
                  variant="secondary"
                  onClick={() => setQuickAmount(15000)}
                  className="text-xs px-3 py-1"
                >
                  ₹15,000
                </Button>
              )}
              <Button
                variant="secondary"
                onClick={() => setQuickAmount(math.pending)}
                className="text-xs px-3 py-1 bg-green-100 text-green-700 hover:bg-green-200"
              >
                Full Amount (₹{math.pending.toLocaleString()})
              </Button>
            </div>
          </div>
        </div>

        {/* Payment Gateway Info */}
        <div className="bg-blue-50 p-4 rounded-lg">
          <div className="flex items-start">
            <CheckCircle className="w-5 h-5 text-blue-600 mt-0.5 mr-2" />
            <div className="text-sm">
              <p className="font-medium text-blue-900">Secure Payment with PayU</p>
              <ul className="mt-1 text-blue-700 space-y-1">
                <li>• Pay using Credit/Debit Cards, Net Banking, UPI</li>
                <li>• SSL encrypted secure transaction</li>
                <li>• Instant payment confirmation</li>
                <li>• 24/7 customer support</li>
              </ul>
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex gap-3 pt-4 border-t">
          <Button
            variant="secondary"
            onClick={onClose}
            disabled={isProcessing}
            className="flex-1"
          >
            Cancel
          </Button>
          <Button
            variant="primary"
            onClick={handlePaymentInitiation}
            disabled={isProcessing || !paymentAmount || paymentAmount <= 0}
            className="flex-1"
            leftIcon={isProcessing ? <Loader2 className="w-4 h-4 animate-spin" /> : <CreditCard className="w-4 h-4" />}
          >
            {isProcessing ? 'Processing...' : `Pay ₹${paymentAmount.toLocaleString()}`}
          </Button>
        </div>
      </div>
    </Modal>
  );
};

export default PayUPayment;
