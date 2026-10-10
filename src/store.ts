import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { User, Product, Customer, Sale, Payment, PaymentSettings, PaymentMethodType, PaymentStatusType } from './types';
import { v4 as uuidv4 } from 'uuid';

export const DEFAULT_PAYMENT_SETTINGS: PaymentSettings = {
  businessName: 'DukaanSmart Retail Store',
  upiId: 'dukaansmart@okaxis',
  qrCodeType: 'dynamic',
  customQrImageUrl: '',
  instructions: 'Scan using any UPI app (Google Pay, PhonePe, Paytm, BHIM). Verify business name before paying.',
  methodsEnabled: {
    upiQr: true,
    gpay: true,
    phonepe: true,
    paytm: true,
    otherUpi: true,
    cash: true,
    card: true,
  },
  invoicePrefix: 'DS',
  nextInvoiceNumber: 1001,
};

interface AppState {
  user: User | null;
  products: Product[];
  customers: Customer[];
  sales: Sale[];
  payments: Payment[];
  paymentSettings: PaymentSettings;

  // Actions
  login: (user: Omit<User, 'id'>) => void;
  logout: () => void;
  
  updatePaymentSettings: (settings: Partial<PaymentSettings>) => void;

  addProduct: (product: Omit<Product, 'id'>) => void;
  updateProduct: (id: string, product: Partial<Product>) => void;
  deleteProduct: (id: string) => void;

  addCustomer: (customer: Omit<Customer, 'id' | 'balance' | 'createdAt'>) => void;
  updateCustomer: (id: string, customer: Partial<Customer>) => void;
  
  recordSale: (sale: Omit<Sale, 'id' | 'date'> & { orderNumber?: string }) => Sale;
  recordPayment: (customerId: string, amount: number, method: string) => void;
  resetSampleData: () => void;
}

// Sample Data for demonstration
const SAMPLE_PRODUCTS: Product[] = [
  { id: 'prod-1', name: 'Shudh Chakki Atta (Loose/Bag)', sku: 'GRO-001', category: 'Grocery', costPrice: 32, sellingPrice: 42, stock: 120, minStock: 20, unit: 'kg' },
  { id: 'prod-2', name: 'Premium Basmati Rice (Loose)', sku: 'GRO-002', category: 'Grocery', costPrice: 65, sellingPrice: 85, stock: 150, minStock: 25, unit: 'kg' },
  { id: 'prod-3', name: 'White Crystal Sugar (Loose)', sku: 'GRO-003', category: 'Grocery', costPrice: 38, sellingPrice: 45, stock: 200, minStock: 30, unit: 'kg' },
  { id: 'prod-4', name: 'Toor Dal Desi (Loose)', sku: 'GRO-004', category: 'Grocery', costPrice: 125, sellingPrice: 145, stock: 90, minStock: 15, unit: 'kg' },
  { id: 'prod-5', name: 'Tata Salt Vacuum Evaporated', sku: 'GRO-005', category: 'Grocery', costPrice: 20, sellingPrice: 25, stock: 80, minStock: 20, unit: 'kg' },
  { id: 'prod-6', name: 'Fortune Sunlite Refined Oil 1L', sku: 'GRO-006', category: 'Grocery', costPrice: 135, sellingPrice: 150, stock: 35, minStock: 10, unit: 'litre' },
  { id: 'prod-7', name: 'Maggi 2-Minute Masala Noodles', sku: 'SNK-001', category: 'Snacks', costPrice: 12, sellingPrice: 14, stock: 150, minStock: 30, unit: 'pcs' },
  { id: 'prod-8', name: 'Amul Butter Pasteurised 500g', sku: 'DAI-001', category: 'Dairy', costPrice: 245, sellingPrice: 275, stock: 25, minStock: 8, unit: 'pack' },
  { id: 'prod-9', name: 'Taj Mahal Premium Tea 250g', sku: 'BEV-001', category: 'Beverages', costPrice: 180, sellingPrice: 210, stock: 40, minStock: 10, unit: 'pack' },
  { id: 'prod-10', name: 'Dettol Soap 75g', sku: 'PER-001', category: 'Personal Care', costPrice: 32, sellingPrice: 38, stock: 90, minStock: 20, unit: 'pcs' },
  { id: 'prod-11', name: 'Kissan Mixed Fruit Jam 500g', sku: 'GRO-007', category: 'Grocery', costPrice: 140, sellingPrice: 165, stock: 4, minStock: 10, unit: 'pack' },
  { id: 'prod-12', name: 'MDH Deggi Mirch Powder 100g', sku: 'SPI-001', category: 'Spices', costPrice: 72, sellingPrice: 85, stock: 6, minStock: 15, unit: 'pack' },
  { id: 'prod-13', name: 'Surf Excel Quick Wash 1kg', sku: 'HOU-001', category: 'Household', costPrice: 130, sellingPrice: 150, stock: 0, minStock: 10, unit: 'pack' },
  { id: 'prod-14', name: 'Basmati Tukda Rice (Loose)', sku: 'GRO-008', category: 'Grocery', costPrice: 42, sellingPrice: 52, stock: 0, minStock: 20, unit: 'kg' },
];

