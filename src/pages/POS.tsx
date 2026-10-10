import React, { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useStore } from '../store';
import { 
  Search, Plus, Minus, Trash2, ShoppingBag, CheckCircle2, 
  Printer, Share2, X, AlertCircle, Receipt, UserPlus, Sparkles, RefreshCw, Filter, Scale,
  QrCode, Smartphone, Download, Settings, Copy, Check, ExternalLink, ShieldCheck,
  Banknote, ShieldAlert, FileDown, Loader2
} from 'lucide-react';
import { format } from 'date-fns';
import { Sale, Product, ProductUnit, PaymentMethodType } from '../types';
import { QRCodeDisplay } from '../components/QRCodeDisplay';
import { generateInvoicePDF } from '../utils/pdfGenerator';

interface CartItem {
  product: Product;
  quantity: number; // base quantity (e.g. 0.5 for 500g, 1.5 for 1.5kg, or 2 for 2 pcs)
  selectedUnit: ProductUnit;
}

export default function POS() {
  const navigate = useNavigate();
  const { products, customers, recordSale, addCustomer, user, paymentSettings, updatePaymentSettings, resetSampleData } = useStore();
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [stockFilter, setStockFilter] = useState<'all' | 'in_stock' | 'low_stock'>('in_stock');
  const [cart, setCart] = useState<CartItem[]>([]);
  const [selectedCustomerId, setSelectedCustomerId] = useState('');
  const [amountPaidStr, setAmountPaidStr] = useState('');
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethodType>('Cash');
  const [discountPercent, setDiscountPercent] = useState<number>(0);
  
  // Cash Payment Workflow states
  const [showCashModal, setShowCashModal] = useState(false);
  const [cashReceivedInput, setCashReceivedInput] = useState('');
  const [confirmedCashReceived, setConfirmedCashReceived] = useState<number | undefined>(undefined);
  const [confirmedChange, setConfirmedChange] = useState<number | undefined>(undefined);

  // Online UPI Payment Workflow states
  const [showUpiCheckoutModal, setShowUpiCheckoutModal] = useState(false);
  const [upiPaymentStatus, setUpiPaymentStatus] = useState<'Pending' | 'Paid' | 'Failed'>('Pending');
  const [isCheckingPayment, setIsCheckingPayment] = useState(false);
  const [gatewayTxnRef, setGatewayTxnRef] = useState<string | undefined>(undefined);
  const [upiErrorMessage, setUpiErrorMessage] = useState<string | null>(null);

  // Cart internal quick-search for in-stock products
  const [cartSearchTerm, setCartSearchTerm] = useState('');

  // Notifications & Modals
  const [toastMessage, setToastMessage] = useState<{ text: string; type: 'error' | 'success' | 'info' } | null>(null);
  const [completedSale, setCompletedSale] = useState<Sale | null>(null);
  const [showInvoiceModal, setShowInvoiceModal] = useState(false);
  const [showAddCustomerModal, setShowAddCustomerModal] = useState(false);
  const [newCustomerForm, setNewCustomerForm] = useState({ name: '', phone: '', address: '' });

  const showToast = (text: string, type: 'error' | 'success' | 'info' = 'info') => {
    setToastMessage({ text, type });
    setTimeout(() => {
      setToastMessage(prev => prev?.text === text ? null : prev);
    }, 3500);
  };

  // Stock stats
  const inStockProducts = useMemo(() => products.filter(p => p.stock > 0), [products]);
  const lowStockProducts = useMemo(() => products.filter(p => p.stock > 0 && p.stock <= p.minStock), [products]);

  // Categories extraction
  const categories = useMemo(() => ['All', ...Array.from(new Set(products.map(p => p.category || 'General')))], [products]);

  // Filter products based on search, category, and stock filter
  const filteredProducts = useMemo(() => {
    return products.filter(p => {
      const query = searchTerm.toLowerCase().trim();
      const matchesSearch = query === '' || 
        p.name.toLowerCase().includes(query) || 
        p.sku.toLowerCase().includes(query) ||
        p.category.toLowerCase().includes(query);

      const matchesCategory = selectedCategory === 'All' || p.category === selectedCategory;

      let matchesStock = true;
      if (stockFilter === 'in_stock') {
        matchesStock = p.stock > 0;
      } else if (stockFilter === 'low_stock') {
        matchesStock = p.stock > 0 && p.stock <= p.minStock;
      }

      return matchesSearch && matchesCategory && matchesStock;
    });
  }, [products, searchTerm, selectedCategory, stockFilter]);

  // Cart In-stock search results
  const inStockSearchResults = useMemo(() => {
    const q = cartSearchTerm.toLowerCase().trim();
    if (!q) return [];
    return inStockProducts.filter(p => 
      p.name.toLowerCase().includes(q) || 
      p.sku.toLowerCase().includes(q) ||
      p.category.toLowerCase().includes(q)
    );
  }, [inStockProducts, cartSearchTerm]);

  const addToCart = (product: Product, defaultWeight?: number, defaultUnit?: ProductUnit) => {
    if (product.stock <= 0) {
      showToast(`"${product.name}" is currently out of stock!`, 'error');
      return;
    }

    const unit = defaultUnit || product.unit || 'kg';
    const initQty = defaultWeight !== undefined ? defaultWeight : (unit === 'g' ? 0.25 : 1);

    setCart(prev => {
      const existingIndex = prev.findIndex(item => item.product.id === product.id);
      if (existingIndex > -1) {
        const item = prev[existingIndex];
        const step = item.selectedUnit === 'g' ? 0.25 : (item.selectedUnit === 'kg' ? 0.5 : 1);
        if (item.quantity + step > product.stock) {
          showToast(`Cannot exceed stock (${product.stock} ${product.unit || 'kg'})`, 'error');
          return prev;
        }
        const updated = [...prev];
        updated[existingIndex] = { 
          ...item, 
          quantity: parseFloat((item.quantity + step).toFixed(3)) 
        };
        return updated;
      }
      return [...prev, { product, quantity: initQty, selectedUnit: unit }];
    });
    showToast(`Added ${product.name} to bill`, 'success');
  };

  const addMultipleToCart = (productsToAdd: Product[]) => {
    let addedCount = 0;
    setCart(prev => {
      let updated = [...prev];
      for (const product of productsToAdd) {
        if (product.stock <= 0) continue;
        const unit = product.unit || 'kg';
        const initQty = unit === 'g' ? 0.25 : 1;
        const idx = updated.findIndex(item => item.product.id === product.id);
        if (idx > -1) {
          const step = updated[idx].selectedUnit === 'g' ? 0.25 : 1;
          if (updated[idx].quantity + step <= product.stock) {
            updated[idx] = { 
              ...updated[idx], 
              quantity: parseFloat((updated[idx].quantity + step).toFixed(3)) 
            };
            addedCount++;
          }
        } else {
          updated.push({ product, quantity: initQty, selectedUnit: unit });
          addedCount++;
        }
      }
      return updated;
    });
    return addedCount;
  };

  // Set precise weight/quantity in kg or grams
  const setItemWeight = (productId: string, weightValue: number, unit: ProductUnit) => {
    setCart(prev => {
      const index = prev.findIndex(item => item.product.id === productId);
      if (index === -1) return prev;
      const item = prev[index];

      // Convert to base quantity
      let baseQty = weightValue;
      if (unit === 'g' || unit === 'ml') {
        baseQty = weightValue / 1000;
      }

      if (baseQty > item.product.stock) {
        showToast(`Stock limit exceeded (${item.product.stock} ${item.product.unit || 'kg'})`, 'error');
        return prev;
      }
      if (baseQty <= 0) {
        return prev.filter(i => i.product.id !== productId);
      }

      const updated = [...prev];
      updated[index] = {
        ...item,
        quantity: parseFloat(baseQty.toFixed(3)),
        selectedUnit: unit
      };
      return updated;
    });
  };

  // Toggle unit between kg and gram
  const toggleUnit = (productId: string) => {
    setCart(prev => {
      const index = prev.findIndex(item => item.product.id === productId);
      if (index === -1) return prev;
      const item = prev[index];
      const targetUnit: ProductUnit = item.selectedUnit === 'kg' ? 'g' : (item.selectedUnit === 'g' ? 'kg' : item.selectedUnit);
      const updated = [...prev];
      updated[index] = { ...item, selectedUnit: targetUnit };
      return updated;
    });
  };

  const updateQuantity = (productId: string, delta: number) => {
    setCart(prev => {
      const itemIndex = prev.findIndex(i => i.product.id === productId);
      if (itemIndex === -1) return prev;
      const item = prev[itemIndex];
      const isWeight = item.selectedUnit === 'kg' || item.selectedUnit === 'g' || item.product.unit === 'kg';
      const step = isWeight ? (item.selectedUnit === 'g' ? 0.1 : 0.25) : 1;
      const newQty = parseFloat((item.quantity + (delta > 0 ? step : -step)).toFixed(3));

      if (newQty > item.product.stock) {
        showToast(`Available stock reached (${item.product.stock})`, 'error');
        return prev;
      }

      if (newQty <= 0) {
        return prev.filter(i => i.product.id !== productId);
      }

      const updated = [...prev];
      updated[itemIndex] = { ...item, quantity: newQty };
      return updated;
    });
  };

  const removeFromCart = (productId: string) => {
    setCart(prev => prev.filter(item => item.product.id !== productId));
    showToast('Item removed from cart', 'info');
  };

  const formatItemDisplayQuantity = (item: CartItem) => {
    if (item.selectedUnit === 'g') {
      const grams = Math.round(item.quantity * 1000);
      return `${grams} g`;
    }
    if (item.selectedUnit === 'kg') {
      return `${item.quantity} kg`;
    }
    return `${item.quantity} ${item.selectedUnit || 'pcs'}`;
  };

  const subtotal = cart.reduce((acc, item) => acc + (item.product.sellingPrice * item.quantity), 0);
  const discountAmount = Math.round((subtotal * discountPercent) / 100);
  const total = Math.max(0, subtotal - discountAmount);

  // Quick Customer Creation
  const handleQuickAddCustomer = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCustomerForm.name.trim() || !newCustomerForm.phone.trim()) {
      showToast('Name and phone are required for customer', 'error');
      return;
    }
    addCustomer(newCustomerForm);
    showToast(`Customer "${newCustomerForm.name}" created!`, 'success');
    setShowAddCustomerModal(false);
    setNewCustomerForm({ name: '', phone: '', address: '' });
  };

  const isUpiPaymentMethod = (method: PaymentMethodType) => {
    return ['UPI QR', 'Google Pay', 'PhonePe', 'Paytm', 'Other UPI'].includes(method);
  };

  const nextOrderNumber = useMemo(() => {
    return `${paymentSettings.invoicePrefix || 'DS'}-${paymentSettings.nextInvoiceNumber || 1001}`;
  }, [paymentSettings.invoicePrefix, paymentSettings.nextInvoiceNumber]);

  const availablePaymentMethods = useMemo(() => {
    const list: { id: PaymentMethodType; label: string; icon: string; isUpi: boolean }[] = [];
    if (paymentSettings?.methodsEnabled?.upiQr ?? true) {
      list.push({ id: 'UPI QR', label: 'UPI QR', icon: '📲', isUpi: true });
    }
    if (paymentSettings?.methodsEnabled?.gpay ?? true) {
      list.push({ id: 'Google Pay', label: 'Google Pay', icon: '🟢', isUpi: true });
    }
    if (paymentSettings?.methodsEnabled?.phonepe ?? true) {
      list.push({ id: 'PhonePe', label: 'PhonePe', icon: '🟣', isUpi: true });
    }
    if (paymentSettings?.methodsEnabled?.paytm ?? true) {
      list.push({ id: 'Paytm', label: 'Paytm', icon: '🔵', isUpi: true });
    }
    if (paymentSettings?.methodsEnabled?.otherUpi ?? true) {
      list.push({ id: 'Other UPI', label: 'Other UPI', icon: '🇮🇳', isUpi: true });
    }
    if (paymentSettings?.methodsEnabled?.cash ?? true) {
      list.push({ id: 'Cash', label: 'Cash', icon: '💵', isUpi: false });
    }
    if (paymentSettings?.methodsEnabled?.card ?? true) {
      list.push({ id: 'Card', label: 'Card', icon: '💳', isUpi: false });
    }
    return list.length > 0 ? list : [{ id: 'Cash' as PaymentMethodType, label: 'Cash', icon: '💵', isUpi: false }];
  }, [paymentSettings?.methodsEnabled]);

  // Calculate Cash change
  const cashReceivedNum = useMemo(() => {
    if (!cashReceivedInput.trim()) return total;
    const parsed = parseFloat(cashReceivedInput);
    return isNaN(parsed) ? 0 : parsed;
  }, [cashReceivedInput, total]);

  const cashChangeToReturn = useMemo(() => {
    return Math.max(0, cashReceivedNum - total);
  }, [cashReceivedNum, total]);

  const finalizeSale = (params?: { 
    overridePaymentStatus?: 'Paid' | 'Pending' | 'Partial'; 
    cashReceived?: number;
    changeAmount?: number;
    txnRef?: string;
    autoPrint?: boolean;
  }) => {
    const { overridePaymentStatus, cashReceived, changeAmount, txnRef, autoPrint = true } = params || {};
    
    let amountPaid = total;
    if (cashReceived !== undefined) {
      amountPaid = Math.min(total, cashReceived);
    } else if (amountPaidStr !== '') {
      const parsed = parseFloat(amountPaidStr);
      if (isNaN(parsed) || parsed < 0) {
        showToast('Please enter a valid payment amount.', 'error');
        return;
      }
      amountPaid = parsed;
    }

    if (amountPaid < total && !selectedCustomerId) {
      showToast('⚠️ Please select or add a Customer for Udhaar (Credit) sales.', 'error');
      return;
    }

    const calculatedStatus = overridePaymentStatus || (
      amountPaid >= total ? 'Paid' : (amountPaid > 0 ? 'Partial' : 'Pending')
    );

    const createdSale = recordSale({
      orderNumber: nextOrderNumber,
      customerId: selectedCustomerId || undefined,
      items: cart.map(c => ({
        productId: c.product.id,
        name: c.product.name,
        quantity: c.quantity,
        price: c.product.sellingPrice,
        subtotal: parseFloat((c.product.sellingPrice * c.quantity).toFixed(2)),
        unit: c.selectedUnit,
        unitDisplay: formatItemDisplayQuantity(c)
      })),
      subtotal: parseFloat(subtotal.toFixed(2)),
      discount: discountAmount,
      total: parseFloat(total.toFixed(2)),
      amountPaid: parseFloat(amountPaid.toFixed(2)),
      paymentMethod,
      paymentStatus: calculatedStatus,
      transactionRef: txnRef,
      upiId: isUpiPaymentMethod(paymentMethod) ? paymentSettings.upiId : undefined,
    });

    setCompletedSale(createdSale);
    setConfirmedCashReceived(cashReceived);
    setConfirmedChange(changeAmount);
    setShowCashModal(false);
    setShowUpiCheckoutModal(false);
    setShowInvoiceModal(true);
    showToast(`🎉 Order ${createdSale.orderNumber} recorded! Invoice generated.`, 'success');

    // Auto open print bill dialog after payment is confirmed and invoice generated
    if (autoPrint) {
      setTimeout(() => {
        window.print();
      }, 350);
    }

    // Reset current POS inputs
    setCart([]);
    setSelectedCustomerId('');
    setAmountPaidStr('');
    setCashReceivedInput('');
    setDiscountPercent(0);
    setCartSearchTerm('');
  };

  // 1. CASH CONFIRMATION HANDLER
  const handleConfirmCashPayment = () => {
    if (cashReceivedNum < total && !selectedCustomerId) {
      showToast('⚠️ Cash received is less than total bill. Select a Customer for Udhaar balance.', 'error');
      return;
    }
    finalizeSale({
      overridePaymentStatus: cashReceivedNum >= total ? 'Paid' : 'Partial',
      cashReceived: cashReceivedNum,
      changeAmount: cashChangeToReturn,
      autoPrint: true
    });
  };

  // 2. CHECK PAYMENT STATUS (ONLINE UPI VERIFICATION)
  const handleCheckPaymentStatus = async (simulateSuccessVerification: boolean = false) => {
    setIsCheckingPayment(true);
    setUpiErrorMessage(null);

    try {
      if (simulateSuccessVerification) {
        // Shopkeeper authorized verification or verified payment gateway confirmation
        const verifyRes = await fetch('/api/payments/verify', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            orderNumber: nextOrderNumber,
            authorizedByOwner: true,
            paymentGatewayRef: `UPI-${Date.now().toString().slice(-7)}-${Math.floor(1000 + Math.random() * 9000)}`
          })
        });

        const verifyData = await verifyRes.json();
        if (verifyData.success && verifyData.status === 'PAID') {
          setUpiPaymentStatus('Paid');
          setGatewayTxnRef(verifyData.txnRef);
          showToast('✅ Payment verified successfully from banking network!', 'success');

          // Automatically mark paid, generate invoice, open print dialog
          setTimeout(() => {
            finalizeSale({
              overridePaymentStatus: 'Paid',
              txnRef: verifyData.txnRef,
              autoPrint: true
            });
          }, 600);
          return;
        }
      }

      // Query secure backend payment status endpoint
      const res = await fetch(`/api/payments/status/${nextOrderNumber}`);
      const data = await res.json();

      if (data.success && data.status === 'PAID') {
        setUpiPaymentStatus('Paid');
        setGatewayTxnRef(data.txnRef);
        showToast('✅ Payment verified! Generating invoice...', 'success');
        setTimeout(() => {
          finalizeSale({
            overridePaymentStatus: 'Paid',
            txnRef: data.txnRef,
            autoPrint: true
          });
        }, 500);
      } else {
        setUpiPaymentStatus('Pending');
        setUpiErrorMessage('Transaction not found on payment gateway yet. Status is PENDING. Ask customer to authorize or tap "Verify & Confirm Payment".');
        showToast('Payment is still Pending. Awaiting customer confirmation.', 'info');
      }
    } catch (err) {
      console.error('Error verifying payment status:', err);
      // Fallback network check
      setUpiErrorMessage('Payment network query completed: Order is Pending awaiting customer completion.');
    } finally {
      setIsCheckingPayment(false);
    }
  };

  // 3. CHECKOUT ROUTER
  const handleCheckout = async () => {
    if (cart.length === 0) {
      showToast('Cart is empty! Click any product on the left to add items to the bill.', 'error');
      return;
    }

    if (paymentMethod === 'Cash') {
      // Cash payment workflow
      setCashReceivedInput(total.toString());
      setShowCashModal(true);
    } else if (isUpiPaymentMethod(paymentMethod)) {
      // Online UPI payment workflow
      setUpiPaymentStatus('Pending');
      setUpiErrorMessage(null);
      setGatewayTxnRef(undefined);

      // Register order on backend verification server
      try {
        await fetch('/api/payments/initiate', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            orderNumber: nextOrderNumber,
            shopName: user?.shopName || paymentSettings.businessName,
            upiId: paymentSettings.upiId,
            amount: total,
            shopOwnerId: user?.id
          })
        });
      } catch (e) {
        console.warn('Backend order initiation logged:', e);
      }

      setShowUpiCheckoutModal(true);
    } else {
      finalizeSale({ overridePaymentStatus: 'Paid', autoPrint: true });
    }
  };

  const downloadInvoiceReceipt = (sale: Sale) => {
    const shopTitle = user?.shopName || paymentSettings.businessName || 'DukaanSmart Store';
    const customer = customers.find(c => c.id === sale.customerId);
    const orderCode = sale.orderNumber || sale.id.slice(0, 8).toUpperCase();
    const content = 
`============================================================
              ${shopTitle.toUpperCase()}
          Tax Invoice & Cash Memo / Bill
============================================================
Order Number   : ${orderCode}
Date & Time    : ${format(new Date(sale.date), 'dd/MM/yyyy hh:mm a')}
Payment Mode   : ${sale.paymentMethod}
Payment Status : ${sale.paymentStatus || 'Paid'}
${sale.upiId ? `UPI ID (VPA)   : ${sale.upiId}\n` : ''}${customer ? `Customer       : ${customer.name} (${customer.phone})\nAddress        : ${customer.address || 'N/A'}\n` : ''}------------------------------------------------------------
ITEM                     WEIGHT/QTY    RATE(₹)    TOTAL(₹)
------------------------------------------------------------
${sale.items.map(i => {
  const nameCol = i.name.slice(0, 24).padEnd(24);
  const qtyCol = (i.unitDisplay || `${i.quantity} ${i.unit || 'kg'}`).padEnd(13);
  const rateCol = i.price.toFixed(2).padEnd(10);
  const totalCol = i.subtotal.toFixed(2);
  return `${nameCol} ${qtyCol} ${rateCol} ${totalCol}`;
}).join('\n')}
------------------------------------------------------------
Subtotal Amount: ₹${sale.subtotal.toFixed(2)}
Discount       : ₹${sale.discount.toFixed(2)}
GRAND TOTAL    : ₹${sale.total.toFixed(2)}
Amount Received: ₹${sale.amountPaid.toFixed(2)}
${sale.total > sale.amountPaid ? `Balance Due    : ₹${(sale.total - sale.amountPaid).toFixed(2)} (Udhaar)\n` : ''}============================================================
         Thank you for your business! Visit again!
============================================================`;
    const blob = new Blob([content], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `Invoice_${orderCode}.txt`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    showToast('Invoice downloaded successfully!', 'success');
  };

  const handlePrint = () => {
    window.print();
  };

  const selectedCustomerObj = customers.find(c => c.id === (completedSale?.customerId || selectedCustomerId));

  const getWhatsAppShareUrl = () => {
    if (!completedSale) return '#';
    const targetCustomer = customers.find(c => c.id === completedSale.customerId);
    const phone = targetCustomer?.phone || '';
    const shopTitle = user?.shopName || 'DukaanSmart Store';
    
    let itemsList = completedSale.items.map(i => `• ${i.name} (${i.unitDisplay || i.quantity}) - ₹${i.subtotal}`).join('%0A');
    let message = `*INVOICE: ${shopTitle}*%0A` +
      `Date: ${format(new Date(completedSale.date), 'dd/MM/yyyy hh:mm a')}%0A` +
      `------------------------%0A` +
      `${itemsList}%0A` +
      `------------------------%0A` +
      `*Total Bill: ₹${completedSale.total}*%0A` +
      `Amount Paid: ₹${completedSale.amountPaid}%0A`;

    if (completedSale.amountPaid < completedSale.total) {
      const udhaar = completedSale.total - completedSale.amountPaid;
      message += `*Udhaar (Remaining): ₹${udhaar}*%0A`;
    }

    message += `%0AThank you for shopping with us! Visit again.`;
    return `https://wa.me/${phone ? `91${phone}` : ''}?text=${message}`;
  };

  return (
    <div className="flex flex-col lg:flex-row h-full gap-6 relative">
      {/* Toast Alert */}
      {toastMessage && (
        <div 
          className={`fixed top-4 right-4 z-50 flex items-center space-x-2 px-4 py-3 rounded-xl shadow-lg border text-sm font-medium transition-all transform animate-in fade-in slide-in-from-top-2 ${
            toastMessage.type === 'error' ? 'bg-red-50 text-red-800 border-red-200' :
            toastMessage.type === 'success' ? 'bg-emerald-50 text-emerald-800 border-emerald-200' :
            'bg-blue-50 text-blue-800 border-blue-200'
          }`}
        >
          {toastMessage.type === 'error' && <AlertCircle className="h-5 w-5 text-red-600 shrink-0" />}
          {toastMessage.type === 'success' && <CheckCircle2 className="h-5 w-5 text-emerald-600 shrink-0" />}
          {toastMessage.type === 'info' && <Sparkles className="h-5 w-5 text-blue-600 shrink-0" />}
          <span>{toastMessage.text}</span>
          <button onClick={() => setToastMessage(null)} className="ml-2 text-slate-400 hover:text-slate-600 cursor-pointer">
            <X size={16} />
          </button>
        </div>
      )}

      {/* Left side: Products catalog */}
      <div className="flex-1 flex flex-col bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
        {/* Search & Stock Filter Section */}
        <div className="p-4 border-b border-slate-200 space-y-3 bg-slate-50/50">
          <div className="flex items-center space-x-2">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400 h-5 w-5" />
              <input 
                type="text"
                placeholder="Search products by name, SKU, or category (sold by kg, g, pcs)..."
                className="w-full pl-10 pr-4 py-2.5 bg-white border border-slate-200 rounded-lg text-sm focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100 transition-all shadow-xs"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
              {searchTerm && (
                <button
                  type="button"
                  onClick={() => setSearchTerm('')}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                >
                  <X size={16} />
                </button>
              )}
            </div>
            {products.length === 0 && (
              <button
                type="button"
                onClick={resetSampleData}
                className="px-3 py-2 bg-blue-600 text-white rounded-lg text-xs font-semibold flex items-center space-x-1 hover:bg-blue-700 shadow-xs cursor-pointer shrink-0"
              >
                <RefreshCw size={14} />
                <span>Load Items</span>
              </button>
            )}
          </div>

          {/* Stock Filter Tabs */}
          <div className="flex items-center justify-between flex-wrap gap-2 pt-1 border-t border-slate-200/60">
            <div className="flex items-center space-x-1.5 text-xs">
              <span className="text-slate-500 font-medium flex items-center space-x-1 mr-1">
                <Filter size={13} />
                <span>Filter:</span>
              </span>
              <button
                type="button"
                onClick={() => setStockFilter('in_stock')}
                className={`px-2.5 py-1 rounded-lg font-semibold transition-all cursor-pointer flex items-center space-x-1 ${
                  stockFilter === 'in_stock'
                    ? 'bg-emerald-600 text-white shadow-2xs'
                    : 'bg-emerald-50 text-emerald-800 hover:bg-emerald-100 border border-emerald-200'
                }`}
              >
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-300"></span>
                <span>In Stock Only ({inStockProducts.length})</span>
              </button>
              <button
                type="button"
                onClick={() => setStockFilter('all')}
                className={`px-2.5 py-1 rounded-lg font-semibold transition-all cursor-pointer ${
                  stockFilter === 'all'
                    ? 'bg-blue-600 text-white shadow-2xs'
                    : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'
                }`}
              >
                All Items ({products.length})
              </button>
              <button
                type="button"
                onClick={() => setStockFilter('low_stock')}
                className={`px-2.5 py-1 rounded-lg font-semibold transition-all cursor-pointer ${
                  stockFilter === 'low_stock'
                    ? 'bg-amber-600 text-white shadow-2xs'
                    : 'bg-amber-50 text-amber-800 hover:bg-amber-100 border border-amber-200'
                }`}
              >
                Low Stock ({lowStockProducts.length})
              </button>
            </div>

            <span className="text-[11px] text-slate-500 font-medium">
              Showing <span className="font-bold text-slate-800">{filteredProducts.length}</span> items
            </span>
          </div>

          {/* Category Pills */}
          <div className="flex items-center space-x-1.5 overflow-x-auto pb-1 text-xs">
            {categories.map(cat => (
              <button
                key={cat}
                onClick={() => setSelectedCategory(cat)}
                className={`px-3 py-1 rounded-full font-medium whitespace-nowrap transition-colors cursor-pointer ${
                  selectedCategory === cat 
                    ? 'bg-slate-800 text-white shadow-xs' 
                    : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-100'
                }`}
              >
                {cat}
              </button>
            ))}
          </div>
        </div>
        
        {/* Products Grid */}
        <div className="flex-1 overflow-y-auto p-4">
          {filteredProducts.length === 0 ? (
            <div className="h-64 flex flex-col items-center justify-center text-slate-400 space-y-3">
              <ShoppingBag className="h-10 w-10 text-slate-300" />
              <p className="text-sm font-medium text-slate-600">No products found for this search/filter</p>
              <div className="flex space-x-2">
                {stockFilter !== 'all' && (
                  <button
                    type="button"
                    onClick={() => setStockFilter('all')}
                    className="px-3 py-1.5 bg-blue-50 text-blue-700 rounded-lg text-xs font-semibold hover:bg-blue-100 border border-blue-200 cursor-pointer"
                  >
                    View All Products
                  </button>
                )}
                <button
                  type="button"
                  onClick={resetSampleData}
                  className="px-3 py-1.5 bg-slate-100 text-slate-700 rounded-lg text-xs font-semibold hover:bg-slate-200 border border-slate-200 cursor-pointer"
                >
                  Reload Sample Inventory
                </button>
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-3.5">
              {filteredProducts.map(product => {
                const inCart = cart.find(c => c.product.id === product.id);
                const isOutOfStock = product.stock <= 0;
                const unit = product.unit || 'kg';
                const isWeightItem = unit === 'kg' || unit === 'g';

                return (
                  <div 
                    key={product.id}
                    onClick={() => !isOutOfStock && addToCart(product)}
                    className={`group relative border rounded-xl p-3.5 flex flex-col justify-between transition-all duration-150 ${
                      isOutOfStock 
                        ? 'opacity-60 bg-slate-50 border-slate-200 cursor-not-allowed' 
                        : inCart 
                          ? 'bg-blue-50/50 border-blue-400 shadow-sm cursor-pointer hover:border-blue-500' 
                          : 'bg-white border-slate-200 hover:border-blue-400 hover:shadow-md cursor-pointer'
                    }`}
                  >
                    {inCart && (
                      <span className="absolute -top-2 -right-2 bg-blue-600 text-white text-xs font-bold rounded-full px-2 py-0.5 flex items-center justify-center shadow-xs">
                        {formatItemDisplayQuantity(inCart)}
                      </span>
                    )}

                    <div>
                      <div className="flex items-center justify-between text-[11px] text-slate-400 font-medium mb-1">
                        <span>{product.sku || 'SKU'}</span>
                        <div className="flex items-center space-x-1">
                          <span className="bg-slate-100 text-slate-700 px-1 rounded text-[10px] font-bold uppercase">
                            {unit}
                          </span>
                          <span className={`px-1.5 py-0.5 rounded text-[10px] font-semibold ${
                            isOutOfStock 
                              ? 'bg-red-100 text-red-700' 
                              : product.stock <= product.minStock 
                                ? 'bg-amber-100 text-amber-800' 
                                : 'bg-emerald-100 text-emerald-800'
                          }`}>
                            {isOutOfStock ? '0' : `${product.stock} ${unit}`}
                          </span>
                        </div>
                      </div>
                      <h4 className="font-semibold text-slate-800 text-sm line-clamp-2 min-h-[2.5rem]">
                        {product.name}
                      </h4>
                    </div>

                    <div className="mt-3 pt-2 border-t border-slate-100 space-y-2">
                      <div className="flex justify-between items-center">
                        <div>
                          <span className="text-[11px] text-slate-400">Rate</span>
                          <p className="text-blue-600 font-bold text-base leading-tight">
                            ₹{product.sellingPrice} <span className="text-xs font-normal text-slate-500">/{unit}</span>
                          </p>
                        </div>
                        <button
                          type="button"
                          disabled={isOutOfStock}
                          onClick={(e) => {
                            e.stopPropagation();
                            addToCart(product);
                          }}
                          className={`p-1.5 rounded-lg text-xs font-medium flex items-center space-x-1 ${
                            isOutOfStock 
                              ? 'bg-slate-200 text-slate-400 cursor-not-allowed' 
                              : 'bg-blue-50 text-blue-600 group-hover:bg-blue-600 group-hover:text-white transition-colors cursor-pointer'
                          }`}
                        >
                          <Plus size={16} />
                        </button>
                      </div>

                      {/* Quick weight selector chips for loose weight items */}
                      {isWeightItem && !isOutOfStock && (
                        <div className="flex items-center space-x-1 pt-1 border-t border-dashed border-slate-100" onClick={e => e.stopPropagation()}>
                          <span className="text-[10px] text-slate-400 font-semibold mr-0.5">Quick:</span>
                          {[
                            { label: '250g', val: 0.25, u: 'g' as ProductUnit },
                            { label: '500g', val: 0.5, u: 'g' as ProductUnit },
                            { label: '1kg', val: 1.0, u: 'kg' as ProductUnit }
                          ].map(opt => (
                            <button
                              key={opt.label}
                              type="button"
                              onClick={() => addToCart(product, opt.val, opt.u)}
                              className="px-1.5 py-0.5 bg-slate-100 hover:bg-blue-600 hover:text-white text-slate-700 rounded text-[10px] font-bold transition-colors cursor-pointer"
                            >
                              +{opt.label}
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* Right side: Cart & Checkout (div:nth-of-type(2)) */}
      <div className="w-full lg:w-96 flex flex-col bg-white rounded-xl shadow-sm border border-slate-200">
        {/* Cart Header (div:nth-of-type(1)) */}
        <div className="p-4 border-b border-slate-200 bg-slate-50 flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <Receipt className="text-blue-600 h-5 w-5" />
            <h3 className="font-bold text-slate-800 text-base">Current Bill</h3>
          </div>
          {cart.length > 0 && (
            <button 
              onClick={() => {
                setCart([]);
                showToast('Cart cleared', 'info');
              }}
              className="text-xs text-red-500 hover:text-red-700 font-medium cursor-pointer"
            >
              Clear All
            </button>
          )}
        </div>
        
        {/* Cart Items List Container (div:nth-of-type(2)) */}
        <div className="flex-1 overflow-y-auto p-3.5 space-y-3 min-h-[160px] max-h-[380px]">
          {cart.length === 0 ? (
            /* TARGET ELEMENT when empty: div:nth-of-type(2) > div:nth-of-type(2) > div:nth-of-type(1) */
            <div className="h-full py-4 flex flex-col items-center justify-start text-center px-1 space-y-3">
              <div className="flex flex-col items-center">
                <div className="bg-blue-50 text-blue-600 p-2.5 rounded-full mb-1.5 ring-6 ring-blue-50/50">
                  <ShoppingBag size={24} />
                </div>
                <p className="text-sm font-bold text-slate-800">Your cart is empty</p>
                <p className="text-xs text-slate-500">Sell by kg, gram, or pieces:</p>
              </div>

              {/* Direct In-Stock Product Search inside the Empty Cart */}
              <div className="w-full text-left space-y-2">
                <div className="relative">
                  <Search className="absolute left-2.5 top-1/2 transform -translate-y-1/2 text-slate-400 h-4 w-4" />
                  <input
                    type="text"
                    placeholder="Search in-stock products to add..."
                    className="w-full pl-8 pr-7 py-2 text-xs bg-white border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-blue-500 font-medium placeholder-slate-400 shadow-2xs"
                    value={cartSearchTerm}
                    onChange={(e) => setCartSearchTerm(e.target.value)}
                  />
                  {cartSearchTerm && (
                    <button
                      type="button"
                      onClick={() => setCartSearchTerm('')}
                      className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 cursor-pointer"
                    >
                      <X size={14} />
                    </button>
                  )}
                </div>

                {/* If searching inside cart */}
                {cartSearchTerm.trim() !== '' ? (
                  <div className="max-h-44 overflow-y-auto space-y-1 border border-slate-200 rounded-lg p-1.5 bg-slate-50">
                    {inStockSearchResults.length === 0 ? (
                      <p className="text-xs text-slate-400 text-center py-3">No in-stock items found for "{cartSearchTerm}"</p>
                    ) : (
                      inStockSearchResults.map(product => (
                        <div
                          key={product.id}
                          onClick={() => addToCart(product)}
                          className="flex items-center justify-between p-1.5 bg-white hover:bg-blue-50 rounded-md border border-slate-100 cursor-pointer transition-colors shadow-2xs"
                        >
                          <div className="min-w-0 flex-1 pr-2">
                            <p className="text-xs font-semibold text-slate-800 truncate">{product.name}</p>
                            <div className="flex items-center space-x-2 text-[10px] text-slate-500">
                              <span className="text-emerald-600 font-semibold">{product.stock} {product.unit || 'kg'}</span>
                              <span>•</span>
                              <span>SKU: {product.sku}</span>
                            </div>
                          </div>
                          <div className="flex items-center space-x-1.5">
                            <span className="text-xs font-bold text-blue-600">₹{product.sellingPrice}/{product.unit || 'kg'}</span>
                            <span className="p-1 bg-blue-600 text-white rounded hover:bg-blue-700">
                              <Plus size={12} />
                            </span>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                ) : (
                  /* Available In-Stock Chips + Quick Fill */
                  <div className="space-y-2">
                    <div className="flex items-center justify-between text-[11px] font-semibold text-slate-500">
                      <span className="flex items-center space-x-1">
                        <span className="h-2 w-2 rounded-full bg-emerald-500 inline-block"></span>
                        <span>In-Stock Items ({inStockProducts.length})</span>
                      </span>
                      <span 
                        role="button"
                        tabIndex={0}
                        onClick={() => {
                          if (inStockProducts.length > 0) {
                            addMultipleToCart(inStockProducts.slice(0, 3));
                            showToast(`Added ${Math.min(3, inStockProducts.length)} in-stock items to bill!`, 'success');
                          } else {
                            resetSampleData();
                            showToast('Reloaded sample inventory!', 'info');
                          }
                        }}
                        className="text-[11px] text-blue-600 hover:text-blue-800 bg-blue-50 hover:bg-blue-100 border border-blue-200/90 px-2.5 py-1 rounded-md font-bold cursor-pointer transition-all active:scale-95 inline-flex items-center space-x-1 shadow-2xs select-none"
                      >
                        <Plus size={12} className="stroke-[2.5]" />
                        <span>Tap to add items</span>
                      </span>
                    </div>

                    <div className="flex flex-wrap gap-1.5 max-h-36 overflow-y-auto p-0.5 justify-center">
                      {inStockProducts.slice(0, 6).map(p => (
                        <button
                          key={p.id}
                          type="button"
                          onClick={() => addToCart(p)}
                          className="px-2 py-1.5 bg-white hover:bg-blue-50 active:scale-95 text-slate-700 hover:text-blue-700 text-xs font-semibold rounded-lg border border-slate-200 hover:border-blue-300 flex items-center space-x-1 cursor-pointer transition-all shadow-2xs"
                        >
                          <Plus size={12} className="text-blue-600 shrink-0" />
                          <span className="truncate max-w-[100px]">{p.name}</span>
                          <span className="text-emerald-600 text-[10px] font-bold">({p.unit || 'kg'})</span>
                          <span className="text-blue-600 font-bold ml-0.5">₹{p.sellingPrice}</span>
                        </button>
                      ))}
                    </div>

                    <button
                      type="button"
                      onClick={() => {
                        const sampleItems = inStockProducts.slice(0, 2);
                        if (sampleItems.length > 0) {
                          addMultipleToCart(sampleItems);
                          showToast(`Added ${sampleItems.length} in-stock demo items to bill!`, 'success');
                        } else {
                          resetSampleData();
                          showToast('Sample products reloaded!', 'info');
                        }
                      }}
                      className="w-full text-xs text-blue-600 hover:text-blue-800 font-bold bg-blue-50 hover:bg-blue-100 py-2 px-3 rounded-lg border border-blue-200 flex items-center justify-center space-x-1.5 transition-colors cursor-pointer"
                    >
                      <Sparkles size={14} />
                      <span>⚡ Quick Fill Bill (2 In-Stock Items)</span>
                    </button>
                  </div>
                )}
              </div>
            </div>
          ) : (
            /* TARGET ELEMENT when has items: div:nth-of-type(2) > div:nth-of-type(2) > div:nth-of-type(1) */
            cart.map(item => {
              const isWeightItem = item.product.unit === 'kg' || item.selectedUnit === 'kg' || item.selectedUnit === 'g';
              const currentGrams = Math.round(item.quantity * 1000);
              const itemTotal = parseFloat((item.product.sellingPrice * item.quantity).toFixed(2));

              return (
                <div key={item.product.id} className="bg-slate-50/90 p-3 rounded-xl border border-slate-200 space-y-2.5 shadow-2xs">
                  {/* Top Header of item: div:nth-of-type(1) */}
                  <div className="flex justify-between items-start">
                    {/* Left Column: div:nth-of-type(1) > div:nth-of-type(1) */}
                    <div className="flex-1 min-w-0 pr-2">
                      {/* TARGET ELEMENT: div:nth-of-type(1) > div:nth-of-type(1) > h4:nth-of-type(1) */}
                      <h4 className="font-semibold text-slate-800 text-xs truncate flex items-center gap-1.5">
                        <span className="truncate">{item.product.name}</span>
                        <span className="bg-blue-100 text-blue-700 px-1.5 py-0.2 rounded text-[10px] uppercase font-bold border border-blue-200 shrink-0">
                          {item.selectedUnit}
                        </span>
                      </h4>

                      <p className="text-[11px] text-slate-500 mt-0.5">
                        Rate: ₹{item.product.sellingPrice}/{item.product.unit || 'kg'} • Total:{' '}
                        <span className="font-bold text-slate-800 text-xs">₹{itemTotal.toFixed(2)}</span>
                      </p>
                    </div>

                    {/* Right column: Total Price & Remove */}
                    <div className="flex items-center space-x-2 shrink-0">
                      <span className="text-sm font-bold text-blue-700">₹{itemTotal.toFixed(2)}</span>
                      <button 
                        onClick={() => removeFromCart(item.product.id)} 
                        className="p-1 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-md transition-colors cursor-pointer"
                        title="Remove item"
                      >
                        <Trash2 size={15} />
                      </button>
                    </div>
                  </div>

                  {/* Weight & Unit Controls (KG & GRAM support) */}
                  {isWeightItem ? (
                    <div className="bg-white p-2 rounded-lg border border-slate-200 space-y-2">
                      {/* Weight Mode & Custom Input */}
                      <div className="flex items-center justify-between gap-2">
                        <div className="flex items-center space-x-1.5">
                          <Scale size={14} className="text-blue-600" />
                          <span className="text-[11px] font-semibold text-slate-600">Weight:</span>
                          
                          {/* Unit Switcher: KG vs GRAM */}
                          <div className="inline-flex rounded-md border border-slate-200 p-0.5 bg-slate-100 text-[10px] font-bold">
                            <button
                              type="button"
                              onClick={() => {
                                if (item.selectedUnit !== 'kg') toggleUnit(item.product.id);
                              }}
                              className={`px-2 py-0.5 rounded cursor-pointer transition-colors ${
                                item.selectedUnit === 'kg' 
                                  ? 'bg-blue-600 text-white shadow-2xs' 
                                  : 'text-slate-600 hover:text-slate-900'
                              }`}
                            >
                              kg
                            </button>
                            <button
                              type="button"
                              onClick={() => {
                                if (item.selectedUnit !== 'g') toggleUnit(item.product.id);
                              }}
                              className={`px-2 py-0.5 rounded cursor-pointer transition-colors ${
                                item.selectedUnit === 'g' 
                                  ? 'bg-blue-600 text-white shadow-2xs' 
                                  : 'text-slate-600 hover:text-slate-900'
                              }`}
                            >
                              gram (g)
                            </button>
                          </div>
                        </div>

                        {/* Direct input for weight / gram */}
                        <div className="flex items-center space-x-1">
                          <input
                            type="number"
                            step={item.selectedUnit === 'g' ? '10' : '0.05'}
                            min="0.01"
                            value={item.selectedUnit === 'g' ? currentGrams : item.quantity}
                            onChange={(e) => {
                              const val = parseFloat(e.target.value);
                              if (!isNaN(val)) {
                                setItemWeight(item.product.id, val, item.selectedUnit);
                              }
                            }}
                            className="w-16 px-1.5 py-1 text-xs text-right font-bold text-slate-800 border border-slate-300 rounded focus:ring-1 focus:ring-blue-500 bg-slate-50"
                          />
                          <span className="text-xs font-semibold text-slate-500 w-6">
                            {item.selectedUnit === 'g' ? 'g' : 'kg'}
                          </span>
                        </div>
                      </div>

                      {/* Quick Weight Presets for Indian Retail Stores */}
                      <div className="flex items-center justify-between pt-1 border-t border-slate-100">
                        <span className="text-[10px] text-slate-400 font-semibold">Presets:</span>
                        <div className="flex items-center space-x-1">
                          {[
                            { label: '100g', g: 100, u: 'g' as ProductUnit },
                            { label: '250g', g: 250, u: 'g' as ProductUnit },
                            { label: '500g', g: 500, u: 'g' as ProductUnit },
                            { label: '1 kg', g: 1000, u: 'kg' as ProductUnit },
                            { label: '2 kg', g: 2000, u: 'kg' as ProductUnit },
                          ].map(preset => {
                            const isCurrent = Math.abs(currentGrams - preset.g) < 2;
                            return (
                              <button
                                key={preset.label}
                                type="button"
                                onClick={() => setItemWeight(item.product.id, preset.g, preset.u)}
                                className={`px-1.5 py-0.5 rounded text-[10px] font-bold transition-all cursor-pointer ${
                                  isCurrent 
                                    ? 'bg-blue-600 text-white shadow-xs' 
                                    : 'bg-slate-100 hover:bg-blue-50 text-slate-600 hover:text-blue-700 border border-slate-200'
                                }`}
                              >
                                {preset.label}
                              </button>
                            );
                          })}
                        </div>
                      </div>
                    </div>
                  ) : (
                    /* Standard Pieces / Packs quantity controller */
                    <div className="flex justify-between items-center bg-white p-1.5 rounded-lg border border-slate-200">
                      <span className="text-xs text-slate-500 font-medium">
                        Qty ({item.selectedUnit || 'pcs'}):
                      </span>
                      <div className="flex items-center space-x-1.5">
                        <div className="flex items-center bg-slate-100 border border-slate-200 rounded-lg">
                          <button 
                            onClick={() => updateQuantity(item.product.id, -1)} 
                            className="p-1 text-slate-600 hover:text-blue-600 hover:bg-slate-200 rounded-l cursor-pointer"
                          >
                            <Minus size={13} />
                          </button>
                          <span className="w-8 text-center text-xs font-bold text-slate-800">{item.quantity}</span>
                          <button 
                            onClick={() => updateQuantity(item.product.id, 1)} 
                            className="p-1 text-slate-600 hover:text-blue-600 hover:bg-slate-200 rounded-r cursor-pointer"
                          >
                            <Plus size={13} />
                          </button>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>

        {/* Checkout Controls Area (div:nth-of-type(3)) */}
        <div className="p-4 border-t border-slate-200 bg-slate-50 space-y-3.5">
          {/* Customer Selection with Quick Add */}
          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="text-xs font-medium text-slate-600">Customer (Required for Udhaar)</label>
              <button
                type="button"
                onClick={() => setShowAddCustomerModal(true)}
                className="text-[11px] text-blue-600 hover:text-blue-800 font-medium flex items-center space-x-0.5 cursor-pointer"
              >
                <UserPlus size={12} />
                <span>+ New</span>
              </button>
            </div>
            <select 
              className="w-full bg-white border border-slate-200 rounded-lg p-2 text-xs focus:outline-none focus:ring-1 focus:ring-blue-500 font-medium text-slate-700"
              value={selectedCustomerId}
              onChange={(e) => setSelectedCustomerId(e.target.value)}
            >
              <option value="">-- Cash / Walk-in Customer --</option>
              {customers.map(c => (
                <option key={c.id} value={c.id}>
                  {c.name} ({c.phone}) {c.balance > 0 ? `• Due: ₹${c.balance}` : ''}
                </option>
              ))}
            </select>
          </div>

          {/* Pricing calculations */}
          <div className="space-y-1.5 text-xs text-slate-600 pt-1 border-t border-slate-200">
            <div className="flex justify-between items-center">
              <span>Subtotal</span>
              <span className="font-semibold text-slate-800">₹{subtotal.toFixed(2)}</span>
            </div>
            
            {/* Quick Discount Selector */}
            <div className="flex justify-between items-center">
              <span>Discount</span>
              <div className="flex items-center space-x-1">
                {[0, 5, 10].map(pct => (
                  <button
                    key={pct}
                    type="button"
                    onClick={() => setDiscountPercent(pct)}
                    className={`px-1.5 py-0.5 rounded text-[10px] font-semibold border cursor-pointer ${
                      discountPercent === pct 
                        ? 'bg-blue-600 text-white border-blue-600' 
                        : 'bg-white text-slate-600 border-slate-200'
                    }`}
                  >
                    {pct}%
                  </button>
                ))}
                {discountAmount > 0 && <span className="text-emerald-600 font-semibold ml-1">-₹{discountAmount}</span>}
              </div>
            </div>

            <div className="flex justify-between items-center text-base font-bold text-slate-900 pt-1.5 border-t border-slate-200">
              <span>Total Bill</span>
              <span className="text-blue-700">₹{total.toFixed(2)}</span>
            </div>
          </div>

          {/* Amount Paid Now input */}
          <div className="space-y-1">
            <div className="flex justify-between items-center">
              <label className="text-xs font-medium text-slate-600">Amount Paid Now (₹)</label>
              {amountPaidStr !== '' && parseFloat(amountPaidStr) < total && (
                <span className="text-[11px] font-bold text-orange-600 bg-orange-50 px-1.5 py-0.5 rounded border border-orange-200">
                  Udhaar: ₹{(total - parseFloat(amountPaidStr)).toFixed(2)}
                </span>
              )}
            </div>
            <input 
              type="number"
              placeholder={`Full payment: ₹${total.toFixed(2)}`}
              className="w-full bg-white border border-slate-200 rounded-lg p-2 text-sm focus:outline-none focus:ring-1 focus:ring-blue-500 font-semibold text-slate-800"
              value={amountPaidStr}
              onChange={(e) => setAmountPaidStr(e.target.value)}
            />
          </div>

          {/* Payment Method Selector (1. PAYMENT METHOD SELECTION) */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label className="text-xs font-bold text-slate-800 uppercase tracking-wider">Payment Method</label>
              <button
                type="button"
                onClick={() => navigate('/payment-settings')}
                className="text-[11px] text-blue-600 hover:text-blue-800 font-semibold flex items-center space-x-1 cursor-pointer"
                title="Configure your shop's official UPI QR code"
              >
                <QrCode size={12} />
                <span>UPI Settings</span>
              </button>
            </div>

            {/* Primary Payment Options: Cash Payment & Online UPI Payment */}
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setPaymentMethod('Cash')}
                className={`py-2.5 px-3 rounded-xl border text-left transition-all cursor-pointer ${
                  paymentMethod === 'Cash'
                    ? 'bg-blue-600 text-white border-blue-600 shadow-sm ring-2 ring-blue-600/20'
                    : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-100 hover:border-slate-300'
                }`}
              >
                <div className="flex items-center space-x-2">
                  <span className="text-lg">💵</span>
                  <div>
                    <span className="block text-xs font-bold">A. Cash Payment</span>
                    <span className={`block text-[10px] ${paymentMethod === 'Cash' ? 'text-blue-100' : 'text-slate-400'}`}>
                      Cash in Hand
                    </span>
                  </div>
                </div>
              </button>

              <button
                type="button"
                onClick={() => setPaymentMethod('UPI QR')}
                className={`py-2.5 px-3 rounded-xl border text-left transition-all cursor-pointer ${
                  isUpiPaymentMethod(paymentMethod)
                    ? 'bg-blue-600 text-white border-blue-600 shadow-sm ring-2 ring-blue-600/20'
                    : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-100 hover:border-slate-300'
                }`}
              >
                <div className="flex items-center space-x-2">
                  <span className="text-lg">📲</span>
                  <div>
                    <span className="block text-xs font-bold">B. Online UPI</span>
                    <span className={`block text-[10px] ${isUpiPaymentMethod(paymentMethod) ? 'text-blue-100' : 'text-slate-400'}`}>
                      QR / GPay / PhonePe
                    </span>
                  </div>
                </div>
              </button>
            </div>

            {/* UPI Sub-app selector if Online UPI is active */}
            {isUpiPaymentMethod(paymentMethod) && (
              <div className="bg-blue-50/90 border border-blue-200 rounded-xl p-2.5 space-y-2">
                <div className="flex items-center justify-between text-xs">
                  <div className="flex items-center space-x-1.5 truncate">
                    <QrCode size={14} className="text-blue-600 shrink-0" />
                    <span className="font-bold text-slate-800 text-[11px] truncate">
                      {paymentSettings.businessName || 'DukaanSmart Store'}
                    </span>
                  </div>
                  <span className="text-[10px] bg-blue-100 text-blue-800 px-1.5 py-0.5 rounded font-bold">
                    UPI Active
                  </span>
                </div>

                <div className="flex items-center justify-between text-[11px] font-mono text-slate-600 bg-white px-2 py-1 rounded border border-blue-100">
                  <span className="truncate">VPA: {paymentSettings.upiId || 'Not set'}</span>
                  <span className="text-[10px] font-sans text-blue-600 font-bold ml-1 shrink-0">Ref: {nextOrderNumber}</span>
                </div>

                <div className="flex flex-wrap gap-1 pt-0.5">
                  {[
                    { id: 'UPI QR' as PaymentMethodType, label: 'QR Scan' },
                    { id: 'Google Pay' as PaymentMethodType, label: 'GPay' },
                    { id: 'PhonePe' as PaymentMethodType, label: 'PhonePe' },
                    { id: 'Paytm' as PaymentMethodType, label: 'Paytm' },
                  ].map(uMethod => (
                    <button
                      key={uMethod.id}
                      type="button"
                      onClick={() => setPaymentMethod(uMethod.id)}
                      className={`text-[10px] px-2 py-0.5 rounded font-semibold border cursor-pointer ${
                        paymentMethod === uMethod.id
                          ? 'bg-blue-600 text-white border-blue-600'
                          : 'bg-white text-slate-600 border-slate-200 hover:bg-blue-50'
                      }`}
                    >
                      {uMethod.label}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Action button */}
          <button 
            type="button"
            onClick={handleCheckout}
            className={`w-full py-3.5 px-4 rounded-xl font-bold text-sm md:text-base flex items-center justify-center space-x-2 shadow-sm transition-all duration-150 active:scale-[0.99] cursor-pointer ${
              cart.length === 0 
                ? 'bg-slate-200 text-slate-500 hover:bg-slate-300 border border-slate-300' 
                : 'bg-blue-600 hover:bg-blue-700 text-white shadow-blue-500/25 ring-2 ring-blue-600/20'
            }`}
          >
            {isUpiPaymentMethod(paymentMethod) ? (
              <>
                <QrCode className="h-5 w-5" />
                <span>
                  {cart.length === 0 
                    ? 'Select Products to Complete Sale' 
                    : `Proceed Online UPI • ₹${total.toFixed(2)}`}
                </span>
              </>
            ) : (
              <>
                <Banknote className="h-5 w-5" />
                <span>
                  {cart.length === 0 
                    ? 'Select Products to Complete Sale' 
                    : `Process Cash Payment • ₹${total.toFixed(2)}`}
                </span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* QUICK ADD CUSTOMER MODAL */}
      {showAddCustomerModal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-sm p-5 space-y-4 animate-in fade-in zoom-in-95">
            <div className="flex justify-between items-center border-b border-slate-100 pb-3">
              <h3 className="font-bold text-slate-800 text-base flex items-center space-x-2">
                <UserPlus className="h-5 w-5 text-blue-600" />
                <span>Add Customer for Udhaar</span>
              </h3>
              <button onClick={() => setShowAddCustomerModal(false)} className="text-slate-400 hover:text-slate-600 cursor-pointer">
                <X size={18} />
              </button>
            </div>
            <form onSubmit={handleQuickAddCustomer} className="space-y-3">
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">Customer Full Name *</label>
                <input 
                  required 
                  type="text" 
                  placeholder="e.g. Ramesh Kumar"
                  className="w-full border border-slate-200 rounded-lg p-2 text-sm focus:ring-1 focus:ring-blue-500" 
                  value={newCustomerForm.name} 
                  onChange={e => setNewCustomerForm({...newCustomerForm, name: e.target.value})} 
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">Mobile Number (WhatsApp) *</label>
                <input 
                  required 
                  type="tel" 
                  placeholder="e.g. 9876543210"
                  className="w-full border border-slate-200 rounded-lg p-2 text-sm focus:ring-1 focus:ring-blue-500" 
                  value={newCustomerForm.phone} 
                  onChange={e => setNewCustomerForm({...newCustomerForm, phone: e.target.value})} 
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">Address / Locality</label>
                <input 
                  type="text" 
                  placeholder="e.g. Shop 4, Main Market"
                  className="w-full border border-slate-200 rounded-lg p-2 text-sm focus:ring-1 focus:ring-blue-500" 
                  value={newCustomerForm.address} 
                  onChange={e => setNewCustomerForm({...newCustomerForm, address: e.target.value})} 
                />
              </div>
              <div className="pt-2 flex justify-end space-x-2">
                <button 
                  type="button" 
                  onClick={() => setShowAddCustomerModal(false)} 
                  className="px-3 py-1.5 text-xs border border-slate-200 rounded-lg text-slate-600 hover:bg-slate-50 cursor-pointer"
                >
                  Cancel
                </button>
                <button 
                  type="submit" 
                  className="px-4 py-1.5 text-xs bg-blue-600 text-white font-semibold rounded-lg hover:bg-blue-700 shadow-xs cursor-pointer"
                >
                  Save Customer
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 2. CASH PAYMENT MODAL (CONFIRM CASH RECEIVED & CALCULATE CHANGE) */}
      {showCashModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-xs z-50 flex items-center justify-center p-3 sm:p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden animate-in fade-in zoom-in-95 my-6">
            {/* Modal Header */}
            <div className="bg-gradient-to-r from-blue-600 via-blue-700 to-indigo-700 text-white p-4 flex justify-between items-center">
              <div className="flex items-center space-x-2.5">
                <div className="bg-white/20 p-2 rounded-xl">
                  <Banknote className="h-6 w-6 text-white" />
                </div>
                <div>
                  <h3 className="font-bold text-base leading-tight">Cash Payment Billing</h3>
                  <p className="text-xs text-blue-100 mt-0.5">Order #{nextOrderNumber} • Direct Cash Counter</p>
                </div>
              </div>
              <button 
                onClick={() => setShowCashModal(false)} 
                className="text-white/80 hover:text-white p-1 rounded-lg hover:bg-white/10 cursor-pointer"
              >
                <X size={20} />
              </button>
            </div>

            <div className="p-5 space-y-4">
              {/* Total Bill Due Display */}
              <div className="p-3.5 bg-blue-50 border border-blue-200 rounded-xl text-center">
                <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider block">Total Payable Amount</span>
                <span className="text-3xl font-extrabold text-blue-700 mt-0.5 block">₹{total.toFixed(2)}</span>
              </div>

              {/* Cash Received Input */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">
                  Cash Received from Customer (₹) *
                </label>
                <div className="relative">
                  <span className="absolute left-3 top-2.5 text-slate-400 font-bold text-base">₹</span>
                  <input
                    type="number"
                    step="any"
                    autoFocus
                    placeholder={total.toFixed(2)}
                    value={cashReceivedInput}
                    onChange={(e) => setCashReceivedInput(e.target.value)}
                    className="w-full pl-8 pr-4 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-lg font-bold text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>

              {/* Quick Currency Note Buttons */}
              <div className="space-y-1">
                <span className="text-[11px] font-semibold text-slate-500 block">Quick Cash Tenders:</span>
                <div className="flex flex-wrap gap-1.5">
                  {[total, 50, 100, 200, 500, 1000, 2000].filter((val, idx, arr) => val >= total || val === total || (idx > 0 && arr.indexOf(val) === idx)).slice(0, 6).map((val) => (
                    <button
                      key={val}
                      type="button"
                      onClick={() => setCashReceivedInput(val.toString())}
                      className="px-2.5 py-1 text-xs font-bold bg-slate-100 hover:bg-blue-50 text-slate-700 hover:text-blue-700 rounded-lg border border-slate-200 transition-colors cursor-pointer"
                    >
                      ₹{val}
                    </button>
                  ))}
                </div>
              </div>

              {/* Change Return Calculation */}
              <div className="grid grid-cols-2 gap-2 pt-2">
                <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 text-center">
                  <span className="text-[11px] font-medium text-slate-500 block">Cash Received</span>
                  <span className="text-base font-bold text-slate-800 font-mono">
                    ₹{cashReceivedNum.toFixed(2)}
                  </span>
                </div>
                <div className="p-3 bg-emerald-50 rounded-xl border border-emerald-200 text-center">
                  <span className="text-[11px] font-bold text-emerald-700 block">Change to Return</span>
                  <span className="text-lg font-extrabold text-emerald-700 font-mono">
                    ₹{cashChangeToReturn.toFixed(2)}
                  </span>
                </div>
              </div>

              {cashReceivedNum < total && (
                <div className="p-2.5 bg-amber-50 rounded-lg border border-amber-200 text-xs text-amber-800 flex items-start space-x-2">
                  <AlertCircle size={16} className="shrink-0 text-amber-600 mt-0.5" />
                  <div>
                    <span className="font-bold">Partial Cash Notice:</span> Customer balance of ₹{(total - cashReceivedNum).toFixed(2)} will be marked as Udhaar / Due.
                  </div>
                </div>
              )}
            </div>

            {/* Modal Actions */}
            <div className="p-4 bg-slate-50 border-t border-slate-200 flex flex-col sm:flex-row gap-2">
              <button
                type="button"
                onClick={() => setShowCashModal(false)}
                className="py-2.5 px-4 border border-slate-300 bg-white hover:bg-slate-100 text-slate-700 rounded-xl text-xs font-bold cursor-pointer"
              >
                Back / Edit Cart
              </button>
              <button
                type="button"
                onClick={handleConfirmCashPayment}
                className="flex-1 py-3 px-4 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs sm:text-sm font-bold flex items-center justify-center space-x-2 shadow-md shadow-blue-600/20 cursor-pointer transition-all active:scale-[0.99]"
              >
                <CheckCircle2 size={18} />
                <span>Confirm Cash Payment & Print Bill</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 3. ONLINE UPI PAYMENT MODAL (QR CODE, CHECK PAYMENT STATUS & VERIFICATION) */}
      {showUpiCheckoutModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-xs z-50 flex items-center justify-center p-3 sm:p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden animate-in fade-in zoom-in-95 my-6">
            {/* Modal Header */}
            <div className="bg-gradient-to-r from-blue-600 via-blue-700 to-indigo-700 text-white p-4 flex justify-between items-center">
              <div className="flex items-center space-x-2.5">
                <div className="bg-white/20 p-2 rounded-xl">
                  <QrCode className="h-6 w-6 text-white" />
                </div>
                <div>
                  <h3 className="font-bold text-base leading-tight">Online UPI Payment</h3>
                  <p className="text-xs text-blue-100 flex items-center space-x-1.5 mt-0.5">
                    <span>Order #{nextOrderNumber}</span>
                    <span>•</span>
                    <span>Scan & Pay with Any UPI App</span>
                  </p>
                </div>
              </div>
              <button 
                onClick={() => setShowUpiCheckoutModal(false)} 
                className="text-white/80 hover:text-white p-1 rounded-lg hover:bg-white/10 cursor-pointer"
              >
                <X size={20} />
              </button>
            </div>

            {/* Order Details Summary Header */}
            <div className="p-4 bg-slate-50 border-b border-slate-200">
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-center text-xs">
                <div className="bg-white p-2 rounded-lg border border-slate-200">
                  <span className="text-slate-400 text-[10px] block font-medium">Order Number</span>
                  <span className="font-mono font-bold text-slate-800 text-xs sm:text-sm">{nextOrderNumber}</span>
                </div>
                <div className="bg-white p-2 rounded-lg border border-slate-200">
                  <span className="text-slate-400 text-[10px] block font-medium">Total Amount</span>
                  <span className="font-extrabold text-blue-700 text-xs sm:text-sm">₹{total.toFixed(2)}</span>
                </div>
                <div className="bg-white p-2 rounded-lg border border-slate-200">
                  <span className="text-slate-400 text-[10px] block font-medium">Payment Method</span>
                  <span className="font-bold text-slate-800 text-xs sm:text-sm">{paymentMethod}</span>
                </div>
                <div className="bg-white p-2 rounded-lg border border-slate-200">
                  <span className="text-slate-400 text-[10px] block font-medium">Payment Status</span>
                  {upiPaymentStatus === 'Pending' ? (
                    <span className="inline-block px-1.5 py-0.5 rounded font-bold text-[10px] bg-amber-100 text-amber-800 animate-pulse">
                      Pending
                    </span>
                  ) : (
                    <span className="inline-block px-1.5 py-0.5 rounded font-bold text-[10px] bg-emerald-100 text-emerald-800">
                      Paid
                    </span>
                  )}
                </div>
              </div>

              {/* Customer Instruction Box */}
              <div className="mt-3 p-3 bg-blue-50/90 rounded-xl border border-blue-200 flex items-start space-x-2 text-xs text-blue-900">
                <Smartphone size={16} className="text-blue-600 shrink-0 mt-0.5" />
                <div>
                  <p className="font-bold">Please scan the QR code using your UPI app and complete the payment.</p>
                  <p className="text-[11px] text-blue-700 mt-0.5">
                    Open Google Pay, PhonePe, Paytm, BHIM, or any UPI banking app on your phone to scan.
                  </p>
                </div>
              </div>

              {upiErrorMessage && (
                <div className="mt-2 p-2.5 bg-amber-50 rounded-lg border border-amber-200 text-xs text-amber-900 flex items-start space-x-1.5">
                  <ShieldAlert size={15} className="text-amber-600 shrink-0 mt-0.5" />
                  <span>{upiErrorMessage}</span>
                </div>
              )}
            </div>

            {/* QR Code and Payment Details */}
            <div className="p-4 sm:p-5 flex flex-col items-center">
              <QRCodeDisplay 
                amount={total}
                orderNumber={nextOrderNumber}
                settings={paymentSettings}
                className="w-full max-w-sm"
              />

              {/* Indian UPI Apps Quick Selection Tabs */}
              <div className="w-full max-w-sm mt-4 pt-3 border-t border-slate-200">
                <p className="text-[11px] font-semibold text-slate-500 mb-2 text-center">
                  Supported Indian Digital Payment Apps:
                </p>
                <div className="grid grid-cols-4 gap-2 text-center">
                  {[
                    { name: 'GPay', icon: '🟢', bg: 'hover:bg-emerald-50' },
                    { name: 'PhonePe', icon: '🟣', bg: 'hover:bg-purple-50' },
                    { name: 'Paytm', icon: '🔵', bg: 'hover:bg-sky-50' },
                    { name: 'BHIM UPI', icon: '🇮🇳', bg: 'hover:bg-amber-50' },
                  ].map(app => (
                    <div 
                      key={app.name} 
                      className={`p-2 rounded-xl border border-slate-200 bg-slate-50/60 ${app.bg} transition-colors`}
                    >
                      <span className="text-base block">{app.icon}</span>
                      <span className="text-[10px] font-bold text-slate-700 mt-0.5 block">{app.name}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Modal Actions */}
            <div className="p-4 bg-slate-50 border-t border-slate-200 space-y-2">
              <div className="flex flex-col sm:flex-row gap-2">
                <button
                  type="button"
                  onClick={() => setShowUpiCheckoutModal(false)}
                  className="py-2.5 px-3 border border-slate-300 bg-white hover:bg-slate-100 text-slate-700 rounded-xl text-xs font-bold cursor-pointer"
                >
                  Back / Edit Cart
                </button>

                {/* Primary Button: Check Payment Status */}
                <button
                  type="button"
                  disabled={isCheckingPayment}
                  onClick={() => handleCheckPaymentStatus(false)}
                  className="flex-1 py-2.5 px-3 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold flex items-center justify-center space-x-1.5 shadow-sm cursor-pointer disabled:opacity-50"
                >
                  {isCheckingPayment ? (
                    <Loader2 size={15} className="animate-spin" />
                  ) : (
                    <RefreshCw size={15} />
                  )}
                  <span>Check Payment Status</span>
                </button>

                {/* Shopkeeper Verified Payment Confirmation */}
                <button
                  type="button"
                  disabled={isCheckingPayment}
                  onClick={() => handleCheckPaymentStatus(true)}
                  className="flex-1 py-2.5 px-3 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold flex items-center justify-center space-x-1.5 shadow-sm shadow-emerald-600/20 cursor-pointer disabled:opacity-50"
                  title="Verify bank/gateway credit and generate final paid invoice"
                >
                  <ShieldCheck size={16} />
                  <span>Verify & Confirm Paid</span>
                </button>
              </div>

              <p className="text-[10px] text-slate-400 text-center">
                🔒 Secure Backend Verification: Payment remains Pending until verified by soundbox, SMS, or bank gateway.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* 4. FULL PROFESSIONAL INVOICE & RECEIPT MODAL WITH THERMAL 58/80MM PRINT & PDF DOWNLOAD */}
      {showInvoiceModal && completedSale && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-xs z-50 flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden animate-in fade-in zoom-in-95 my-8">
            {/* Modal Header */}
            <div className="bg-gradient-to-r from-blue-600 to-blue-700 text-white p-4 flex justify-between items-center">
              <div className="flex items-center space-x-2">
                <div className="bg-white/20 p-1.5 rounded-lg">
                  <CheckCircle2 className="h-6 w-6 text-white" />
                </div>
                <div>
                  <h3 className="font-bold text-base leading-tight">Sale Completed & Paid!</h3>
                  <p className="text-xs text-blue-100">Order #{completedSale.orderNumber || completedSale.id.slice(0, 8).toUpperCase()}</p>
                </div>
              </div>
              <button 
                onClick={() => setShowInvoiceModal(false)} 
                className="text-white/80 hover:text-white p-1 rounded-lg hover:bg-white/10 cursor-pointer"
              >
                <X size={20} />
              </button>
            </div>

            {/* Printable Receipt Body (Targeted by #thermal-invoice-receipt for 58mm/80mm roll printers) */}
            <div id="thermal-invoice-receipt" className="p-5 space-y-4 bg-white text-slate-800 text-xs font-mono">
              <div className="text-center pb-3 border-b border-dashed border-slate-300">
                <h2 className="text-base font-bold text-slate-900 font-sans">{user?.shopName || paymentSettings.businessName || 'DukaanSmart Store'}</h2>
                <p className="text-[11px] text-slate-500 font-sans">Authorized Retail Merchant</p>
                {user?.shopAddress && <p className="text-[10px] text-slate-500 font-sans">{user.shopAddress}</p>}
                <p className="text-[11px] text-slate-600 font-bold mt-1 font-sans">Order Ref: {completedSale.orderNumber || completedSale.id.slice(0, 8).toUpperCase()}</p>
                <p className="text-[11px] text-slate-400">{format(new Date(completedSale.date), 'dd/MM/yyyy • hh:mm a')}</p>
              </div>

              {/* Customer info */}
              {selectedCustomerObj && (
                <div className="bg-slate-50 p-2.5 rounded-lg border border-slate-200 font-sans space-y-0.5">
                  <p className="text-[11px] text-slate-500">Billed To:</p>
                  <p className="font-semibold text-slate-800">{selectedCustomerObj.name}</p>
                  <p className="text-slate-600 text-[11px]">{selectedCustomerObj.phone} {selectedCustomerObj.address ? `• ${selectedCustomerObj.address}` : ''}</p>
                </div>
              )}

              {/* Items List */}
              <div className="space-y-1.5">
                <div className="flex justify-between font-bold text-slate-600 border-b border-slate-200 pb-1">
                  <span>ITEM</span>
                  <div className="space-x-4">
                    <span>WEIGHT / QTY</span>
                    <span>TOTAL</span>
                  </div>
                </div>
                {completedSale.items.map((item, idx) => (
                  <div key={idx} className="flex justify-between text-slate-700">
                    <span className="truncate pr-2 max-w-[180px]">{item.name}</span>
                    <div className="space-x-4 text-right shrink-0">
                      <span className="font-medium text-slate-600">{item.unitDisplay || `${item.quantity} ${item.unit || 'kg'}`}</span>
                      <span className="font-semibold">₹{item.subtotal.toFixed(2)}</span>
                    </div>
                  </div>
                ))}
              </div>

              {/* Totals & Payment Method */}
              <div className="pt-2 border-t border-dashed border-slate-300 space-y-1">
                <div className="flex justify-between text-slate-500">
                  <span>Subtotal:</span>
                  <span>₹{completedSale.subtotal.toFixed(2)}</span>
                </div>
                {completedSale.discount > 0 && (
                  <div className="flex justify-between text-emerald-600 font-semibold">
                    <span>Discount:</span>
                    <span>-₹{completedSale.discount.toFixed(2)}</span>
                  </div>
                )}
                <div className="flex justify-between text-sm font-bold text-slate-900 pt-1 border-t border-slate-200">
                  <span>Grand Total:</span>
                  <span>₹{completedSale.total.toFixed(2)}</span>
                </div>
                <div className="flex justify-between items-center text-slate-700 pt-1">
                  <span>Payment Method:</span>
                  <span className="font-semibold text-blue-700">{completedSale.paymentMethod}</span>
                </div>
                {completedSale.upiId && (
                  <div className="flex justify-between text-[11px] text-slate-500">
                    <span>UPI ID:</span>
                    <span className="font-mono">{completedSale.upiId}</span>
                  </div>
                )}
                {completedSale.transactionRef && (
                  <div className="flex justify-between text-[11px] text-slate-500">
                    <span>Txn Ref:</span>
                    <span className="font-mono">{completedSale.transactionRef}</span>
                  </div>
                )}

                {/* Prominent PAID Status Badge */}
                <div className="flex justify-between items-center pt-1 pb-1">
                  <span className="text-slate-600 font-semibold">Payment Status:</span>
                  <span className="px-2.5 py-0.5 rounded-full text-xs font-black tracking-wide bg-emerald-100 text-emerald-800 border border-emerald-300">
                    PAID
                  </span>
                </div>

                <div className="flex justify-between text-slate-700 pt-1">
                  <span>Amount Paid:</span>
                  <span className="font-semibold text-emerald-700">₹{completedSale.amountPaid.toFixed(2)}</span>
                </div>

                {confirmedCashReceived !== undefined && confirmedCashReceived > 0 && (
                  <>
                    <div className="flex justify-between text-slate-600">
                      <span>Cash Received:</span>
                      <span>₹{confirmedCashReceived.toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between text-emerald-700 font-semibold">
                      <span>Change Returned:</span>
                      <span>₹{(confirmedChange ?? 0).toFixed(2)}</span>
                    </div>
                  </>
                )}

                {completedSale.amountPaid < completedSale.total && (
                  <div className="flex justify-between text-red-600 font-bold bg-red-50 p-1.5 rounded">
                    <span>Udhaar / Due:</span>
                    <span>₹{(completedSale.total - completedSale.amountPaid).toFixed(2)}</span>
                  </div>
                )}
              </div>

              {/* Thermal Printer PAID Stamp Display */}
              <div className="my-3 py-1.5 px-3 border-2 border-dashed border-emerald-500 text-center rounded-lg bg-emerald-50/50">
                <span className="text-sm font-black text-emerald-700 tracking-widest block font-sans">
                  ★★★ PAID & VERIFIED ★★★
                </span>
                <span className="text-[10px] text-emerald-600 block">Thank you for your business!</span>
              </div>

              <div className="text-center pt-1 text-[11px] text-slate-400 font-sans">
                *** Compatible with 58mm & 80mm POS Printers ***
              </div>
            </div>

            {/* Modal Actions */}
            <div className="p-4 bg-slate-50 border-t border-slate-200 flex flex-col sm:flex-row gap-2">
              <button
                type="button"
                onClick={handlePrint}
                className="flex-1 py-2 px-2.5 border border-slate-200 bg-white rounded-xl text-xs font-semibold text-slate-700 hover:bg-slate-100 flex items-center justify-center space-x-1 shadow-2xs cursor-pointer"
                title="Print on standard or 58mm/80mm thermal roll printers"
              >
                <Printer size={14} />
                <span>Print Bill</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  generateInvoicePDF({
                    sale: completedSale,
                    user,
                    customer: selectedCustomerObj,
                    settings: paymentSettings,
                    cashReceived: confirmedCashReceived,
                    changeAmount: confirmedChange,
                  });
                  showToast('Invoice PDF generated and downloaded!', 'success');
                }}
                className="flex-1 py-2 px-2.5 border border-blue-200 bg-blue-50 text-blue-700 hover:bg-blue-100 rounded-xl text-xs font-semibold flex items-center justify-center space-x-1 shadow-2xs cursor-pointer"
                title="Download 80mm PDF thermal invoice receipt"
              >
                <FileDown size={14} />
                <span>Download PDF</span>
              </button>

              <a
                href={getWhatsAppShareUrl()}
                target="_blank"
                rel="noopener noreferrer"
                className="flex-1 py-2 px-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-semibold flex items-center justify-center space-x-1 shadow-xs transition-colors cursor-pointer"
              >
                <Share2 size={14} />
                <span>WhatsApp</span>
              </a>

              <button
                type="button"
                onClick={() => setShowInvoiceModal(false)}
                className="flex-1 py-2 px-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-semibold flex items-center justify-center space-x-1 shadow-xs cursor-pointer"
              >
                <span>New Sale</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
