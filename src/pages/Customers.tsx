import React, { useState } from 'react';
import { useStore } from '../store';
import { Plus, User, Phone, IndianRupee, MessageCircle, X } from 'lucide-react';
import { format } from 'date-fns';

export default function Customers() {
  const { customers, payments, addCustomer, recordPayment } = useStore();
  const [isCustomerModalOpen, setIsCustomerModalOpen] = useState(false);
  const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);
  const [selectedCustomerId, setSelectedCustomerId] = useState<string | null>(null);

  const [customerData, setCustomerData] = useState({ name: '', phone: '', address: '' });
  const [paymentData, setPaymentData] = useState({ amount: '', method: 'Cash' });

  const totalUdhaar = customers.reduce((acc, c) => acc + c.balance, 0);

  const handleAddCustomer = (e: React.FormEvent) => {
    e.preventDefault();
    addCustomer(customerData);
    setIsCustomerModalOpen(false);
    setCustomerData({ name: '', phone: '', address: '' });
  };

  const handleRecordPayment = (e: React.FormEvent) => {
    e.preventDefault();
    if (selectedCustomerId) {
      recordPayment(selectedCustomerId, parseFloat(paymentData.amount), paymentData.method);
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

  return (
    <div className="space-y-6 relative h-full flex flex-col">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-2xl font-bold text-gray-800">Udhaar Book (Customers)</h2>
          <p className="text-red-600 font-medium">Total Market Outstanding: ₹{totalUdhaar.toFixed(2)}</p>
        </div>
        <button 
          onClick={() => setIsCustomerModalOpen(true)}
          className="bg-blue-600 text-white px-4 py-2 rounded-lg flex items-center space-x-2 hover:bg-blue-700 shrink-0 w-full sm:w-auto justify-center"
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
              {customers.map(customer => (
                <tr key={customer.id} className="hover:bg-gray-50">
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
                  <td className="p-4 text-right space-x-2">
                    {customer.balance > 0 && (
                      <>
                        <a 
                          href={getWhatsAppReminderUrl(customer.phone, customer.balance, customer.name)}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="px-3 py-1 bg-green-50 text-green-700 border border-green-200 rounded-lg text-xs hover:bg-green-100 inline-flex items-center space-x-1"
                        >
                          <MessageCircle size={14}/> <span>Remind</span>
                        </a>
                        <button 
                          onClick={() => openPaymentModal(customer.id)}
                          className="px-3 py-1 bg-blue-50 text-blue-700 border border-blue-200 rounded-lg text-xs hover:bg-blue-100 inline-flex items-center space-x-1 cursor-pointer"
                        >
                          <IndianRupee size={14}/> <span>Receive</span>
                        </button>
                      </>
                    )}
                  </td>
                </tr>
              ))}
              {customers.length === 0 && (
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
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-md">
            <div className="flex justify-between items-center p-4 border-b border-gray-100">
              <h3 className="font-bold text-lg">Add New Customer</h3>
              <button onClick={() => setIsCustomerModalOpen(false)} className="text-gray-400 hover:text-gray-600"><X size={20}/></button>
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
                <button type="button" onClick={() => setIsCustomerModalOpen(false)} className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700">Cancel</button>
                <button type="submit" className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700">Save Customer</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Record Payment Modal */}
      {isPaymentModalOpen && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-sm">
            <div className="flex justify-between items-center p-4 border-b border-gray-100">
              <h3 className="font-bold text-lg">Receive Payment</h3>
              <button onClick={() => setIsPaymentModalOpen(false)} className="text-gray-400 hover:text-gray-600"><X size={20}/></button>
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
                <button type="button" onClick={() => setIsPaymentModalOpen(false)} className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700">Cancel</button>
                <button type="submit" className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700">Record Payment</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
