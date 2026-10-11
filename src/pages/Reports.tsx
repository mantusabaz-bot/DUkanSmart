import React, { useState, useMemo } from 'react';
import { useStore } from '../store';
import { format } from 'date-fns';
import { 
  FileText, Download, Printer, QrCode, Search, Filter, 
  CheckCircle2, AlertCircle, Eye, X, Share2, Trash2, AlertTriangle, Loader2 
} from 'lucide-react';
import { Sale } from '../types';

export default function Reports() {
  const { sales, customers, user, paymentSettings, deleteSale } = useStore();
  const [searchTerm, setSearchTerm] = useState('');
  const [methodFilter, setMethodFilter] = useState<'All' | 'UPI' | 'Cash' | 'Card' | 'Udhaar'>('All');
  const [selectedSale, setSelectedSale] = useState<Sale | null>(null);

  // Delete Bill Confirmation Modal State
  const [billToDelete, setBillToDelete] = useState<Sale | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [toastMessage, setToastMessage] = useState<{ text: string; type: 'success' | 'error' | 'info' } | null>(null);

  const showToast = (text: string, type: 'success' | 'error' | 'info' = 'info') => {
    setToastMessage({ text, type });
    setTimeout(() => {
      setToastMessage(prev => prev?.text === text ? null : prev);
    }, 3500);
  };

  const isUpi = (method: string) => ['UPI', 'UPI QR', 'Google Pay', 'PhonePe', 'Paytm', 'Other UPI'].includes(method);

  const totalSales = sales.reduce((acc, sale) => acc + (sale.total || 0), 0);
  const totalPaid = sales.reduce((acc, sale) => acc + (sale.amountPaid || 0), 0);
  const totalUpiPaid = sales.filter(s => isUpi(s.paymentMethod)).reduce((acc, s) => acc + (s.amountPaid || 0), 0);
  const totalCashPaid = sales.filter(s => s.paymentMethod === 'Cash').reduce((acc, s) => acc + (s.amountPaid || 0), 0);
  const totalUdhaar = Math.max(0, totalSales - totalPaid);

  const filteredSales = useMemo(() => {
    return sales
      .filter(s => {
        const query = searchTerm.toLowerCase().trim();
        const customer = customers.find(c => c.id === s.customerId);
        const customerName = customer?.name.toLowerCase() || '';
        const orderNum = (s.orderNumber || s.id).toLowerCase();
        const matchesSearch = !query || orderNum.includes(query) || customerName.includes(query) || s.items.some(i => i.name.toLowerCase().includes(query));

        let matchesMethod = true;
        if (methodFilter === 'UPI') matchesMethod = isUpi(s.paymentMethod);
        else if (methodFilter === 'Cash') matchesMethod = s.paymentMethod === 'Cash';
        else if (methodFilter === 'Card') matchesMethod = s.paymentMethod === 'Card';
        else if (methodFilter === 'Udhaar') matchesMethod = s.amountPaid < s.total;

        return matchesSearch && matchesMethod;
      })
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }, [sales, searchTerm, methodFilter, customers]);

  const downloadReceipt = (sale: Sale) => {
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
  };

  const handleConfirmDelete = async () => {
    if (!billToDelete) return;
    setIsDeleting(true);

    try {
      // 1. Backend verification & authorization check
      const res = await fetch(`/api/bills/${billToDelete.id}`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          shopOwnerId: user?.id || 'default-owner',
          orderNumber: billToDelete.orderNumber,
        }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Failed to delete bill on server.');
      }

      // 2. Persist deletion in state and database storage
      const success = deleteSale(billToDelete.id);
      if (success) {
        showToast('Bill deleted successfully.', 'success');
        setBillToDelete(null);
        if (selectedSale?.id === billToDelete.id) {
          setSelectedSale(null);
        }
      } else {
        throw new Error('Failed to update local records.');
      }
    } catch (err: any) {
      console.error('Error deleting bill:', err);
      showToast(err.message || 'Error deleting bill. Please try again.', 'error');
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 bg-white p-4 rounded-xl border border-slate-200 shadow-2xs">
        <div>
          <h2 className="text-2xl font-bold text-slate-800">Sales History & Invoices</h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Complete transaction ledger with UPI, Cash, Card, and Udhaar audit trail
          </p>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
          <p className="text-xs text-slate-500 font-semibold uppercase tracking-wider">Total Sales Billed</p>
          <h3 className="text-2xl font-bold text-slate-900 mt-1">₹{totalSales.toFixed(2)}</h3>
          <p className="text-[11px] text-slate-400 mt-1">{sales.length} total orders recorded</p>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
          <p className="text-xs text-blue-600 font-semibold uppercase tracking-wider flex items-center space-x-1">
            <QrCode size={14} />
            <span>UPI Digital Payments</span>
          </p>
          <h3 className="text-2xl font-bold text-blue-700 mt-1">₹{totalUpiPaid.toFixed(2)}</h3>
          <p className="text-[11px] text-slate-400 mt-1">GPay, PhonePe, Paytm, QR</p>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
          <p className="text-xs text-emerald-600 font-semibold uppercase tracking-wider">Cash Received</p>
          <h3 className="text-2xl font-bold text-emerald-700 mt-1">₹{totalCashPaid.toFixed(2)}</h3>
          <p className="text-[11px] text-slate-400 mt-1">Physical currency collected</p>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
          <p className="text-xs text-red-600 font-semibold uppercase tracking-wider">Outstanding Udhaar</p>
          <h3 className="text-2xl font-bold text-red-600 mt-1">₹{totalUdhaar.toFixed(2)}</h3>
          <p className="text-[11px] text-slate-400 mt-1">Credit pending from customers</p>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs flex flex-col sm:flex-row gap-3 justify-between items-center">
        <div className="relative w-full sm:w-80">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400 h-4 w-4" />
          <input
            type="text"
            placeholder="Search by order #, customer, item..."
            className="w-full pl-9 pr-4 py-2 border border-slate-200 rounded-lg text-xs focus:outline-none focus:ring-1 focus:ring-blue-500"
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
          />
        </div>

        <div className="flex items-center space-x-1.5 w-full sm:w-auto overflow-x-auto pb-1 sm:pb-0">
          {[
            { id: 'All', label: 'All Bills' },
            { id: 'UPI', label: '📲 UPI Digital' },
            { id: 'Cash', label: '💵 Cash' },
            { id: 'Card', label: '💳 Card' },
            { id: 'Udhaar', label: '⚠️ Udhaar' },
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => setMethodFilter(tab.id as any)}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-colors cursor-pointer ${
                methodFilter === tab.id
                  ? 'bg-blue-600 text-white shadow-2xs'
                  : 'bg-slate-100 hover:bg-slate-200 text-slate-600'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* Orders Table */}
      <div className="bg-white rounded-xl shadow-xs border border-slate-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs whitespace-nowrap">
            <thead className="bg-slate-50 text-slate-600 border-b border-slate-200 font-semibold">
              <tr>
                <th className="p-3.5">Order Number</th>
                <th className="p-3.5">Date & Time</th>
                <th className="p-3.5">Customer / Items</th>
                <th className="p-3.5 text-right">Total Bill</th>
                <th className="p-3.5 text-right">Amount Paid</th>
                <th className="p-3.5">Payment Method</th>
                <th className="p-3.5">Status</th>
                <th className="p-3.5 text-center">Receipt</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 font-medium">
              {filteredSales.map(sale => {
                const isUdhaar = sale.amountPaid < sale.total;
                const customer = customers.find(c => c.id === sale.customerId);
                const orderCode = sale.orderNumber || sale.id.slice(0, 8).toUpperCase();

                return (
                  <tr key={sale.id} className="hover:bg-slate-50/80 transition-colors">
                    <td className="p-3.5 font-mono font-bold text-blue-700">
                      {orderCode}
                    </td>
                    <td className="p-3.5 text-slate-500">
                      {format(new Date(sale.date), 'dd MMM yyyy, hh:mm a')}
                    </td>
                    <td className="p-3.5">
                      <div className="max-w-[220px] truncate">
                        <span className="font-bold text-slate-800">
                          {customer ? customer.name : 'Walk-in Customer'}
                        </span>
                        <p className="text-[11px] text-slate-400 truncate">
                          {sale.items.map(i => `${i.name} (${i.unitDisplay || i.quantity})`).join(', ')}
                        </p>
                      </div>
                    </td>
                    <td className="p-3.5 text-right font-bold text-slate-900">
                      ₹{sale.total.toFixed(2)}
                    </td>
                    <td className="p-3.5 text-right font-semibold text-emerald-700">
                      ₹{sale.amountPaid.toFixed(2)}
                    </td>
                    <td className="p-3.5">
                      <span className={`inline-flex items-center space-x-1 px-2 py-0.5 rounded-full text-[11px] font-semibold ${
                        isUpi(sale.paymentMethod) 
                          ? 'bg-blue-50 text-blue-700 border border-blue-200' 
                          : sale.paymentMethod === 'Cash'
                          ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                          : 'bg-purple-50 text-purple-700 border border-purple-200'
                      }`}>
                        <span>{isUpi(sale.paymentMethod) ? '📲' : sale.paymentMethod === 'Cash' ? '💵' : '💳'}</span>
                        <span>{sale.paymentMethod}</span>
                      </span>
                    </td>
                    <td className="p-3.5">
                      <span className={`px-2 py-0.5 rounded-full text-[11px] font-bold ${
                        isUdhaar 
                          ? 'bg-orange-100 text-orange-800' 
                          : 'bg-emerald-100 text-emerald-800'
                      }`}>
                        {isUdhaar ? `Udhaar (₹${(sale.total - sale.amountPaid).toFixed(2)})` : 'Paid'}
                      </span>
                    </td>
                    <td className="p-3.5 text-center">
                      <div className="flex items-center justify-center space-x-1">
                        <button
                          onClick={() => setSelectedSale(sale)}
                          className="p-1.5 text-slate-500 hover:text-blue-600 hover:bg-blue-50 rounded cursor-pointer transition-colors"
                          title="View Receipt"
                          aria-label="View Receipt"
                        >
                          <Eye size={15} />
                        </button>
                        <button
                          onClick={() => downloadReceipt(sale)}
                          className="p-1.5 text-slate-500 hover:text-emerald-600 hover:bg-emerald-50 rounded cursor-pointer transition-colors"
                          title="Download Receipt"
                          aria-label="Download Receipt"
                        >
                          <Download size={15} />
                        </button>
                        <button
                          onClick={() => setBillToDelete(sale)}
                          className="p-1.5 text-red-500 hover:text-red-700 hover:bg-red-50 rounded cursor-pointer transition-colors"
                          title="Delete Bill"
                          aria-label="Delete Bill"
                        >
                          <Trash2 size={15} />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}

              {filteredSales.length === 0 && (
                <tr>
                  <td colSpan={8} className="p-10 text-center text-slate-400">
                    <FileText size={36} className="mx-auto text-slate-300 mb-2" />
                    <p className="font-semibold text-slate-600">No invoices found matching criteria.</p>
                    <p className="text-[11px] text-slate-400 mt-0.5">Complete a sale in POS to record your first transaction.</p>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* View Past Invoice Modal */}
      {selectedSale && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-xs z-50 flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden animate-in fade-in zoom-in-95 my-8">
            <div className="bg-gradient-to-r from-blue-600 to-blue-700 text-white p-4 flex justify-between items-center">
              <div>
                <h3 className="font-bold text-base">Invoice #{selectedSale.orderNumber || selectedSale.id.slice(0, 8).toUpperCase()}</h3>
                <p className="text-xs text-blue-100">{format(new Date(selectedSale.date), 'dd/MM/yyyy • hh:mm a')}</p>
              </div>
              <button 
                onClick={() => setSelectedSale(null)} 
                className="text-white/80 hover:text-white p-1 rounded-lg hover:bg-white/10 cursor-pointer"
              >
                <X size={20} />
              </button>
            </div>

            <div className="p-5 space-y-4 bg-white text-slate-800 text-xs font-mono">
              <div className="text-center pb-3 border-b border-dashed border-slate-300">
                <h2 className="text-base font-bold text-slate-900 font-sans">{user?.shopName || paymentSettings.businessName || 'DukaanSmart Store'}</h2>
                <p className="text-[11px] text-slate-500 font-sans">Authorized Retail Merchant</p>
                <p className="text-[11px] text-slate-600 font-bold mt-1 font-sans">Order Ref: {selectedSale.orderNumber || selectedSale.id.slice(0, 8).toUpperCase()}</p>
              </div>

              {/* Items List */}
              <div className="space-y-1.5">
                <div className="flex justify-between font-bold text-slate-600 border-b border-slate-200 pb-1">
                  <span>ITEM</span>
                  <div className="space-x-4">
                    <span>QTY</span>
                    <span>TOTAL</span>
                  </div>
                </div>
                {selectedSale.items.map((item, idx) => (
                  <div key={idx} className="flex justify-between text-slate-700">
                    <span className="truncate pr-2 max-w-[180px]">{item.name}</span>
                    <div className="space-x-4 text-right shrink-0">
                      <span className="font-medium text-slate-600">{item.unitDisplay || `${item.quantity} ${item.unit || 'kg'}`}</span>
                      <span className="font-semibold">₹{item.subtotal.toFixed(2)}</span>
                    </div>
                  </div>
                ))}
              </div>

              {/* Totals */}
              <div className="pt-2 border-t border-dashed border-slate-300 space-y-1">
                <div className="flex justify-between text-slate-500">
                  <span>Subtotal:</span>
                  <span>₹{selectedSale.subtotal.toFixed(2)}</span>
                </div>
                {selectedSale.discount > 0 && (
                  <div className="flex justify-between text-emerald-600 font-semibold">
                    <span>Discount:</span>
                    <span>-₹{selectedSale.discount.toFixed(2)}</span>
                  </div>
                )}
                <div className="flex justify-between text-sm font-bold text-slate-900 pt-1 border-t border-slate-200">
                  <span>Grand Total:</span>
                  <span>₹{selectedSale.total.toFixed(2)}</span>
                </div>
                <div className="flex justify-between items-center text-slate-700 pt-1">
                  <span>Payment Method:</span>
                  <span className="font-semibold text-blue-700">{selectedSale.paymentMethod}</span>
                </div>
                {selectedSale.upiId && (
                  <div className="flex justify-between text-[11px] text-slate-500">
                    <span>UPI ID:</span>
                    <span className="font-mono">{selectedSale.upiId}</span>
                  </div>
                )}
                <div className="flex justify-between text-slate-700 pt-1">
                  <span>Amount Paid:</span>
                  <span className="font-semibold text-emerald-700">₹{selectedSale.amountPaid.toFixed(2)}</span>
                </div>
                {selectedSale.amountPaid < selectedSale.total && (
                  <div className="flex justify-between text-red-600 font-bold bg-red-50 p-1.5 rounded">
                    <span>Udhaar / Due:</span>
                    <span>₹{(selectedSale.total - selectedSale.amountPaid).toFixed(2)}</span>
                  </div>
                )}
              </div>
            </div>

            <div className="p-4 bg-slate-50 border-t border-slate-200 flex space-x-2">
              <button
                onClick={() => window.print()}
                className="flex-1 py-2 px-3 border border-slate-200 bg-white rounded-xl text-xs font-semibold text-slate-700 hover:bg-slate-100 flex items-center justify-center space-x-1.5 cursor-pointer"
              >
                <Printer size={14} />
                <span>Print</span>
              </button>
              <button
                onClick={() => downloadReceipt(selectedSale)}
                className="flex-1 py-2 px-3 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-semibold flex items-center justify-center space-x-1.5 cursor-pointer shadow-xs"
              >
                <Download size={14} />
                <span>Download</span>
              </button>
              <button
                onClick={() => {
                  const sale = selectedSale;
                  setBillToDelete(sale);
                }}
                className="py-2 px-3 bg-red-50 hover:bg-red-100 text-red-600 border border-red-200 rounded-xl text-xs font-semibold flex items-center justify-center space-x-1 cursor-pointer"
                title="Delete Bill"
              >
                <Trash2 size={14} />
                <span>Delete</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* DELETE BILL CONFIRMATION DIALOG MODAL */}
      {billToDelete && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-xs z-50 flex items-center justify-center p-4 animate-in fade-in">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm overflow-hidden animate-in zoom-in-95 border border-slate-100">
            {/* Header */}
            <div className="p-5 text-center">
              <div className="w-12 h-12 rounded-full bg-red-100 text-red-600 mx-auto flex items-center justify-center mb-3">
                <Trash2 size={24} />
              </div>
              <h3 className="text-base font-bold text-slate-900">Delete Bill Confirmation</h3>
              <p className="text-xs text-slate-600 mt-2">
                Are you sure you want to delete this bill?
              </p>
              
              {/* Bill Details Box */}
              <div className="mt-3 p-3 bg-slate-50 border border-slate-200 rounded-xl text-xs text-left space-y-1">
                <div className="flex justify-between">
                  <span className="text-slate-500">Order Ref:</span>
                  <span className="font-mono font-bold text-slate-800">
                    {billToDelete.orderNumber || billToDelete.id.slice(0, 8).toUpperCase()}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Total Bill:</span>
                  <span className="font-bold text-slate-900">₹{billToDelete.total.toFixed(2)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Payment:</span>
                  <span className="font-medium text-slate-700">{billToDelete.paymentMethod}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Date:</span>
                  <span className="text-slate-600">{format(new Date(billToDelete.date), 'dd/MM/yyyy')}</span>
                </div>
              </div>

              <p className="text-[11px] text-amber-700 bg-amber-50 border border-amber-200 rounded-lg p-2 mt-3 text-left">
                ⚠️ This bill will be permanently removed from reports and sales records.
              </p>
            </div>

            {/* Actions */}
            <div className="p-4 bg-slate-50 border-t border-slate-200 flex space-x-2.5">
              <button
                type="button"
                disabled={isDeleting}
                onClick={() => setBillToDelete(null)}
                className="flex-1 py-2.5 px-4 border border-slate-300 bg-white hover:bg-slate-100 text-slate-700 rounded-xl text-xs font-bold transition-colors cursor-pointer disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={isDeleting}
                onClick={handleConfirmDelete}
                className="flex-1 py-2.5 px-4 bg-red-600 hover:bg-red-700 text-white rounded-xl text-xs font-bold transition-all shadow-sm shadow-red-600/25 flex items-center justify-center space-x-1.5 cursor-pointer disabled:opacity-50"
              >
                {isDeleting ? (
                  <>
                    <Loader2 size={14} className="animate-spin" />
                    <span>Deleting...</span>
                  </>
                ) : (
                  <>
                    <Trash2 size={14} />
                    <span>Delete</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Toast Notification Banner */}
      {toastMessage && (
        <div className="fixed bottom-5 right-5 z-50 animate-in slide-in-from-bottom-5">
          <div className={`px-4 py-3 rounded-xl shadow-lg border flex items-center space-x-2 text-xs font-bold ${
            toastMessage.type === 'success'
              ? 'bg-emerald-600 text-white border-emerald-500'
              : toastMessage.type === 'error'
              ? 'bg-red-600 text-white border-red-500'
              : 'bg-blue-600 text-white border-blue-500'
          }`}>
            {toastMessage.type === 'success' ? (
              <CheckCircle2 size={16} />
            ) : toastMessage.type === 'error' ? (
              <AlertCircle size={16} />
            ) : (
              <AlertTriangle size={16} />
            )}
            <span>{toastMessage.text}</span>
          </div>
        </div>
      )}
    </div>
  );
}
