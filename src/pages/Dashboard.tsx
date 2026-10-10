import React, { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useStore } from '../store';
import { 
  IndianRupee, TrendingUp, Package, AlertCircle, AlertTriangle, 
  CheckCircle2, ArrowRight, ShoppingCart, Users, Calendar, Filter, QrCode 
} from 'lucide-react';
import { format, isToday, subDays, startOfMonth, isAfter, parseISO } from 'date-fns';
import { 
  LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, 
  Tooltip, ResponsiveContainer, Cell, PieChart, Pie 
} from 'recharts';

export default function Dashboard() {
  const navigate = useNavigate();
  const { sales, products, customers } = useStore();
  const [dateFilter, setDateFilter] = useState<'today' | '7days' | 'month' | 'all'>('today');

  // Filter sales based on selected date range
  const filteredSales = useMemo(() => {
    const now = new Date();
    if (dateFilter === 'today') {
      return sales.filter(s => isToday(new Date(s.date)));
    }
    if (dateFilter === '7days') {
      const sevenDaysAgo = subDays(now, 7);
      return sales.filter(s => isAfter(new Date(s.date), sevenDaysAgo));
    }
    if (dateFilter === 'month') {
      const monthStart = startOfMonth(now);
      return sales.filter(s => isAfter(new Date(s.date), monthStart));
    }
    return sales;
  }, [sales, dateFilter]);

  // Metrics calculated from actual database records
  const totalRevenue = useMemo(() => {
    return filteredSales.reduce((acc, sale) => acc + (sale.amountPaid || 0), 0);
  }, [filteredSales]);

  const totalSalesValue = useMemo(() => {
    return filteredSales.reduce((acc, sale) => acc + (sale.total || 0), 0);
  }, [filteredSales]);

  const periodUdhaarGiven = useMemo(() => {
    return filteredSales.reduce((acc, sale) => acc + Math.max(0, (sale.total || 0) - (sale.amountPaid || 0)), 0);
  }, [filteredSales]);

  // Overall market outstanding Udhaar across all customer accounts
  const totalOutstandingUdhaar = useMemo(() => {
    return customers.reduce((acc, c) => acc + (c.balance || 0), 0);
  }, [customers]);

  const customersWithDue = useMemo(() => {
    return customers.filter(c => c.balance > 0).length;
  }, [customers]);

  // Stock status counts
  const lowStockProducts = useMemo(() => {
    return products.filter(p => p.stock > 0 && p.stock <= (p.minStock ?? 10));
  }, [products]);

  const outOfStockProducts = useMemo(() => {
    return products.filter(p => p.stock <= 0);
  }, [products]);

  const inStockProducts = useMemo(() => {
    return products.filter(p => p.stock > (p.minStock ?? 10));
  }, [products]);

  // Real 7-day sales trend calculated from actual sales records
  const chartData = useMemo(() => {
    const days: { name: string; fullDate: string; sales: number; count: number }[] = [];
    const now = new Date();

    for (let i = 6; i >= 0; i--) {
      const d = subDays(now, i);
      const dayName = format(d, 'EEE');
      const dateStr = format(d, 'yyyy-MM-dd');

      // Sum actual sales for this day
      const daySales = sales.filter(s => {
        try {
          const sDate = format(new Date(s.date), 'yyyy-MM-dd');
          return sDate === dateStr;
        } catch {
          return false;
        }
      });

      const dayRevenue = daySales.reduce((sum, s) => sum + (s.amountPaid || 0), 0);

      days.push({
        name: dayName,
        fullDate: format(d, 'dd MMM'),
        sales: parseFloat(dayRevenue.toFixed(2)),
        count: daySales.length,
      });
    }

    return days;
  }, [sales]);

  // Payment methods distribution
  const paymentMethodData = useMemo(() => {
    const isUpi = (m: string) => ['UPI', 'UPI QR', 'Google Pay', 'PhonePe', 'Paytm', 'Other UPI'].includes(m);
    const cash = filteredSales.filter(s => s.paymentMethod === 'Cash').reduce((sum, s) => sum + s.amountPaid, 0);
    const upi = filteredSales.filter(s => isUpi(s.paymentMethod)).reduce((sum, s) => sum + s.amountPaid, 0);
    const card = filteredSales.filter(s => s.paymentMethod === 'Card').reduce((sum, s) => sum + s.amountPaid, 0);
    const credit = periodUdhaarGiven;

    return [
      { name: 'Cash', value: cash, color: '#10b981' },
      { name: 'UPI Digital', value: upi, color: '#3b82f6' },
      { name: 'Card', value: card, color: '#8b5cf6' },
      { name: 'Udhaar', value: credit, color: '#f97316' },
    ].filter(item => item.value > 0);
  }, [filteredSales, periodUdhaarGiven]);

  return (
    <div className="space-y-6">
      {/* Header Row: div:nth-of-type(1) */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 bg-white p-4 rounded-xl border border-slate-200 shadow-2xs">
        <div>
          <h2 className="text-2xl font-bold text-slate-800">Business Dashboard</h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Real-time shop sales, payments, customer Udhaar, and inventory health
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {/* UPI Settings Quick Link */}
          <button
            onClick={() => navigate('/payment-settings')}
            className="flex items-center space-x-1.5 px-3 py-1.5 bg-blue-50 hover:bg-blue-100 text-blue-700 text-xs font-bold rounded-lg border border-blue-200 transition-colors cursor-pointer"
          >
            <QrCode size={14} className="text-blue-600" />
            <span>UPI QR Settings</span>
          </button>

          {/* Date Filter Tabs */}
          <div className="flex items-center space-x-1 bg-slate-100 p-1 rounded-lg text-xs font-semibold">
            {[
              { id: 'today', label: 'Today' },
              { id: '7days', label: 'Last 7 Days' },
              { id: 'month', label: 'This Month' },
              { id: 'all', label: 'All Time' },
            ].map(tab => (
              <button
                key={tab.id}
                onClick={() => setDateFilter(tab.id as any)}
                className={`px-3 py-1.5 rounded-md transition-all cursor-pointer ${
                  dateFilter === tab.id
                    ? 'bg-white text-blue-700 shadow-2xs font-bold'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Stats Grid: div:nth-of-type(2) -> contains cards 1, 2, 3, 4 */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Card 1: Revenue Received (div:nth-of-type(1)) */}
        <div 
          onClick={() => navigate('/reports')}
          className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm hover:shadow-md hover:border-blue-300 transition-all cursor-pointer group flex flex-col justify-between"
        >
          <div className="flex items-start justify-between">
            <div className="space-y-1">
              <p className="text-xs text-slate-500 font-semibold uppercase tracking-wider">
                {dateFilter === 'today' ? "Today's Revenue" : 'Revenue Received'}
              </p>
              <h3 className="text-2xl font-bold text-slate-900">₹{totalRevenue.toFixed(2)}</h3>
            </div>
            <div className="p-3 rounded-xl bg-blue-50 text-blue-600 group-hover:bg-blue-600 group-hover:text-white transition-colors">
              <IndianRupee size={22} />
            </div>
          </div>
          <div className="mt-3 pt-2.5 border-t border-slate-100 flex items-center justify-between text-xs">
            <span className="text-slate-500 font-medium">{filteredSales.length} bills completed</span>
            <span className="text-blue-600 font-bold flex items-center space-x-0.5 group-hover:translate-x-0.5 transition-transform">
              <span>View Reports</span>
              <ArrowRight size={12} />
            </span>
          </div>
        </div>

        {/* Card 2: Sales & Period Udhaar (div:nth-of-type(2)) */}
        <div 
          onClick={() => navigate('/pos')}
          className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm hover:shadow-md hover:border-orange-300 transition-all cursor-pointer group flex flex-col justify-between"
        >
          <div className="flex items-start justify-between">
            <div className="space-y-1">
              <p className="text-xs text-slate-500 font-semibold uppercase tracking-wider">
                {dateFilter === 'today' ? "Today's Total Sales" : 'Total Sales Value'}
              </p>
              <h3 className="text-2xl font-bold text-slate-900">₹{totalSalesValue.toFixed(2)}</h3>
            </div>
            <div className="p-3 rounded-xl bg-orange-50 text-orange-600 group-hover:bg-orange-600 group-hover:text-white transition-colors">
              <TrendingUp size={22} />
            </div>
          </div>
          <div className="mt-3 pt-2.5 border-t border-slate-100 flex items-center justify-between text-xs">
            <span className="text-orange-600 font-semibold">
              {periodUdhaarGiven > 0 ? `₹${periodUdhaarGiven.toFixed(2)} Udhaar given` : 'All bills settled'}
            </span>
            <span className="text-slate-600 font-bold flex items-center space-x-0.5 group-hover:translate-x-0.5 transition-transform">
              <span>New Bill</span>
              <ArrowRight size={12} />
            </span>
          </div>
        </div>

        {/* Card 3: Total Outstanding Udhaar (div:nth-of-type(3)) */}
        <div 
          onClick={() => navigate('/customers')}
          className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm hover:shadow-md hover:border-red-300 transition-all cursor-pointer group flex flex-col justify-between"
        >
          <div className="flex items-start justify-between">
            <div className="space-y-1">
              <p className="text-xs text-slate-500 font-semibold uppercase tracking-wider">
                Total Market Udhaar
              </p>
              <h3 className="text-2xl font-bold text-red-600">₹{totalOutstandingUdhaar.toFixed(2)}</h3>
            </div>
            <div className="p-3 rounded-xl bg-red-50 text-red-600 group-hover:bg-red-600 group-hover:text-white transition-colors">
              <AlertCircle size={22} />
            </div>
          </div>
          <div className="mt-3 pt-2.5 border-t border-slate-100 flex items-center justify-between text-xs">
            <span className="text-slate-500 font-medium">
              {customersWithDue > 0 ? `${customersWithDue} customers owe money` : 'Zero pending dues'}
            </span>
            <span className="text-red-600 font-bold flex items-center space-x-0.5 group-hover:translate-x-0.5 transition-transform">
              <span>Udhaar Book</span>
              <ArrowRight size={12} />
            </span>
          </div>
        </div>

        {/* Card 4: Inventory Health & Low Stock (div:nth-of-type(4)) */}
        <div 
          onClick={() => navigate('/products')}
          className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm hover:shadow-md hover:border-amber-300 transition-all cursor-pointer group flex flex-col justify-between"
        >
          <div className="flex items-start justify-between">
            <div className="space-y-1">
              <p className="text-xs text-slate-500 font-semibold uppercase tracking-wider">
                Stock Attention Needed
              </p>
              <div className="flex items-baseline space-x-2">
                <h3 className="text-2xl font-bold text-amber-700">{lowStockProducts.length}</h3>
                <span className="text-xs font-semibold text-slate-500">Low stock</span>
                {outOfStockProducts.length > 0 && (
                  <span className="text-xs font-bold text-red-600 bg-red-50 px-1.5 py-0.5 rounded border border-red-200">
                    {outOfStockProducts.length} out
                  </span>
                )}
              </div>
            </div>
            <div className="p-3 rounded-xl bg-amber-50 text-amber-600 group-hover:bg-amber-600 group-hover:text-white transition-colors">
              <Package size={22} />
            </div>
          </div>
          <div className="mt-3 pt-2.5 border-t border-slate-100 flex items-center justify-between text-xs">
            <span className="text-slate-500 font-medium">{products.length} total products</span>
            <span className="text-amber-700 font-bold flex items-center space-x-0.5 group-hover:translate-x-0.5 transition-transform">
              <span>Inventory</span>
              <ArrowRight size={12} />
            </span>
          </div>
        </div>
      </div>

      {/* Main Charts & Actions Row: div:nth-of-type(3) */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Real Sales Trend Chart (lg:col-span-2) */}
        <div className="bg-white p-4 md:p-5 rounded-xl border border-slate-200 shadow-sm lg:col-span-2 space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-base font-bold text-slate-800">Daily Sales Revenue (Past 7 Days)</h3>
              <p className="text-xs text-slate-400">Calculated directly from actual completed invoices</p>
            </div>
            <button
              onClick={() => navigate('/reports')}
              className="text-xs text-blue-600 hover:text-blue-800 font-semibold flex items-center space-x-1"
            >
              <span>Detailed Reports</span>
              <ArrowRight size={12} />
            </button>
          </div>

          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#64748b' }} />
                <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#64748b' }} tickFormatter={(val) => `₹${val}`} />
                <Tooltip 
                  formatter={(val: any) => [`₹${val}`, 'Revenue Received']}
                  labelFormatter={(name, payload) => {
                    const item = payload[0]?.payload;
                    return item ? `${item.fullDate} (${item.count} orders)` : name;
                  }}
                  contentStyle={{ borderRadius: '8px', border: '1px solid #e2e8f0', fontSize: '12px' }}
                />
                <Line 
                  type="monotone" 
                  dataKey="sales" 
                  stroke="#2563eb" 
                  strokeWidth={3} 
                  dot={{ r: 4, fill: '#2563eb', strokeWidth: 2, stroke: '#ffffff' }} 
                  activeDot={{ r: 6 }} 
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Low Stock Alerts & Quick Restock Panel */}
        <div className="bg-white p-4 md:p-5 rounded-xl border border-slate-200 shadow-sm flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center space-x-2">
                <AlertTriangle className="h-4 w-4 text-amber-600" />
                <h3 className="font-bold text-sm text-slate-800">Low Stock Alerts</h3>
              </div>
              <button
                onClick={() => navigate('/products')}
                className="text-xs text-blue-600 hover:text-blue-800 font-semibold cursor-pointer"
              >
                View All
              </button>
            </div>

            <div className="mt-3 space-y-2.5 max-h-56 overflow-y-auto pr-1">
              {lowStockProducts.length === 0 && outOfStockProducts.length === 0 ? (
                <div className="py-8 text-center text-slate-400 space-y-2">
                  <CheckCircle2 size={32} className="mx-auto text-emerald-500 opacity-80" />
                  <p className="text-xs font-semibold text-slate-600">All products are well stocked!</p>
                  <p className="text-[11px] text-slate-400">No items under minimum threshold.</p>
                </div>
              ) : (
                <>
                  {outOfStockProducts.map(p => (
                    <div 
                      key={p.id} 
                      onClick={() => navigate('/products')}
                      className="flex justify-between items-center p-2 rounded-lg bg-red-50/60 border border-red-200/80 cursor-pointer hover:bg-red-50 transition-colors"
                    >
                      <div className="min-w-0 pr-2">
                        <p className="text-xs font-semibold text-slate-800 truncate">{p.name}</p>
                        <p className="text-[10px] text-slate-500">Min: {p.minStock ?? 10} {p.unit || 'kg'}</p>
                      </div>
                      <span className="text-[11px] font-bold text-red-700 bg-red-100 px-2 py-0.5 rounded-full shrink-0">
                        Out of stock
                      </span>
                    </div>
                  ))}

                  {lowStockProducts.map(p => (
                    <div 
                      key={p.id} 
                      onClick={() => navigate('/products')}
                      className="flex justify-between items-center p-2 rounded-lg bg-amber-50/60 border border-amber-200/80 cursor-pointer hover:bg-amber-50 transition-colors"
                    >
                      <div className="min-w-0 pr-2">
                        <p className="text-xs font-semibold text-slate-800 truncate">{p.name}</p>
                        <p className="text-[10px] text-slate-500">Min: {p.minStock ?? 10} {p.unit || 'kg'}</p>
                      </div>
                      <span className="text-[11px] font-bold text-amber-800 bg-amber-100 px-2 py-0.5 rounded-full shrink-0">
                        {p.stock} left
                      </span>
                    </div>
                  ))}
                </>
              )}
            </div>
          </div>

          {/* Quick Action Button */}
          <div className="pt-3 border-t border-slate-100 mt-2">
            <button
              onClick={() => navigate('/pos')}
              className="w-full py-2.5 px-3 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-lg text-xs flex items-center justify-center space-x-1.5 shadow-xs transition-colors cursor-pointer"
            >
              <ShoppingCart size={14} />
              <span>Open POS Billing</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
