import React, { useEffect, useState } from 'react';
import QRCode from 'qrcode';
import { AlertCircle, Check, Copy, ExternalLink, QrCode as QrIcon, Smartphone } from 'lucide-react';
import { PaymentSettings } from '../types';

interface QRCodeDisplayProps {
  amount: number;
  orderNumber: string;
  settings: PaymentSettings;
  className?: string;
  onPaymentSuccess?: () => void;
}

export const QRCodeDisplay: React.FC<QRCodeDisplayProps> = ({
  amount,
  orderNumber,
  settings,
  className = '',
}) => {
  const [qrDataUrl, setQrDataUrl] = useState<string>('');
  const [copiedField, setCopiedField] = useState<string | null>(null);
  const [qrError, setQrError] = useState<string | null>(null);

  const cleanUpiId = (settings.upiId || '').trim();
  const cleanBusinessName = (settings.businessName || 'DukaanSmart Store').trim();

  // Construct standard NPCI UPI Intent URL
  // upi://pay?pa={upiId}&pn={merchantName}&am={amount}&tr={orderRef}&tn={note}&cu=INR
  const upiUrl = cleanUpiId 
    ? `upi://pay?pa=${encodeURIComponent(cleanUpiId)}&pn=${encodeURIComponent(cleanBusinessName)}&am=${amount.toFixed(2)}&tr=${encodeURIComponent(orderNumber)}&tn=${encodeURIComponent(`Order ${orderNumber}`)}&cu=INR`
    : '';

  useEffect(() => {
    // If shopkeeper uploaded custom QR code and chose custom_upload mode
    if (settings.qrCodeType === 'custom_upload' && settings.customQrImageUrl) {
      setQrDataUrl(settings.customQrImageUrl);
      setQrError(null);
      return;
    }

    // Dynamic QR generation with order amount and order reference
    if (!cleanUpiId) {
      setQrDataUrl('');
      setQrError('UPI ID (VPA) is not configured by the shop owner yet.');
      return;
    }

    QRCode.toDataURL(upiUrl, {
      width: 280,
      margin: 1.5,
      color: {
        dark: '#0f172a',
        light: '#ffffff'
      },
      errorCorrectionLevel: 'M'
    })
      .then(url => {
        setQrDataUrl(url);
        setQrError(null);
      })
      .catch(err => {
        console.error('Failed to generate dynamic UPI QR code:', err);
        setQrError('Failed to generate dynamic QR code');
      });
  }, [cleanUpiId, cleanBusinessName, amount, orderNumber, settings.qrCodeType, settings.customQrImageUrl, upiUrl]);

  const copyToClipboard = (text: string, fieldName: string) => {
    navigator.clipboard.writeText(text);
    setCopiedField(fieldName);
    setTimeout(() => {
      setCopiedField(prev => prev === fieldName ? null : prev);
    }, 2500);
  };

  return (
    <div className={`bg-white rounded-2xl border border-slate-200 shadow-sm p-4 sm:p-5 flex flex-col items-center text-center ${className}`}>
      {/* Header Badge */}
      <div className="flex items-center space-x-2 text-xs font-semibold text-blue-700 bg-blue-50 px-3 py-1 rounded-full border border-blue-100 mb-3">
        <QrIcon size={14} className="text-blue-600" />
        <span>{settings.qrCodeType === 'custom_upload' && settings.customQrImageUrl ? 'Official Shop QR Code' : 'Dynamic Auto-Amount UPI QR'}</span>
      </div>

      <h3 className="font-bold text-slate-800 text-base sm:text-lg">{cleanBusinessName}</h3>
      <p className="text-xs text-slate-500 mt-0.5">Order Ref: <span className="font-mono font-bold text-slate-700">{orderNumber}</span></p>

      {/* Amount Display */}
      <div className="my-3 px-4 py-2 bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200 rounded-xl w-full max-w-xs">
        <span className="text-xs text-slate-500 font-medium block">Total Payable Amount</span>
        <span className="text-2xl sm:text-3xl font-extrabold text-blue-700">₹{amount.toFixed(2)}</span>
      </div>

      {/* QR Code Container */}
      <div className="relative p-3 bg-white border-2 border-dashed border-blue-300 rounded-2xl shadow-inner my-2 w-56 h-56 sm:w-64 sm:h-64 flex items-center justify-center">
        {qrDataUrl ? (
          <img 
            src={qrDataUrl} 
            alt={`UPI QR Code for ${cleanBusinessName}`} 
            className="w-full h-full object-contain rounded-lg"
          />
        ) : qrError ? (
          <div className="p-4 text-center space-y-2 text-slate-400">
            <AlertCircle size={32} className="mx-auto text-amber-500" />
            <p className="text-xs font-medium text-slate-600">{qrError}</p>
            <p className="text-[11px] text-slate-400">Please set UPI ID in Payment Settings.</p>
          </div>
        ) : (
          <div className="animate-pulse text-xs text-slate-400 font-medium">Generating QR Code...</div>
        )}
      </div>

      {/* UPI ID Pill & Copy */}
      {cleanUpiId && (
        <div className="flex items-center space-x-2 bg-slate-50 border border-slate-200 px-3 py-1.5 rounded-lg text-xs mt-2 w-full max-w-xs justify-between">
          <div className="truncate text-left">
            <span className="text-slate-400 text-[10px] block leading-none font-medium">UPI ID / VPA</span>
            <span className="font-mono font-semibold text-slate-800 text-xs truncate">{cleanUpiId}</span>
          </div>
          <button
            type="button"
            onClick={() => copyToClipboard(cleanUpiId, 'upiId')}
            className="text-blue-600 hover:text-blue-800 font-semibold flex items-center space-x-1 shrink-0 p-1 hover:bg-blue-50 rounded transition-colors cursor-pointer"
            title="Copy UPI ID"
          >
            {copiedField === 'upiId' ? (
              <span className="flex items-center text-emerald-600 text-[11px]"><Check size={13} className="mr-0.5" /> Copied</span>
            ) : (
              <span className="flex items-center text-blue-600 text-[11px]"><Copy size={13} className="mr-0.5" /> Copy</span>
            )}
          </button>
        </div>
      )}

      {/* Payment Instructions */}
      <p className="text-xs text-slate-600 mt-3 max-w-xs leading-relaxed bg-slate-50/80 p-2.5 rounded-lg border border-slate-100">
        💬 {settings.instructions || 'Scan with Google Pay, PhonePe, Paytm, or any UPI app to pay.'}
      </p>

      {/* Direct UPI Intent Link for Mobile / Tablet */}
      {upiUrl && (
        <div className="mt-3 w-full max-w-xs">
          <a
            href={upiUrl}
            className="w-full py-2 px-3 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl flex items-center justify-center space-x-1.5 shadow-xs transition-colors"
          >
            <Smartphone size={14} />
            <span>Open in Installed UPI App</span>
            <ExternalLink size={12} className="ml-1 opacity-70" />
          </a>
          <p className="text-[10px] text-slate-400 mt-1">Works on mobile devices with UPI apps installed</p>
        </div>
      )}
    </div>
  );
};