const SAMPLE_CUSTOMERS: Customer[] = [
  { id: 'cust-1', name: 'Rahul Sharma', phone: '9876543210', address: 'Sector 4, Noida', balance: 500, createdAt: new Date().toISOString() },
  { id: 'cust-2', name: 'Priya Singh', phone: '9123456789', address: 'Andheri West, Mumbai', balance: 0, createdAt: new Date().toISOString() },
  { id: 'cust-3', name: 'Amit Verma (Kirana Regular)', phone: '9811223344', address: 'Main Bazar, Shop 12', balance: 1200, createdAt: new Date().toISOString() },
];

export const useStore = create<AppState>()(
  persist(
    (set, get) => ({
      user: null,
      products: SAMPLE_PRODUCTS,
      customers: SAMPLE_CUSTOMERS,
      sales: [],
      payments: [],
      paymentSettings: DEFAULT_PAYMENT_SETTINGS,

      login: (userData) => set((state) => ({ 
        user: { ...userData, id: uuidv4() },
        paymentSettings: {
          ...state.paymentSettings,
          businessName: userData.shopName || state.paymentSettings.businessName
        }
      })),
      logout: () => set({ user: null }),

      updatePaymentSettings: (updated) => set((state) => ({
        paymentSettings: { ...state.paymentSettings, ...updated }
      })),

      addProduct: (product) => set((state) => ({ products: [...state.products, { ...product, id: uuidv4() }] })),
      updateProduct: (id, updated) => set((state) => ({
        products: state.products.map(p => p.id === id ? { ...p, ...updated } : p)
      })),
      deleteProduct: (id) => set((state) => ({ products: state.products.filter(p => p.id !== id) })),

      addCustomer: (customer) => set((state) => ({
        customers: [...state.customers, { ...customer, id: uuidv4(), balance: 0, createdAt: new Date().toISOString() }]
      })),
      updateCustomer: (id, updated) => set((state) => ({
        customers: state.customers.map(c => c.id === id ? { ...c, ...updated } : c)
      })),

      recordSale: (saleData) => {
        const state = get();
        const orderNum = saleData.orderNumber || `${state.paymentSettings.invoicePrefix || 'DS'}-${state.paymentSettings.nextInvoiceNumber || 1001}`;
        const paymentStatus = saleData.paymentStatus || (
          saleData.amountPaid >= saleData.total ? 'Paid' : (saleData.amountPaid > 0 ? 'Partial' : 'Pending')
        );

        const sale: Sale = { 
          ...saleData, 
          id: uuidv4(), 
          orderNumber: orderNum,
          paymentStatus,
          date: new Date().toISOString() 
        };
        
        set((currentState) => {
          // Update stock
          const updatedProducts = currentState.products.map(p => {
            const soldItem = sale.items.find(i => i.productId === p.id);
            if (soldItem) {
              return { ...p, stock: Math.max(0, p.stock - soldItem.quantity) };
            }
            return p;
          });

          // Handle Udhaar (Credit)
          let updatedCustomers = currentState.customers;
          let newPayments = currentState.payments;
          
          if (sale.customerId && sale.amountPaid < sale.total) {
            const creditAmount = sale.total - sale.amountPaid;
            updatedCustomers = currentState.customers.map(c => 
              c.id === sale.customerId ? { ...c, balance: c.balance + creditAmount } : c
            );
            newPayments = [...newPayments, {
              id: uuidv4(),
              customerId: sale.customerId,
              amount: creditAmount,
              date: sale.date,
              method: 'Cash', // default fallback
              type: 'CREDIT_GIVEN',
              saleId: sale.id
            }];
          }

          return {
            sales: [...currentState.sales, sale],
            products: updatedProducts,
            customers: updatedCustomers,
            payments: newPayments,
            paymentSettings: {
              ...currentState.paymentSettings,
              nextInvoiceNumber: (currentState.paymentSettings.nextInvoiceNumber || 1001) + 1
            }
          };
        });

        return sale;
      },

      recordPayment: (customerId, amount, method) => {
        set((state) => ({
          payments: [...state.payments, {
            id: uuidv4(),
            customerId,
            amount,
            date: new Date().toISOString(),
            method: method as any,
            type: 'PAYMENT_RECEIVED'
          }],
          customers: state.customers.map(c => 
            c.id === customerId ? { ...c, balance: Math.max(0, c.balance - amount) } : c
          )
        }));
      },

      resetSampleData: () => {
        set({
          products: SAMPLE_PRODUCTS,
          customers: SAMPLE_CUSTOMERS
        });
      }
    }),
    {
      name: 'dukaansmart-storage',
    }
  )
);
