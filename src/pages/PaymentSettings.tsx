import React, { useState } from 'react';
import { useStore } from '../store';
import { 
  CreditCard, QrCode, Upload, Check, AlertCircle, Sparkles, 
  Settings, Smartphone, Building, ShieldCheck, RefreshCw, Trash2 
} from 'lucide-react';
import { QRCodeDisplay } from '../components/QRCodeDisplay';
import { PaymentSettings as IPaymentSettings } from '../types';

export default function PaymentSettings() {
  const { paymentSettings, updatePaymentSettings, user } = useStore();

  const [formData, setFormData] = useState<IPaymentSettings>({
    ...paymentSettings,
    businessName: paymentSettings.businessName || user?.shopName || 'DukaanSmart Store',
  });

  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [testAmount, setTestAmount] = useState<number>(150);

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
    <div className="space-y-6 max-w-6xl mx-auto">
      {/* Toast */}
      {toastMessage && (
        <div className="fixed top-4 right-4 z-50 flex items-center space-x-2 px-4 py-3 rounded-xl shadow-lg border text-sm font-medium bg-emerald-50 text-emerald-800 border-emerald-200 animate-in fade-in slide-in-from-top-2">
          <Check size={18} className="text-emerald-600 shrink-0" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 bg-white p-5 rounded-xl border border-slate-200 shadow-2xs">
        <div>
          <div className="flex items-center space-x-2">
            <div className="bg-blue-600 p-2 rounded-lg text-white">
              <QrCode size={20} />
            </div>
            <div>
              <h2 className="text-2xl font-bold text-slate-800">Owner Payment & UPI Settings</h2>
              <p className="text-xs text-slate-500 mt-0.5">
                Configure your shop's official UPI ID, dynamic QR code billing, and digital payment methods
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center space-x-2">
          <span className="text-xs px-3 py-1 bg-blue-50 text-blue-700 font-semibold rounded-full border border-blue-200 flex items-center space-x-1">
            <ShieldCheck size={14} className="text-blue-600" />
            <span>Owner Account: {user?.shopName || 'Verified'}</span>
          </span>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Form: Settings (7 cols) */}
        <form onSubmit={handleSave} className="lg:col-span-7 space-y-6">
          {/* Section 1: Business & UPI Credentials */}
          <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs space-y-4">
            <h3 className="font-bold text-slate-800 text-sm flex items-center space-x-2 border-b border-slate-100 pb-3">
              <Building size={16} className="text-blue-600" />
              <span>1. Merchant & UPI Credentials</span>
            </h3>

            <div className="space-y-3">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Business / Store Display Name *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Ramesh Kirana & General Store"
                  className="w-full border border-slate-300 rounded-lg p-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 font-medium text-slate-800"
                  value={formData.businessName}
                  onChange={e => setFormData({ ...formData, businessName: e.target.value })}
                />
                <p className="text-[11px] text-slate-400 mt-1">
                  This name appears on the customer's UPI payment screen and printed bills.
                </p>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Registered UPI ID (VPA) *
                </label>
                <div className="relative">
                  <input
                    type="text"
                    required
                    placeholder="e.g. yourshop@okaxis, 9876543210@paytm, store@upi"
                    className="w-full border border-slate-300 rounded-lg p-2.5 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-blue-500 font-bold text-slate-900 bg-slate-50/50"
                    value={formData.upiId}
                    onChange={e => setFormData({ ...formData, upiId: e.target.value.toLowerCase().trim() })}
                  />
                </div>
                <p className="text-[11px] text-slate-400 mt-1">
                  NPCI-compliant UPI handle linked to your current or savings business bank account.
                </p>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Payment Instructions for Customers
                </label>
                <textarea
                  rows={2}
                  placeholder="e.g. Scan using any UPI app (GPay, PhonePe, Paytm, BHIM) and confirm receiver name before paying."
                  className="w-full border border-slate-300 rounded-lg p-2.5 text-xs focus:outline-none focus:ring-2 focus:ring-blue-500 text-slate-700"
                  value={formData.instructions}
                  onChange={e => setFormData({ ...formData, instructions: e.target.value })}
                />
              </div>
            </div>
          </div>

          {/* Section 2: QR Code Generation Mode */}
          <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs space-y-4">
            <h3 className="font-bold text-slate-800 text-sm flex items-center space-x-2 border-b border-slate-100 pb-3">
              <QrCode size={16} className="text-blue-600" />
              <span>2. UPI QR Code Display Mode</span>
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
                  <span className="font-bold block text-sm text-slate-800">Dynamic Amount QR (Recommended)</span>
                  <span className="text-slate-500 text-[11px] block mt-0.5 leading-relaxed">
                    Auto-encodes exact bill amount and unique order reference so customers don't have to manually type the amount.
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
                  <span className="font-bold block text-sm text-slate-800">Upload Shop Standee QR Image</span>
                  <span className="text-slate-500 text-[11px] block mt-0.5 leading-relaxed">
                    Upload your official bank or Google Pay / PhonePe merchant standee QR code photo.
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
                  <label className="flex items-center space-x-2 px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-semibold cursor-pointer shadow-xs transition-colors">
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
                  <div className="mt-3 flex items-center space-x-3 p-2 bg-slate-50 rounded-lg border border-slate-200 max-w-xs">
                    <img 
                      src={formData.customQrImageUrl} 
                      alt="Uploaded QR Preview" 
                      className="w-12 h-12 object-contain bg-white rounded border border-slate-200" 
                    />
                    <div className="text-xs">
                      <span className="font-semibold text-slate-800 block">Custom QR Loaded</span>
                      <span className="text-[11px] text-emerald-600">Ready for customer checkout</span>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Section 3: Payment Methods Status (Enable/Disable) */}
          <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs space-y-4">
            <h3 className="font-bold text-slate-800 text-sm flex items-center space-x-2 border-b border-slate-100 pb-3">
              <CreditCard size={16} className="text-blue-600" />
              <span>3. Enabled Payment Methods at Checkout</span>
            </h3>

            <p className="text-xs text-slate-500">
              Toggle which payment channels are visible to your cashier and customers:
            </p>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {[
                { key: 'upiQr' as const, label: 'UPI QR Code Payment', desc: 'Scan via any UPI app', icon: '📲' },
                { key: 'gpay' as const, label: 'Google Pay', desc: 'Direct Google Pay app', icon: '🟢' },
                { key: 'phonepe' as const, label: 'PhonePe', desc: 'Direct PhonePe app', icon: '🟣' },
                { key: 'paytm' as const, label: 'Paytm UPI', desc: 'Direct Paytm wallet/UPI', icon: '🔵' },
                { key: 'otherUpi' as const, label: 'Other UPI Apps', desc: 'BHIM, Cred, Amazon Pay', icon: '🇮🇳' },
                { key: 'cash' as const, label: 'Cash Payment', desc: 'Physical currency cash register', icon: '💵' },
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
          <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs space-y-4">
            <h3 className="font-bold text-slate-800 text-sm flex items-center space-x-2 border-b border-slate-100 pb-3">
              <Settings size={16} className="text-blue-600" />
              <span>4. Invoice Prefix & Numbering Sequence</span>
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Invoice Prefix Code
                </label>
                <input
                  type="text"
                  placeholder="e.g. DS, INV, SHREE"
                  className="w-full border border-slate-300 rounded-lg p-2.5 text-xs font-mono uppercase font-bold text-slate-800 focus:ring-2 focus:ring-blue-500"
                  value={formData.invoicePrefix}
                  onChange={e => setFormData({ ...formData, invoicePrefix: e.target.value.toUpperCase() })}
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Next Order / Bill Number
                </label>
                <input
                  type="number"
                  min="1"
                  className="w-full border border-slate-300 rounded-lg p-2.5 text-xs font-mono font-bold text-slate-800 focus:ring-2 focus:ring-blue-500"
                  value={formData.nextInvoiceNumber}
                  onChange={e => setFormData({ ...formData, nextInvoiceNumber: parseInt(e.target.value) || 1001 })}
                />
              </div>
            </div>
            <p className="text-[11px] text-slate-400">
              Next invoice generated will be formatted as: <span className="font-mono font-bold text-blue-700">{formData.invoicePrefix}-{formData.nextInvoiceNumber}</span>
            </p>
          </div>

          {/* Action buttons */}
          <div className="flex items-center justify-end space-x-3 pt-2">
            <button
              type="submit"
              className="py-3 px-6 bg-blue-600 hover:bg-blue-700 text-white font-bold text-sm rounded-xl shadow-md shadow-blue-500/20 flex items-center space-x-2 cursor-pointer transition-all active:scale-[0.99]"
            >
              <Check size={16} />
              <span>Save Payment Settings</span>
            </button>
          </div>
        </form>

        {/* Right Column: Live Customer QR Checkout Preview (5 cols) */}
        <div className="lg:col-span-5 space-y-4">
          <div className="bg-slate-100/80 p-3.5 rounded-xl border border-slate-200 flex items-center justify-between">
            <div className="flex items-center space-x-1.5 text-xs font-bold text-slate-700">
              <Sparkles size={14} className="text-amber-500" />
              <span>Live Checkout Customer Preview</span>
            </div>
            <div className="flex items-center space-x-1 text-xs">
              <span className="text-slate-500 text-[11px]">Test Bill:</span>
              <input 
                type="number" 
                value={testAmount} 
                onChange={e => setTestAmount(Math.max(1, parseFloat(e.target.value) || 1))}
                className="w-16 px-1.5 py-0.5 text-xs bg-white border border-slate-300 rounded font-bold text-right"
              />
            </div>
          </div>

          {/* Render real QRCodeDisplay with live form data */}
          <QRCodeDisplay 
            amount={testAmount}
            orderNumber={`${formData.invoicePrefix}-${formData.nextInvoiceNumber}`}
            settings={formData}
          />

          <div className="bg-white p-4 rounded-xl border border-slate-200 text-xs space-y-2 text-slate-600">
            <h4 className="font-bold text-slate-800 text-xs">🔒 Security & Privacy Notice</h4>
            <p className="text-[11px] leading-relaxed text-slate-500">
              Your UPI settings are privately stored for your shop account only. Never share banking passwords or OTPs. DukaanSmart generates direct peer-to-peer NPCI UPI QR codes straight into your bank account with zero platform commission.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
