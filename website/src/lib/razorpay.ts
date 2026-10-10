export type RazorpaySuccess = {
  razorpay_payment_id: string;
  razorpay_order_id: string;
  razorpay_signature: string;
};

type RazorpayFailure = {
  error?: { description?: string };
};

type RazorpayCheckout = {
  open: () => void;
  on: (event: 'payment.failed', handler: (response: RazorpayFailure) => void) => void;
};

declare global {
  interface Window {
    Razorpay?: new (options: Record<string, unknown>) => RazorpayCheckout;
  }
}

function loadCheckoutScript(): Promise<void> {
  if (window.Razorpay) return Promise.resolve();
  return new Promise((resolve, reject) => {
    const script = document.createElement('script');
    script.src = 'https://checkout.razorpay.com/v1/checkout.js';
    script.async = true;
    script.onload = () => resolve();
    script.onerror = () => reject(new Error('Could not load Razorpay checkout'));
    document.body.appendChild(script);
  });
}

export async function openRazorpay(input: {
  keyId: string;
  orderId: string;
  amount: number;
  currency: string;
  description: string;
  contact: string;
}): Promise<RazorpaySuccess> {
  await loadCheckoutScript();
  const Razorpay = window.Razorpay;
  if (!Razorpay) throw new Error('Could not load Razorpay checkout');

  return new Promise((resolve, reject) => {
    const checkout = new Razorpay({
      key: input.keyId,
      amount: input.amount,
      currency: input.currency,
      name: 'THULI Billings',
      description: input.description,
      order_id: input.orderId,
      prefill: { contact: input.contact },
      theme: { color: '#6b2d9b' },
      handler: (response: RazorpaySuccess) => resolve(response),
      modal: {
        ondismiss: () => reject(new Error('Payment cancelled')),
      },
    });
    checkout.on('payment.failed', (response) => {
      reject(new Error(response.error?.description || 'Payment failed'));
    });
    checkout.open();
  });
}
