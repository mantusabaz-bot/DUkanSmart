import React, { useState, useEffect } from 'react';
import { useStore } from '../store';
import { 
  CreditCard, QrCode, Upload, Check, AlertCircle, Sparkles, 
  Settings, Smartphone, Building, ShieldCheck, RefreshCw, Trash2, Eye
} from 'lucide-react';
import { QRCodeDisplay } from '../components/QRCodeDisplay';
import { PaymentSettings as IPaymentSettings } from '../types';

export default function PaymentSettings() {
  const { paymentSettings, updatePaymentSettings, user } = useStore();

  const [formData, setFormData] = useState<IPaymentSettings>({
    ...paymentSettings,
    businessName: paymentSettings?.businessName || user?.shopName || 'DukaanSmart Store',
  });

  // Keep formData synchronized if store updates
  useEffect(() => {
    if (paymentSettings) {
      setFormData(prev => ({
        ...prev,
        ...paymentSettings,
        businessName: paymentSettings.businessName || user?.shopName || prev.businessName || 'DukaanSmart Store'
      }));
    }
  }, [paymentSettings, user?.shopName]);

  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [testAmount, setTestAmount] = useState<number>(150);
  // Mobile responsive view mode tab: 'settings' or 'qr_preview'
  const [mobileTab, setMobileTab] = useState<'qr_preview' | 'settings'>('qr_preview');

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(prev => prev === msg ? null : prev), 3500);
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      showToast('Please select a valid image file (PNG, JPG, WebP)');
      return;
    }

    if (file.size > 2 * 1024 * 1024) {
      showToast('Image size exceeds 2MB limit. Please upload a smaller image.');
      return;
    }

    const reader = new FileReader();
    reader.onload = (uploadEvent) => {
      const base64 = uploadEvent.target?.result as string;
      setFormData(prev => ({
        ...prev,
        customQrImageUrl: base64,
        qrCodeType: 'custom_upload'
      }));
      showToast('Official QR Code image uploaded!');
    };
    reader.readAsDataURL(file);
  };

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.upiId.trim()) {
      showToast('Please enter a valid Registered UPI ID (VPA)');
      return;
    }

    updatePaymentSettings(formData);
    showToast('Payment settings saved successfully!');
  };

  const handleToggleMethod = (key: keyof IPaymentSettings['methodsEnabled']) => {
    setFormData(prev => ({
      ...prev,
      methodsEnabled: {
        ...prev.methodsEnabled,
        [key]: !prev.methodsEnabled[key]
      }
    }));
  };

  return (
    <div className="space-y-4 sm:space-y-6 max-w-6xl mx-auto pb-10">
      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed top-4 right-4 z-50 flex items-center space-x-2 px-4 py-3 rounded-xl shadow-lg border text-sm font-medium bg-emerald-50 text-emerald-800 border-emerald-200 animate-in fade-in slide-in-from-top-2">
          <Check size={18} className="text-emerald-600 shrink-0" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 bg-white p-4 sm:p-5 rounded-2xl border border-slate-200 shadow-2xs">
        <div>
          <div className="flex items-center space-x-2">
            <div className="bg-blue-600 p-2 rounded-xl text-white shadow-xs">
              <QrCode size={20} />
            </div>
            <div>
              <h2 className="text-xl sm:text-2xl font-black text-slate-800 tracking-tight">Payment QR & UPI Settings</h2>
              <p className="text-xs text-slate-500 mt-0.5">
                Configure your official UPI ID, customer payment QR code, and digital billing
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center space-x-2 w-full sm:w-auto justify-between sm:justify-end">
          <span className="text-xs px-3 py-1 bg-blue-50 text-blue-700 font-semibold rounded-full border border-blue-200 flex items-center space-x-1">
            <ShieldCheck size={14} className="text-blue-600 shrink-0" />
            <span className="truncate max-w-[180px]">{user?.shopName || 'Verified Store'}</span>
          </span>
        </div>
      </div>

      {/* Mobile Tab Switcher (Visible on small screens only) */}
      <div className="lg:hidden flex bg-slate-200/80 p-1 rounded-xl text-xs font-bold">
        <button
          type="button"
          onClick={() => setMobileTab('qr_preview')}
          className={`flex-1 py-2 rounded-lg flex items-center justify-center space-x-1.5 transition-all ${
            mobileTab === 'qr_preview' 
              ? 'bg-white text-blue-700 shadow-xs' 
              : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          <QrCode size={15} />
          <span>Payment QR Code</span>
        </button>
        <button
          type="button"
          onClick={() => setMobileTab('settings')}
          className={`flex-1 py-2 rounded-lg flex items-center justify-center space-x-1.5 transition-all ${
            mobileTab === 'settings' 
              ? 'bg-white text-blue-700 shadow-xs' 
              : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          <Settings size={15} />
          <span>UPI Settings</span>
        </button>
      </div>

      {/* Main Grid: Settings (left) & QR Live Display (right) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* Right Column / Mobile Top: QR Code Display Card */}
        {/* On mobile, shown prominently when mobileTab === 'qr_preview' */}
        <div className={`lg:col-span-5 space-y-4 ${mobileTab === 'settings' ? 'hidden lg:block' : 'block'}`}>
          <div className="bg-white p-3.5 rounded-2xl border border-slate-200 shadow-2xs flex items-center justify-between">
            <div className="flex items-center space-x-1.5 text-xs font-bold text-slate-800">
              <Sparkles size={15} className="text-amber-500 shrink-0" />
              <span>Customer Payment QR Code</span>
            </div>
            <div className="flex items-center space-x-1 text-xs">
              <span className="text-slate-500 text-[11px] font-medium">Test Bill:</span>
              <div className="relative">
                <span className="absolute left-1.5 top-0.5 text-slate-400 font-bold text-[11px]">₹</span>
                <input 
                  type="number" 
                  value={testAmount} 
                  onChange={e => setTestAmount(Math.max(1, parseFloat(e.target.value) || 1))}
                  className="w-16 pl-4 pr-1.5 py-0.5 text-xs bg-slate-50 border border-slate-300 rounded font-bold text-right focus:bg-white focus:outline-none"
                />
              </div>
            </div>
          </div>

          {/* Fully Responsive Centered QR Card */}
          <div className="w-full flex justify-center">
            <QRCodeDisplay 
              amount={testAmount}
              orderNumber={`${formData.invoicePrefix || 'DS'}-${formData.nextInvoiceNumber || 1001}`}
              settings={formData}
              className="w-full max-w-md mx-auto"
            />
          </div>

          <div className="bg-white p-4 rounded-2xl border border-slate-200 text-xs space-y-2 text-slate-600 shadow-2xs">
            <h4 className="font-bold text-slate-800 text-xs flex items-center space-x-1.5">
              <ShieldCheck size={14} className="text-emerald-600" />
              <span>Direct Bank Payments</span>
            </h4>
            <p className="text-[11px] leading-relaxed text-slate-500">
              Customer payments made through this QR code go directly into your registered bank account with 0% gateway commission. Compatible with Google Pay, PhonePe, Paytm, BHIM, and all UPI apps.
            </p>
          </div>
        </div>

        {/* Left Form: Settings (7 cols on desktop) */}
        <form 
          onSubmit={handleSave} 
          className={`lg:col-span-7 space-y-5 ${mobileTab === 'qr_preview' ? 'hidden lg:block' : 'block'}`}
        >
          {/* Section 1: Business & UPI Credentials */}
          <div className="bg-white p-4 sm:p-5 rounded-2xl border border-slate-200 shadow-2xs space-y-4">
            <h3 className="font-bold text-slate-800 text-sm flex items-center space-x-2 border-b border-slate-100 pb-3">
              <Building size={16} className="text-blue-600" />
              <span>1. Merchant & UPI Credentials</span>
            </h3>

            <div className="space-y-3.5">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Business / Store Display Name *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Ramesh Kirana & General Store"
                  className="w-full border border-slate-300 rounded-xl p-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 font-medium text-slate-800 bg-white"
                  value={formData.businessName}
                  onChange={e => setFormData({ ...formData, businessName: e.target.value })}
                />
                <p className="text-[11px] text-slate-400 mt-1">
                  This name appears on the customer's UPI payment screen and invoice.
                </p>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Registered UPI ID (VPA) *
                </label>
                <div className="relative">
                  <input
                    type="text"
                    required
                    placeholder="e.g. yourshop@okaxis, 9876543210@paytm, store@upi"
                    className="w-full border border-slate-300 rounded-xl p-2.5 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-blue-500 font-bold text-slate-900 bg-slate-50/50"
                    value={formData.upiId}
                    onChange={e => setFormData({ ...formData, upiId: e.target.value.toLowerCase().trim() })}
                  />
                </div>
                <p className="text-[11px] text-slate-400 mt-1">
                  NPCI-compliant UPI handle linked to your business or merchant bank account.
                </p>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Payment Instructions for Customers
                </label>
                <textarea
                  rows={2}
                  placeholder="e.g. Scan using any UPI app (GPay, PhonePe, Paytm, BHIM) and confirm receiver name before paying."
                  className="w-full border border-slate-300 rounded-xl p-2.5 text-xs focus:outline-none focus:ring-2 focus:ring-blue-500 text-slate-700 bg-white"
                  value={formData.instructions}
                  onChange={e => setFormData({ ...formData, instructions: e.target.value })}
                />
              </div>
            </div>
          </div>

          {/* Section 2: QR Code Generation Mode */}
          <div className="bg-white p-4 sm:p-5 rounded-2xl border border-slate-200 shadow-2xs space-y-4">
            <h3 className="font-bold text-slate-800 text-sm flex items-center space-x-2 border-b border-slate-100 pb-3">
              <QrCode size={16} className="text-blue-600" />
              <span>2. UPI QR Code Mode</span>
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <label 
                className={`p-3.5 rounded-xl border-2 flex items-start space-x-3 cursor-pointer transition-all ${
                  formData.qrCodeType === 'dynamic' 
                    ? 'border-blue-600 bg-blue-50/50 text-blue-900' 
                    : 'border-slate-200 hover:border-slate-300 bg-white'
                }`}
              >
                <input
                  type="radio"
                  name="qrCodeType"
                  value="dynamic"
                  checked={formData.qrCodeType === 'dynamic'}
                  onChange={() => setFormData({ ...formData, qrCodeType: 'dynamic' })}
                  className="mt-1 text-blue-600 focus:ring-blue-500"
                />
                <div className="text-xs">
                  <span className="font-bold block text-sm text-slate-800">Dynamic Amount QR (Auto)</span>
                  <span className="text-slate-500 text-[11px] block mt-0.5 leading-relaxed">
                    Auto-encodes exact bill amount so customers do not have to type the amount manually.
                  </span>
                </div>
              </label>

              <label 
                className={`p-3.5 rounded-xl border-2 flex items-start space-x-3 cursor-pointer transition-all ${
                  formData.qrCodeType === 'custom_upload' 
                    ? 'border-blue-600 bg-blue-50/50 text-blue-900' 
                    : 'border-slate-200 hover:border-slate-300 bg-white'
                }`}
              >
                <input
                  type="radio"
                  name="qrCodeType"
                  value="custom_upload"
                  checked={formData.qrCodeType === 'custom_upload'}
                  onChange={() => setFormData({ ...formData, qrCodeType: 'custom_upload' })}
                  className="mt-1 text-blue-600 focus:ring-blue-500"
                />
                <div className="text-xs">
                  <span className="font-bold block text-sm text-slate-800">Upload Shop Standee QR</span>
                  <span className="text-slate-500 text-[11px] block mt-0.5 leading-relaxed">
                    Upload a photo of your existing official bank or Google Pay merchant QR standee.
                  </span>
                </div>
              </label>
            </div>

            {/* Custom Upload Area */}
            {formData.qrCodeType === 'custom_upload' && (
              <div className="pt-2 border-t border-slate-100">
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                  Upload Official UPI QR Code Photo
                </label>
                <div className="flex flex-col sm:flex-row items-center gap-3">
                  <label className="flex items-center space-x-2 px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold cursor-pointer shadow-xs transition-colors">
                    <Upload size={14} />
                    <span>Choose QR Code Image</span>
                    <input 
                      type="file" 
                      accept="image/*" 
                      onChange={handleImageUpload} 
                      className="hidden" 
                    />
                  </label>

                  {formData.customQrImageUrl && (
                    <button
                      type="button"
                      onClick={() => setFormData(prev => ({ ...prev, customQrImageUrl: '', qrCodeType: 'dynamic' }))}
                      className="flex items-center space-x-1 text-xs text-red-600 hover:text-red-800 font-semibold p-2 cursor-pointer"
                    >
                      <Trash2 size={13} />
                      <span>Remove Uploaded QR</span>
                    </button>
                  )}
                </div>

                {formData.customQrImageUrl && (
                  <div className="mt-3 flex items-center space-x-3 p-2.5 bg-slate-50 rounded-xl border border-slate-200 max-w-xs">
                    <img 
                      src={formData.customQrImageUrl} 
                      alt="Uploaded QR Preview" 
                      className="w-12 h-12 object-contain bg-white rounded-lg border border-slate-200" 
                    />
                    <div className="text-xs">
                      <span className="font-bold text-slate-800 block">Custom Standee Loaded</span>
                      <span className="text-[11px] text-emerald-600">Active for customer checkout</span>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Section 3: Enabled Payment Methods */}
          <div className="bg-white p-4 sm:p-5 rounded-2xl border border-slate-200 shadow-2xs space-y-4">
            <h3 className="font-bold text-slate-800 text-sm flex items-center space-x-2 border-b border-slate-100 pb-3">
              <CreditCard size={16} className="text-blue-600" />
              <span>3. Enabled Payment Methods at Checkout</span>
            </h3>

            <p className="text-xs text-slate-500">
              Toggle which payment channels appear in POS billing:
            </p>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              {[
                { key: 'upiQr' as const, label: 'UPI QR Code Payment', desc: 'Scan via any UPI app', icon: '📲' },
                { key: 'gpay' as const, label: 'Google Pay', desc: 'Direct Google Pay app', icon: '🟢' },
                { key: 'phonepe' as const, label: 'PhonePe', desc: 'Direct PhonePe app', icon: '🟣' },
                { key: 'paytm' as const, label: 'Paytm UPI', desc: 'Direct Paytm wallet/UPI', icon: '🔵' },
                { key: 'otherUpi' as const, label: 'Other UPI Apps', desc: 'BHIM, Cred, Amazon Pay', icon: '🇮🇳' },
                { key: 'cash' as const, label: 'Cash Payment', desc: 'Physical currency register', icon: '💵' },
                { key: 'card' as const, label: 'Debit/Credit Card', desc: 'Card swipe/POS terminal', icon: '💳' },
              ].map(m => {
                const isEnabled = formData.methodsEnabled[m.key];
                return (
                  <div 
                    key={m.key}
                    onClick={() => handleToggleMethod(m.key)}
                    className={`p-3 rounded-xl border flex items-center justify-between cursor-pointer transition-all ${
                      isEnabled 
                        ? 'bg-slate-50/80 border-blue-300' 
                        : 'bg-white border-slate-200 opacity-60'
                    }`}
                  >
                    <div className="flex items-center space-x-2.5">
                      <span className="text-lg">{m.icon}</span>
                      <div>
                        <span className="text-xs font-bold text-slate-800 block">{m.label}</span>
                        <span className="text-[10px] text-slate-500 block">{m.desc}</span>
                      </div>
                    </div>
                    <div className={`w-9 h-5 flex items-center rounded-full p-0.5 transition-colors ${
                      isEnabled ? 'bg-blue-600 justify-end' : 'bg-slate-300 justify-start'
                    }`}>
                      <div className="bg-white w-4 h-4 rounded-full shadow-xs" />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Section 4: Invoice Prefix & Sequence */}
          <div className="bg-white p-4 sm:p-5 rounded-2xl border border-slate-200 shadow-2xs space-y-4">
            <h3 className="font-bold text-slate-800 text-sm flex items-center space-x-2 border-b border-slate-100 pb-3">
              <Settings size={16} className="text-blue-600" />
              <span>4. Invoice Prefix & Numbering Sequence</span>
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Invoice Prefix Code
                </label>
                <input
                  type="text"
                  placeholder="e.g. DS, INV, SHREE"
                  className="w-full border border-slate-300 rounded-xl p-2.5 text-xs font-mono uppercase font-bold text-slate-800 focus:ring-2 focus:ring-blue-500 bg-white"
                  value={formData.invoicePrefix}
                  onChange={e => setFormData({ ...formData, invoicePrefix: e.target.value.toUpperCase() })}
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Next Order / Bill Number
                </label>
                <input
                  type="number"
                  min="1"
                  className="w-full border border-slate-300 rounded-xl p-2.5 text-xs font-mono font-bold text-slate-800 focus:ring-2 focus:ring-blue-500 bg-white"
                  value={formData.nextInvoiceNumber}
                  onChange={e => setFormData({ ...formData, nextInvoiceNumber: parseInt(e.target.value) || 1001 })}
                />
              </div>
            </div>
            <p className="text-[11px] text-slate-400">
              Next invoice generated will be formatted as: <span className="font-mono font-bold text-blue-700">{formData.invoicePrefix}-{formData.nextInvoiceNumber}</span>
            </p>
          </div>

          {/* Save Button */}
          <div className="flex items-center justify-end space-x-3 pt-2">
            <button
              type="submit"
              className="w-full sm:w-auto py-3 px-8 bg-blue-600 hover:bg-blue-700 active:bg-blue-800 text-white font-bold text-sm rounded-xl shadow-md shadow-blue-500/20 flex items-center justify-center space-x-2 cursor-pointer transition-all active:scale-[0.99]"
            >
              <Check size={16} />
              <span>Save Payment Settings</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
