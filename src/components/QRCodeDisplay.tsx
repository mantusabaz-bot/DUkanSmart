import React, { useEffect, useState, useId } from 'react';
import QRCode from 'qrcode';
import { 
  AlertCircle, Check, Copy, ExternalLink, QrCode as QrIcon, 
  Smartphone, Download, RefreshCw 
} from 'lucide-react';
import { PaymentSettings } from '../types';

interface QRCodeDisplayProps {
  amount?: number;
  orderNumber?: string;
  settings: PaymentSettings;
  className?: string;
  title?: string;
  showScanToPayHeading?: boolean;
}

export const QRCodeDisplay: React.FC<QRCodeDisplayProps> = ({
  amount = 0,
  orderNumber = 'DS-BILL',
  settings,
  className = '',
  title,
  showScanToPayHeading = true,
}) => {
  const [qrDataUrl, setQrDataUrl] = useState<string>('');
  const [copiedField, setCopiedField] = useState<string | null>(null);
  const [qrError, setQrError] = useState<string | null>(null);
  const [isGenerating, setIsGenerating] = useState<boolean>(true);
  const canvasId = useId();

  // Safely extract and clean UPI settings (ensures dynamic reactivity when settings change)
  const cleanUpiId = (settings?.upiId || '').trim();
  const cleanBusinessName = (settings?.businessName || 'DukaanSmart Store').trim();
  const isValidAmount = typeof amount === 'number' && !isNaN(amount) && amount > 0;
  const isCustomUpload = settings?.qrCodeType === 'custom_upload' && !!settings?.customQrImageUrl;

  // Construct standard NPCI UPI Intent URL
  // If amount > 0, include exact amount; otherwise provide open UPI intent
  const upiUrl = cleanUpiId
    ? isValidAmount
      ? `upi://pay?pa=${encodeURIComponent(cleanUpiId)}&pn=${encodeURIComponent(cleanBusinessName)}&am=${amount.toFixed(2)}&tr=${encodeURIComponent(orderNumber)}&tn=${encodeURIComponent(`Bill ${orderNumber}`)}&cu=INR`
      : `upi://pay?pa=${encodeURIComponent(cleanUpiId)}&pn=${encodeURIComponent(cleanBusinessName)}&cu=INR`
    : '';

  useEffect(() => {
    let isMounted = true;
    setIsGenerating(true);

    // Case 1: Custom uploaded QR code image
    if (isCustomUpload && settings?.customQrImageUrl) {
      setQrDataUrl(settings.customQrImageUrl);
      setQrError(null);
      setIsGenerating(false);
      return;
    }

    // Case 2: Missing or invalid UPI ID
    if (!cleanUpiId) {
      setQrDataUrl('');
      setQrError('UPI ID (VPA) is not configured yet. Please configure your UPI ID in Payment Settings.');
      setIsGenerating(false);
      return;
    }

    // Simple VPA structure check (e.g., username@bank)
    if (!cleanUpiId.includes('@')) {
      setQrDataUrl('');
      setQrError(`"${cleanUpiId}" is not a valid UPI VPA. A valid UPI ID format is name@bank (e.g. shop@okhdfcbank or 9876543210@paytm).`);
      setIsGenerating(false);
      return;
    }

    // Generate responsive QR code Data URL with high contrast
    QRCode.toDataURL(upiUrl, {
      width: 400, // High resolution source for crisp rendering across all screen densities
      margin: 1.5,
      color: {
        dark: '#0f172a',
        light: '#ffffff'
      },
      errorCorrectionLevel: 'M'
    })
      .then(url => {
        if (isMounted) {
          setQrDataUrl(url);
          setQrError(null);
          setIsGenerating(false);
        }
      })
      .catch(err => {
        console.error('Failed to generate dynamic UPI QR code:', err);
        if (isMounted) {
          setQrError('Unable to generate QR code. Please verify the UPI ID format.');
          setIsGenerating(false);
        }
      });

    return () => {
      isMounted = false;
    };
  }, [cleanUpiId, cleanBusinessName, amount, orderNumber, isCustomUpload, settings?.customQrImageUrl, upiUrl]);

  const copyToClipboard = (text: string, fieldName: string) => {
    if (!text) return;
    navigator.clipboard.writeText(text);
    setCopiedField(fieldName);
    setTimeout(() => {
      setCopiedField(prev => prev === fieldName ? null : prev);
    }, 2500);
  };

  const handleDownloadQR = () => {
    if (!qrDataUrl) return;
    const link = document.createElement('a');
    link.href = qrDataUrl;
    link.download = `UPI_QR_${cleanBusinessName.replace(/[^a-zA-Z0-9]/g, '_')}_${orderNumber || 'code'}.png`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className={`w-full max-w-full bg-white rounded-2xl border border-slate-200 shadow-sm p-4 sm:p-5 flex flex-col items-center text-center overflow-hidden transition-all ${className}`}>
      {/* Header Tag */}
      <div className="flex items-center space-x-1.5 text-xs font-semibold text-blue-700 bg-blue-50 px-3 py-1 rounded-full border border-blue-100 mb-2.5">
        <QrIcon size={14} className="text-blue-600 shrink-0" />
        <span className="truncate max-w-[240px]">
          {isCustomUpload ? 'Official Shop QR Code' : 'Instant UPI Payment QR'}
        </span>
      </div>

      {/* Main Heading: "Scan to Pay" */}
      {showScanToPayHeading && (
        <h3 className="font-extrabold text-slate-900 text-lg sm:text-xl tracking-tight">
          Scan to Pay
        </h3>
      )}

      {/* Store Title */}
      <p className="font-bold text-slate-800 text-sm sm:text-base mt-0.5 max-w-full truncate px-2">
        {cleanBusinessName}
      </p>

      {/* Order Reference if provided */}
      {orderNumber && (
        <p className="text-xs text-slate-500 mt-0.5">
          Order Ref: <span className="font-mono font-bold text-slate-700">{orderNumber}</span>
        </p>
      )}

      {/* Payment Amount Display Card */}
      {isValidAmount && (
        <div className="my-3 px-4 py-2.5 bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200 rounded-xl w-full max-w-xs shadow-2xs">
          <span className="text-[11px] text-slate-500 font-semibold uppercase tracking-wider block">
            Total Payable Amount
          </span>
          <span className="text-2xl sm:text-3xl font-black text-blue-700 block mt-0.5">
            ₹{amount.toFixed(2)}
          </span>
        </div>
      )}

      {/* Responsive QR Code Container: guaranteed visible on phones with flexible aspect ratio */}
      <div className="w-full flex items-center justify-center my-2 px-2">
        <div className="relative p-2.5 sm:p-3 bg-white border-2 border-dashed border-blue-300 rounded-2xl shadow-inner w-56 h-56 sm:w-64 sm:h-64 max-w-[85vw] max-h-[85vw] flex items-center justify-center shrink-0">
          {qrDataUrl && !isGenerating ? (
            <img 
              src={qrDataUrl} 
              alt={`UPI QR Code for ${cleanBusinessName}`} 
              className="w-full h-full max-w-full max-h-full object-contain rounded-lg block"
              loading="eager"
            />
          ) : qrError ? (
            <div className="p-3 text-center space-y-2 text-slate-400 max-w-[200px]">
              <AlertCircle size={28} className="mx-auto text-amber-500 shrink-0" />
              <p className="text-xs font-semibold text-slate-700 leading-snug">{qrError}</p>
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center space-y-2 text-slate-400 p-4">
              <RefreshCw size={24} className="animate-spin text-blue-600" />
              <span className="text-xs font-medium">Generating QR Code...</span>
            </div>
          )}
        </div>
      </div>

      {/* UPI ID Pill & Copy Button */}
      {cleanUpiId ? (
        <div className="flex items-center space-x-2 bg-slate-50 border border-slate-200 px-3 py-2 rounded-xl text-xs mt-2 w-full max-w-xs justify-between shadow-2xs">
          <div className="truncate text-left flex-1 min-w-0 mr-2">
            <span className="text-slate-400 text-[10px] block leading-none font-bold uppercase tracking-wider">
              UPI ID / VPA
            </span>
            <span className="font-mono font-bold text-slate-900 text-xs sm:text-sm truncate block mt-0.5">
              {cleanUpiId}
            </span>
          </div>
          <button
            type="button"
            onClick={() => copyToClipboard(cleanUpiId, 'upiId')}
            className="text-blue-600 hover:text-blue-800 bg-white hover:bg-blue-50 border border-slate-200 px-2.5 py-1.5 rounded-lg font-bold text-xs flex items-center space-x-1 shrink-0 transition-colors cursor-pointer shadow-2xs"
            title="Copy UPI ID"
            aria-label="Copy UPI ID"
          >
            {copiedField === 'upiId' ? (
              <span className="flex items-center text-emerald-600 font-bold">
                <Check size={13} className="mr-1" /> Copied
              </span>
            ) : (
              <span className="flex items-center text-blue-600">
                <Copy size={13} className="mr-1" /> Copy
              </span>
            )}
          </button>
        </div>
      ) : (
        <div className="w-full max-w-xs mt-2 p-2.5 bg-amber-50 border border-amber-200 rounded-xl text-xs text-amber-800 text-left flex items-start space-x-2">
          <AlertCircle size={15} className="text-amber-600 shrink-0 mt-0.5" />
          <span>No UPI ID configured. Go to Payment Settings to enter your shop UPI ID.</span>
        </div>
      )}

      {/* Payment Instructions */}
      <p className="text-xs text-slate-600 mt-2.5 max-w-xs leading-relaxed bg-slate-50/80 p-2.5 rounded-xl border border-slate-100 text-center">
        💬 {settings?.instructions || 'Scan with Google Pay, PhonePe, Paytm, BHIM or any UPI app to pay.'}
      </p>

      {/* Action Buttons: Open in UPI App & Download QR */}
      <div className="mt-3 w-full max-w-xs space-y-2">
        {/* Deep Link to UPI Apps (GPay, PhonePe, Paytm, BHIM) */}
        {upiUrl && (
          <a
            href={upiUrl}
            className="w-full py-2.5 px-3 bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 text-white font-bold text-xs rounded-xl flex items-center justify-center space-x-1.5 shadow-sm transition-all"
          >
            <Smartphone size={15} />
            <span>Open in UPI App</span>
            <ExternalLink size={12} className="ml-1 opacity-70" />
          </a>
        )}

        {/* Download QR Code button */}
        {qrDataUrl && !qrError && (
          <button
            type="button"
            onClick={handleDownloadQR}
            className="w-full py-2 px-3 bg-white hover:bg-slate-50 active:bg-slate-100 border border-slate-200 text-slate-700 font-bold text-xs rounded-xl flex items-center justify-center space-x-1.5 shadow-2xs transition-colors cursor-pointer"
          >
            <Download size={14} className="text-slate-500" />
            <span>Download QR Code Image</span>
          </button>
        )}
      </div>
    </div>
  );
};
