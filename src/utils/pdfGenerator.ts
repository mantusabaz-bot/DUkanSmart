import jsPDF from 'jspdf';
import { Sale, Customer, User, PaymentSettings } from '../types';
import { format } from 'date-fns';

export function generateInvoicePDF(params: {
  sale: Sale;
  user: User | null;
  customer?: Customer;
  settings: PaymentSettings;
  cashReceived?: number;
  changeAmount?: number;
}) {
  const { sale, user, customer, settings, cashReceived, changeAmount } = params;
  const doc = new jsPDF({
    unit: 'mm',
    format: [80, 220], // 80mm thermal receipt format
  });

  const shopTitle = user?.shopName || settings.businessName || 'DukaanSmart Store';
  const orderRef = sale.orderNumber || sale.id.slice(0, 8).toUpperCase();

  let y = 8;
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(13);
  doc.text(shopTitle, 40, y, { align: 'center' });

  y += 5;
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.text('GST / Retail Tax Invoice & Cash Memo', 40, y, { align: 'center' });
  if (user?.shopAddress) {
    y += 4;
    doc.text(user.shopAddress, 40, y, { align: 'center' });
  }
  if (user?.phone) {
    y += 4;
    doc.text(`Phone: ${user.phone}`, 40, y, { align: 'center' });
  }

  y += 4;
  doc.setLineWidth(0.3);
  doc.line(5, y, 75, y);

  y += 5;
  doc.setFontSize(8);
  doc.setFont('helvetica', 'bold');
  doc.text(`Invoice / Order: ${orderRef}`, 5, y);
  y += 4;
  doc.setFont('helvetica', 'normal');
  doc.text(`Date: ${format(new Date(sale.date), 'dd/MM/yyyy hh:mm a')}`, 5, y);

  if (customer) {
    y += 4;
    doc.text(`Customer: ${customer.name} (${customer.phone})`, 5, y);
  }

  y += 3;
  doc.setLineWidth(0.2);
  doc.line(5, y, 75, y);

  // Table header
  y += 4;
  doc.setFont('helvetica', 'bold');
  doc.text('Item', 5, y);
  doc.text('Qty/Wt', 45, y);
  doc.text('Amount', 75, y, { align: 'right' });

  y += 2;
  doc.line(5, y, 75, y);
  doc.setFont('helvetica', 'normal');

  // Items
  sale.items.forEach(item => {
    y += 4;
    const name = item.name.length > 20 ? item.name.slice(0, 19) + '…' : item.name;
    const qtyText = item.unitDisplay || `${item.quantity} ${item.unit || 'pcs'}`;
    doc.text(name, 5, y);
    doc.text(qtyText, 45, y);
    doc.text(`₹${item.subtotal.toFixed(2)}`, 75, y, { align: 'right' });
  });

  y += 3;
  doc.line(5, y, 75, y);

  // Totals
  y += 4;
  doc.text('Subtotal:', 5, y);
  doc.text(`₹${sale.subtotal.toFixed(2)}`, 75, y, { align: 'right' });

  if (sale.discount > 0) {
    y += 4;
    doc.text('Discount:', 5, y);
    doc.text(`-₹${sale.discount.toFixed(2)}`, 75, y, { align: 'right' });
  }

  y += 5;
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10);
  doc.text('Grand Total:', 5, y);
  doc.text(`₹${sale.total.toFixed(2)}`, 75, y, { align: 'right' });

  y += 4;
  doc.setFontSize(8);
  doc.line(5, y, 75, y);

  // Payment Breakdown
  y += 4;
  doc.setFont('helvetica', 'bold');
  doc.text(`Payment Method:`, 5, y);
  doc.text(`${sale.paymentMethod}`, 75, y, { align: 'right' });

  y += 4;
  doc.text(`Payment Status:`, 5, y);
  doc.text(`[ ${sale.paymentStatus.toUpperCase()} ]`, 75, y, { align: 'right' });

  if (cashReceived !== undefined && cashReceived > 0) {
    y += 4;
    doc.setFont('helvetica', 'normal');
    doc.text('Cash Received:', 5, y);
    doc.text(`₹${cashReceived.toFixed(2)}`, 75, y, { align: 'right' });

    y += 4;
    doc.text('Change Returned:', 5, y);
    doc.text(`₹${(changeAmount ?? 0).toFixed(2)}`, 75, y, { align: 'right' });
  }

  if (sale.transactionRef) {
    y += 4;
    doc.setFont('helvetica', 'normal');
    doc.text(`Txn Ref:`, 5, y);
    doc.text(sale.transactionRef, 75, y, { align: 'right' });
  }

  if (sale.upiId) {
    y += 4;
    doc.text(`UPI ID:`, 5, y);
    doc.text(sale.upiId, 75, y, { align: 'right' });
  }

  // PAID Stamp Box
  y += 6;
  doc.setDrawColor(22, 163, 74);
  doc.setFillColor(240, 253, 244);
  doc.roundedRect(20, y, 40, 9, 2, 2, 'FD');
  doc.setTextColor(22, 163, 74);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10);
  doc.text('PAID & VERIFIED', 40, y + 6, { align: 'center' });

  // Footer
  doc.setTextColor(100, 116, 139);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7);
  y += 14;
  doc.text('Thank you for shopping with us! Please visit again.', 40, y, { align: 'center' });
  y += 3.5;
  doc.text('Powered by DukaanSmart POS System', 40, y, { align: 'center' });

  // Save the PDF
  doc.save(`Invoice_${orderRef}.pdf`);
}
