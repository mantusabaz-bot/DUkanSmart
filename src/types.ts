export interface User {
  id: string;
  name: string;
  phone: string;
  shopName: string;
  shopAddress?: string;
  gstin?: string;
}

export type ProductUnit = 'kg' | 'g' | 'pcs' | 'litre' | 'ml' | 'pack';

export interface Product {
  id: string;
  name: string;
  sku: string;
  category: string;
  costPrice: number;
  sellingPrice: number;
  stock: number;
  minStock: number;
  unit?: ProductUnit;
}

export interface Customer {
  id: string;
  name: string;
  phone: string;
  address: string;
  balance: number; // Positive means they owe money (Udhaar)
  createdAt: string;
}

export interface SaleItem {
  productId: string;
  name: string;
  quantity: number;
  price: number;
  subtotal: number;
  unit?: ProductUnit;
  unitDisplay?: string;
}

export type PaymentMethodType = 
  | 'Cash' 
  | 'UPI QR' 
  | 'Google Pay' 
  | 'PhonePe' 
  | 'Paytm' 
  | 'Other UPI' 
  | 'Card' 
  | 'Credit';

export type PaymentStatusType = 'Paid' | 'Pending' | 'Partial';

export interface Sale {
  id: string;
  orderNumber: string; // e.g. DS-1001
  customerId?: string;
  items: SaleItem[];
  subtotal: number;
  discount: number;
  total: number;
  amountPaid: number;
  paymentMethod: PaymentMethodType;
  paymentStatus: PaymentStatusType;
  transactionRef?: string;
  upiId?: string;
  date: string;
}

export interface Payment {
  id: string;
  customerId: string;
  amount: number;
  date: string;
  method: 'Cash' | 'UPI' | 'Bank Transfer';
  type: 'PAYMENT_RECEIVED' | 'CREDIT_GIVEN';
  saleId?: string;
}

export interface PaymentSettings {
  businessName: string;
  upiId: string;
  qrCodeType: 'dynamic' | 'custom_upload';
  customQrImageUrl?: string;
  instructions: string;
  methodsEnabled: {
    upiQr: boolean;
    gpay: boolean;
    phonepe: boolean;
    paytm: boolean;
    otherUpi: boolean;
    cash: boolean;
    card: boolean;
  };
  invoicePrefix: string;
  nextInvoiceNumber: number;
}
