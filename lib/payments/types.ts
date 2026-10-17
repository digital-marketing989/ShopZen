export interface CreatePaymentOrderParams {
  amount: number; // in INR rupees
  currency?: string;
  orderNumber: string;
  customer: {
    name: string;
    email: string;
    phone?: string;
  };
  notes?: Record<string, string>;
}

export interface PaymentOrderResult {
  success: boolean;
  orderId: string;
  amount: number; // in subunits (paise)
  currency: string;
  keyId?: string;
  clientSecret?: string;
  metadata?: Record<string, any>;
}

export interface VerifyPaymentParams {
  orderId: string;
  paymentId: string;
  signature: string;
}

export interface RefundParams {
  paymentId: string;
  amount: number; // in INR
  reason?: string;
}

export interface RefundResult {
  success: boolean;
  refundId: string;
  amount: number;
  status: string;
}

export interface PaymentProvider {
  name: string;
  createOrder(params: CreatePaymentOrderParams): Promise<PaymentOrderResult>;
  verifyPayment(params: VerifyPaymentParams): Promise<boolean>;
  verifyWebhookSignature(rawBody: string, signature: string): boolean;
  processRefund?(params: RefundParams): Promise<RefundResult>;
}
