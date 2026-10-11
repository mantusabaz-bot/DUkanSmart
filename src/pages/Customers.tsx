import React, { useState, useMemo } from 'react';
import { useStore } from '../store';
import { 
  Plus, User, Phone, IndianRupee, MessageCircle, X, 
  Trash2, AlertTriangle, AlertCircle, CheckCircle2, Loader2, ShieldAlert
} from 'lucide-react';
import { format } from 'date-fns';
import { Customer } from '../types';

export default function Customers() {
  const { customers, payments, sales, user, addCustomer, recordPayment, deleteCustomer } = useStore();
  const [isCustomerModalOpen, setIsCustomerModalOpen] = useState(false);
  const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);
  const [selectedCustomerId, setSelectedCustomerId] = useState<string | null>(null);

  // Delete Customer State
  const [customerToDelete, setCustomerToDelete] = useState<Customer | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [toastMessage, setToastMessage] = useState<{ text: string; type: 'success' | 'error' | 'info' } | null>(null);

  const [customerData, setCustomerData] = useState({ name: '', phone: '', address: '' });
  const [paymentData, setPaymentData] = useState({ amount: '', method: 'Cash' });

  const showToast = (text: string, type: 'success' | 'error' | 'info' = 'info') => {
    setToastMessage({ text, type });
    setTimeout(() => {
      setToastMessage(prev => prev?.text === text ? null : prev);
    }, 3500);
  };

  // Only display non-archived active customers
  const activeCustomers = useMemo(() => {
    return customers.filter(c => !c.isArchived);
  }, [customers]);

  // Total Market Outstanding correctly recalculated from active customers
  const totalUdhaar = useMemo(() => {
    return activeCustomers.reduce((acc, c) => acc + (c.balance || 0), 0);
  }, [activeCustomers]);

  const handleAddCustomer = (e: React.FormEvent) => {
    e.preventDefault();
    addCustomer(customerData);
    setIsCustomerModalOpen(false);
    setCustomerData({ name: '', phone: '', address: '' });
    showToast('Customer created successfully!', 'success');
  };

  const handleRecordPayment = (e: React.FormEvent) => {
    e.preventDefault();
    if (selectedCustomerId) {
      recordPayment(selectedCustomerId, parseFloat(paymentData.amount), paymentData.method);
      showToast('Payment received and balance updated!', 'success');
    }
    setIsPaymentModalOpen(false);
    setPaymentData({ amount: '', method: 'Cash' });
    setSelectedCustomerId(null);
  };

  const openPaymentModal = (id: string) => {
    setSelectedCustomerId(id);
    setIsPaymentModalOpen(true);
  };

  const getWhatsAppReminderUrl = (phone: string, balance: number, name: string) => {
    const text = `Namaste ${name}, aapki dukaan ke account mein ₹${balance} ka payment abhi baaki hai. Kripya apni suvidha ke anusaar payment kar dein. Agar aap payment kar chuke hain, to kripya is message ko ignore karein. Dhanyavaad!`;
    return `https://wa.me/91${phone}?text=${encodeURIComponent(text)}`;
  };

  // Backend connected deletion handler
  const handleConfirmDelete = async () => {
    if (!customerToDelete) return;
    setIsDeleting(true);

    try {
      // 1. Call backend delete endpoint with shop owner authorization
      const response = await fetch(`/api/customers/${customerToDelete.id}`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          shopOwnerId: user?.id || 'default-owner',
        }),
      });

      const data = await response.json();
      if (!response.ok || !data.success) {
        throw new Error(data.error || 'Failed to delete customer.');
      }

      // 2. Delete customer in state / database storage
      // Keeps financial transactions safe: if customer has sales/payments, soft-archives record and clears market outstanding
      const success = deleteCustomer(customerToDelete.id);
      if (success) {
        showToast('Customer deleted successfully!', 'success');
        setCustomerToDelete(null);
      } else {
        throw new Error('Local update failed.');
      }
    } catch (err: any) {
      console.error('Error deleting customer:', err);
      showToast(err.message || 'Failed to delete customer. Please try again.', 'error');
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <div className="space-y-6 relative h-full flex flex-col">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-2xl font-bold text-gray-800">Udhaar Book (Customers)</h2>
          <p className="text-red-600 font-medium">Total Market Outstanding: ₹{totalUdhaar.toFixed(2)}</p>
        </div>
        <button 
          onClick={() => setIsCustomerModalOpen(true)}
          className="bg-blue-600 text-white px-4 py-2 rounded-lg flex items-center space-x-2 hover:bg-blue-700 shrink-0 w-full sm:w-auto justify-center cursor-pointer shadow-xs"
        >
          <Plus size={20} />
          <span>Add Customer</span>
        </button>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden flex-1 flex flex-col">
        <div className="overflow-x-auto flex-1">
          <table className="w-full text-left text-sm whitespace-nowrap">
            <thead className="bg-gray-50 text-gray-600 border-b border-gray-200">
              <tr>
                <th className="p-4 font-medium">Customer Name</th>
                <th className="p-4 font-medium">Contact</th>
                <th className="p-4 font-medium">Address</th>
                <th className="p-4 font-medium">Outstanding Udhaar</th>
                <th className="p-4 font-medium text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {activeCustomers.map(customer => (
                <tr key={customer.id} className="hover:bg-gray-50 transition-colors">
                  <td className="p-4 font-medium text-gray-900">
                    <div className="flex items-center space-x-2">
                      <div className="bg-blue-100 p-2 rounded-full text-blue-600"><User size={16}/></div>
                      <span>{customer.name}</span>
                    </div>
                  </td>
                  <td className="p-4 text-gray-600">
                    <div className="flex items-center space-x-2">
                      <Phone size={14} className="text-gray-400"/>
                      <span>{customer.phone}</span>
                    </div>
                  </td>
                  <td className="p-4 text-gray-500">{customer.address}</td>
                  <td className="p-4">
                    <span className={`font-bold ${customer.balance > 0 ? 'text-red-600' : 'text-green-600'}`}>
                      ₹{customer.balance.toFixed(2)}
                    </span>
                  </td>
                  <td className="p-4 text-right">
                    <div className="flex items-center justify-end space-x-1.5 flex-wrap gap-y-1">
                      {customer.balance > 0 && (
                        <>
                          <a 
                            href={getWhatsAppReminderUrl(customer.phone, customer.balance, customer.name)}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="px-2.5 py-1 bg-green-50 text-green-700 border border-green-200 rounded-lg text-xs hover:bg-green-100 inline-flex items-center space-x-1"
                            title="Send WhatsApp Reminder"
                          >
                            <MessageCircle size={13}/> <span>Remind</span>
                          </a>
                          <button 
                            onClick={() => openPaymentModal(customer.id)}
                            className="px-2.5 py-1 bg-blue-50 text-blue-700 border border-blue-200 rounded-lg text-xs hover:bg-blue-100 inline-flex items-center space-x-1 cursor-pointer"
                            title="Receive Udhaar Payment"
                          >
                            <IndianRupee size={13}/> <span>Receive</span>
                          </button>
                        </>
                      )}
                      
                      {/* Delete Customer Button */}
                      <button
                        onClick={() => setCustomerToDelete(customer)}
                        className="px-2 py-1 text-red-600 hover:text-red-700 hover:bg-red-50 border border-red-200 rounded-lg text-xs inline-flex items-center space-x-1 transition-colors cursor-pointer"
                        title="Delete customer from Udhaar Book"
                        aria-label={`Delete customer ${customer.name}`}
                      >
                        <Trash2 size={13} />
                        <span className="hidden sm:inline">Delete</span>
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
              {activeCustomers.length === 0 && (
                <tr>
                  <td colSpan={5} className="p-8 text-center text-gray-500">
                    No customers found. Add a customer to start tracking Udhaar.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Add Customer Modal */}
      {isCustomerModalOpen && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50 animate-in fade-in">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-md">
            <div className="flex justify-between items-center p-4 border-b border-gray-100">
              <h3 className="font-bold text-lg">Add New Customer</h3>
              <button onClick={() => setIsCustomerModalOpen(false)} className="text-gray-400 hover:text-gray-600 cursor-pointer"><X size={20}/></button>
            </div>
            <form onSubmit={handleAddCustomer} className="p-4 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Customer Name</label>
                <input required type="text" className="w-full border border-gray-300 rounded-lg p-2 focus:ring-blue-500" value={customerData.name} onChange={e=>setCustomerData({...customerData, name: e.target.value})} />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Mobile Number</label>
                <input required type="tel" className="w-full border border-gray-300 rounded-lg p-2 focus:ring-blue-500" value={customerData.phone} onChange={e=>setCustomerData({...customerData, phone: e.target.value})} />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Address</label>
                <textarea required className="w-full border border-gray-300 rounded-lg p-2 focus:ring-blue-500" rows={2} value={customerData.address} onChange={e=>setCustomerData({...customerData, address: e.target.value})} />
              </div>
              <div className="pt-4 flex justify-end space-x-2">
                <button type="button" onClick={() => setIsCustomerModalOpen(false)} className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 cursor-pointer">Cancel</button>
                <button type="submit" className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 cursor-pointer">Save Customer</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Record Payment Modal */}
      {isPaymentModalOpen && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50 animate-in fade-in">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-sm">
            <div className="flex justify-between items-center p-4 border-b border-gray-100">
              <h3 className="font-bold text-lg">Receive Payment</h3>
              <button onClick={() => setIsPaymentModalOpen(false)} className="text-gray-400 hover:text-gray-600 cursor-pointer"><X size={20}/></button>
            </div>
            <form onSubmit={handleRecordPayment} className="p-4 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Amount Received (₹)</label>
                <input required type="number" step="0.01" className="w-full border border-gray-300 rounded-lg p-2 focus:ring-blue-500" value={paymentData.amount} onChange={e=>setPaymentData({...paymentData, amount: e.target.value})} />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Payment Method</label>
                <select className="w-full border border-gray-300 rounded-lg p-2 focus:ring-blue-500" value={paymentData.method} onChange={e=>setPaymentData({...paymentData, method: e.target.value})}>
                  <option value="Cash">Cash</option>
                  <option value="UPI">UPI</option>
                  <option value="Bank Transfer">Bank Transfer</option>
                </select>
              </div>
              <div className="pt-4 flex justify-end space-x-2">
                <button type="button" onClick={() => setIsPaymentModalOpen(false)} className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 cursor-pointer">Cancel</button>
                <button type="submit" className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 cursor-pointer">Record Payment</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Customer Confirmation Modal */}
      {customerToDelete && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-in fade-in">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm overflow-hidden animate-in zoom-in-95 border border-slate-100">
            {/* Header */}
            <div className="p-5 text-center">
              <div className="w-12 h-12 rounded-full bg-red-100 text-red-600 mx-auto flex items-center justify-center mb-3">
                <Trash2 size={24} />
              </div>
              <h3 className="text-base font-bold text-gray-900">Delete Customer</h3>
              <p className="text-xs text-gray-600 mt-2 font-medium">
                Are you sure you want to delete this customer and their Udhaar record?
              </p>

              {/* Customer Details Box */}
              <div className="mt-3 p-3 bg-slate-50 border border-slate-200 rounded-xl text-xs text-left space-y-1.5">
                <div className="flex justify-between">
                  <span className="text-gray-500">Name:</span>
                  <span className="font-bold text-gray-800">{customerToDelete.name}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">Contact:</span>
                  <span className="font-medium text-gray-700">{customerToDelete.phone}</span>
                </div>
                {customerToDelete.address && (
                  <div className="flex justify-between">
                    <span className="text-gray-500">Address:</span>
                    <span className="text-gray-600 truncate max-w-[170px]">{customerToDelete.address}</span>
                  </div>
                )}
                <div className="flex justify-between pt-1 border-t border-slate-200">
                  <span className="text-gray-500 font-medium">Pending Due:</span>
                  <span className={`font-bold ${customerToDelete.balance > 0 ? 'text-red-600' : 'text-green-600'}`}>
                    ₹{customerToDelete.balance.toFixed(2)}
                  </span>
                </div>
              </div>

              {/* Outstanding Due Warning */}
              {customerToDelete.balance > 0 && (
                <div className="mt-3 p-2.5 bg-red-50 border border-red-200 rounded-lg text-xs text-red-800 text-left flex items-start space-x-2">
                  <AlertTriangle size={16} className="text-red-600 shrink-0 mt-0.5" />
                  <div>
                    <span className="font-bold">Pending Dues Warning:</span> This customer has an outstanding balance of <span className="font-bold">₹{customerToDelete.balance.toFixed(2)}</span>.
                  </div>
                </div>
              )}

              {/* Financial Transaction History Safety Notice */}
              {(sales.some(s => s.customerId === customerToDelete.id) || payments.some(p => p.customerId === customerToDelete.id)) && (
                <div className="mt-2.5 p-2 bg-blue-50 border border-blue-200 rounded-lg text-[11px] text-blue-800 text-left flex items-start space-x-1.5">
                  <ShieldAlert size={14} className="text-blue-600 shrink-0 mt-0.5" />
                  <span>
                    Past sales & payment receipts are securely preserved for accounting and audits.
                  </span>
                </div>
              )}
            </div>

            {/* Actions */}
            <div className="p-4 bg-gray-50 border-t border-gray-200 flex space-x-2.5">
              <button
                type="button"
                disabled={isDeleting}
                onClick={() => setCustomerToDelete(null)}
                className="flex-1 py-2.5 px-4 border border-gray-300 bg-white hover:bg-gray-100 text-gray-700 rounded-xl text-xs font-bold transition-colors cursor-pointer disabled:opacity-50"
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
                    <span>Confirm Delete</span>
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

