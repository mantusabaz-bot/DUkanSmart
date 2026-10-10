import React, { useState, useMemo } from 'react';
import { useStore } from '../store';
import { 
  Plus, Edit, Trash2, X, Search, Filter, AlertTriangle, AlertCircle, 
  CheckCircle2, Package, Boxes, ArrowUpRight, PlusCircle, Check 
} from 'lucide-react';
import { ProductUnit } from '../types';

export type StockStatus = 'In Stock' | 'Low Stock' | 'Out of Stock';

export function getStockStatus(stock: number, minStock: number = 10): StockStatus {
  if (stock <= 0) return 'Out of Stock';
  if (stock <= minStock) return 'Low Stock';
  return 'In Stock';
}

export default function Products() {
  const { products, addProduct, updateProduct, deleteProduct, resetSampleData } = useStore();
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [stockFilter, setStockFilter] = useState<'all' | 'in_stock' | 'low_stock' | 'out_of_stock'>('all');

  // Add/Edit Product Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    sku: '',
    category: 'Grocery',
    costPrice: '',
    sellingPrice: '',
    stock: '',
    minStock: '10',
    unit: 'kg' as ProductUnit
  });

  // Quick Restock Modal State
  const [restockProduct, setRestockProduct] = useState<{ id: string; name: string; currentStock: number; unit: string; minStock: number } | null>(null);
  const [restockAmount, setRestockAmount] = useState<string>('10');
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => {
      setToastMessage(prev => prev === msg ? null : prev);
    }, 3500);
  };

  // Stock counts dynamically calculated from actual database records
  const inStockCount = useMemo(() => {
    return products.filter(p => getStockStatus(p.stock, p.minStock ?? 10) === 'In Stock').length;
  }, [products]);

  const lowStockCount = useMemo(() => {
    return products.filter(p => getStockStatus(p.stock, p.minStock ?? 10) === 'Low Stock').length;
  }, [products]);

  const outOfStockCount = useMemo(() => {
    return products.filter(p => getStockStatus(p.stock, p.minStock ?? 10) === 'Out of Stock').length;
  }, [products]);

  // Categories list
  const categories = useMemo(() => {
    return ['All', ...Array.from(new Set(products.map(p => p.category || 'General')))];
  }, [products]);

  // Filter products by search, category, and automatic stock status
  const filteredProducts = useMemo(() => {
    return products.filter(p => {
      const q = searchTerm.toLowerCase().trim();
      const matchesSearch = q === '' || 
        p.name.toLowerCase().includes(q) || 
        p.sku.toLowerCase().includes(q) || 
        p.category.toLowerCase().includes(q);

      const matchesCategory = selectedCategory === 'All' || p.category === selectedCategory;

      const status = getStockStatus(p.stock, p.minStock ?? 10);
      let matchesStock = true;
      if (stockFilter === 'in_stock') matchesStock = status === 'In Stock';
      if (stockFilter === 'low_stock') matchesStock = status === 'Low Stock';
      if (stockFilter === 'out_of_stock') matchesStock = status === 'Out of Stock';

      return matchesSearch && matchesCategory && matchesStock;
    });
  }, [products, searchTerm, selectedCategory, stockFilter]);

  const handleOpen = (product?: any) => {
    if (product) {
      setEditingId(product.id);
      setFormData({
        name: product.name,
        sku: product.sku,
        category: product.category,
        costPrice: product.costPrice.toString(),
        sellingPrice: product.sellingPrice.toString(),
        stock: product.stock.toString(),
        minStock: (product.minStock ?? 10).toString(),
        unit: (product.unit || 'kg') as ProductUnit
      });
    } else {
      setEditingId(null);
      setFormData({ 
        name: '', 
        sku: `SKU-${Date.now().toString().slice(-4)}`, 
        category: 'Grocery', 
        costPrice: '', 
        sellingPrice: '', 
        stock: '20', 
        minStock: '10', 
        unit: 'kg' 
      });
    }
    setIsModalOpen(true);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const data = {
      name: formData.name.trim(),
      sku: formData.sku.trim(),
      category: formData.category.trim(),
      costPrice: parseFloat(formData.costPrice) || 0,
      sellingPrice: parseFloat(formData.sellingPrice) || 0,
      stock: parseFloat(formData.stock) || 0,
      minStock: parseFloat(formData.minStock) || 10,
      unit: formData.unit
    };

    if (editingId) {
      updateProduct(editingId, data);
      showToast(`Updated product "${data.name}"`);
    } else {
      addProduct(data);
      showToast(`Added product "${data.name}" to inventory`);
    }
    setIsModalOpen(false);
  };

  const handleRestockSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!restockProduct) return;
    const added = parseFloat(restockAmount);
    if (isNaN(added) || added <= 0) {
      showToast('Please enter a valid stock quantity');
      return;
    }
    const newStock = parseFloat((restockProduct.currentStock + added).toFixed(2));
    updateProduct(restockProduct.id, { stock: newStock });
    showToast(`Restocked ${restockProduct.name}! New stock: ${newStock} ${restockProduct.unit}`);
    setRestockProduct(null);
  };

  return (
    <div className="space-y-5 relative h-full flex flex-col">
      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed top-4 right-4 z-50 flex items-center space-x-2 bg-slate-900 text-white px-4 py-2.5 rounded-xl shadow-lg text-xs font-semibold animate-in fade-in slide-in-from-top-2">
          <CheckCircle2 size={16} className="text-emerald-400" />
          <span>{toastMessage}</span>
          <button onClick={() => setToastMessage(null)} className="ml-2 text-slate-400 hover:text-white">
            <X size={14} />
          </button>
        </div>
      )}

      {/* Header Container & 4 Inventory Summary Cards: div:nth-of-type(1) */}
      <div className="space-y-4">
        {/* Title & Top Action Buttons */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
          <div>
            <h2 className="text-2xl font-bold text-slate-800">Inventory Management</h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Live stock status detection, thresholds, and automatic stock reordering
            </p>
          </div>
          <div className="flex items-center space-x-2">
            {products.length === 0 && (
              <button
                onClick={resetSampleData}
                className="px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold rounded-lg border border-slate-300 cursor-pointer"
              >
                Load Demo Inventory
              </button>
            )}
            <button 
              onClick={() => handleOpen()}
              className="bg-blue-600 text-white px-4 py-2 rounded-lg flex items-center space-x-2 hover:bg-blue-700 font-semibold text-xs shadow-xs cursor-pointer transition-all active:scale-[0.99]"
            >
              <Plus size={16} />
              <span>Add New Product</span>
            </button>
          </div>
        </div>

        {/* REQUIREMENT 7: 4 INVENTORY SUMMARY CARDS */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3.5">
          {/* Card 1: All Products */}
          <div 
            onClick={() => setStockFilter('all')}
            className={`p-3.5 rounded-xl border transition-all cursor-pointer ${
              stockFilter === 'all'
                ? 'bg-blue-50/70 border-blue-500 shadow-xs ring-2 ring-blue-500/20'
                : 'bg-white border-slate-200 hover:border-slate-300 hover:shadow-2xs'
            }`}
          >
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-slate-600">All Products</span>
              <div className="p-2 rounded-lg bg-blue-100 text-blue-700">
                <Package size={16} />
              </div>
            </div>
            <div className="mt-2 flex items-baseline space-x-2">
              <span className="text-2xl font-bold text-slate-900">{products.length}</span>
              <span className="text-[11px] text-slate-500 font-medium">SKU Items</span>
            </div>
            <p className="text-[11px] text-slate-400 mt-1">Complete store catalog</p>
          </div>

          {/* Card 2: In Stock */}
          <div 
            onClick={() => setStockFilter('in_stock')}
            className={`p-3.5 rounded-xl border transition-all cursor-pointer ${
              stockFilter === 'in_stock'
                ? 'bg-emerald-50/80 border-emerald-500 shadow-xs ring-2 ring-emerald-500/20'
                : 'bg-white border-slate-200 hover:border-emerald-300 hover:shadow-2xs'
            }`}
          >
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-emerald-800">In Stock</span>
              <div className="p-2 rounded-lg bg-emerald-100 text-emerald-700">
                <CheckCircle2 size={16} />
              </div>
            </div>
            <div className="mt-2 flex items-baseline space-x-2">
              <span className="text-2xl font-bold text-emerald-700">{inStockCount}</span>
              <span className="text-[11px] text-emerald-600 font-medium">Available</span>
            </div>
            <p className="text-[11px] text-emerald-600/80 mt-1">&gt; threshold level</p>
          </div>

          {/* Card 3: Low Stock */}
          <div 
            onClick={() => setStockFilter('low_stock')}
            className={`p-3.5 rounded-xl border transition-all cursor-pointer ${
              stockFilter === 'low_stock'
                ? 'bg-amber-50/80 border-amber-500 shadow-xs ring-2 ring-amber-500/20'
                : 'bg-white border-slate-200 hover:border-amber-300 hover:shadow-2xs'
            }`}
          >
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-amber-800">Low Stock</span>
              <div className="p-2 rounded-lg bg-amber-100 text-amber-700">
                <AlertTriangle size={16} />
              </div>
            </div>
            <div className="mt-2 flex items-baseline space-x-2">
              <span className="text-2xl font-bold text-amber-700">{lowStockCount}</span>
              <span className="text-[11px] text-amber-600 font-medium">Near limit</span>
            </div>
            <p className="text-[11px] text-amber-600/80 mt-1">&le; min threshold</p>
          </div>

          {/* Card 4: Out of Stock */}
          <div 
            onClick={() => setStockFilter('out_of_stock')}
            className={`p-3.5 rounded-xl border transition-all cursor-pointer ${
              stockFilter === 'out_of_stock'
                ? 'bg-red-50/80 border-red-500 shadow-xs ring-2 ring-red-500/20'
                : 'bg-white border-slate-200 hover:border-red-300 hover:shadow-2xs'
            }`}
          >
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-red-800">Out of Stock</span>
              <div className="p-2 rounded-lg bg-red-100 text-red-700">
                <AlertCircle size={16} />
              </div>
            </div>
            <div className="mt-2 flex items-baseline space-x-2">
              <span className="text-2xl font-bold text-red-700">{outOfStockCount}</span>
              <span className="text-[11px] text-red-600 font-medium">Empty items</span>
            </div>
            <p className="text-[11px] text-red-600/80 mt-1">Stock is 0 units</p>
          </div>
        </div>
      </div>

      {/* Search & Stock Filter Bar: div:nth-of-type(2) */}
      <div className="bg-white p-3.5 rounded-xl border border-gray-200 shadow-2xs space-y-3">
        {/* Top Controls Row: div:nth-of-type(1) */}
        <div className="flex flex-col md:flex-row items-center justify-between gap-3">
          {/* Search Input: div:nth-of-type(1) */}
          <div className="relative w-full md:w-80">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 h-4 w-4" />
            <input 
              type="text"
              placeholder="Search products by name, SKU, or category..."
              className="w-full pl-9 pr-8 py-2 bg-slate-50 border border-gray-200 rounded-lg text-xs md:text-sm focus:outline-none focus:ring-1 focus:ring-blue-500"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
            {searchTerm && (
              <button onClick={() => setSearchTerm('')} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 cursor-pointer">
                <X size={14} />
              </button>
            )}
          </div>

          {/* Filter Tabs Container: div:nth-of-type(2) */}
          <div className="flex items-center space-x-1.5 w-full md:w-auto overflow-x-auto text-xs">
            {/* button:nth-of-type(1) */}
            <button
              type="button"
              onClick={() => setStockFilter('all')}
              className={`px-3 py-1.5 rounded-lg font-semibold transition-colors cursor-pointer whitespace-nowrap ${
                stockFilter === 'all' 
                  ? 'bg-blue-600 text-white shadow-xs' 
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              All ({products.length})
            </button>

            {/* button:nth-of-type(2) -> contains span:nth-of-type(2) targeted by selector 1 */}
            <button
              type="button"
              onClick={() => setStockFilter('in_stock')}
              className={`px-3 py-1.5 rounded-lg font-semibold transition-colors cursor-pointer flex items-center space-x-1.5 whitespace-nowrap ${
                stockFilter === 'in_stock' 
                  ? 'bg-emerald-600 text-white shadow-xs ring-1 ring-emerald-500' 
                  : 'bg-emerald-50 text-emerald-800 hover:bg-emerald-100 border border-emerald-200'
              }`}
            >
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 shrink-0"></span>
              <span>In Stock ({inStockCount})</span>
            </button>

            {/* button:nth-of-type(3) -> targeted by selector 2 */}
            <button
              type="button"
              onClick={() => setStockFilter('low_stock')}
              className={`px-3 py-1.5 rounded-lg font-semibold transition-colors cursor-pointer whitespace-nowrap ${
                stockFilter === 'low_stock' 
                  ? 'bg-amber-600 text-white shadow-xs ring-1 ring-amber-500' 
                  : 'bg-amber-50 text-amber-800 hover:bg-amber-100 border border-amber-200'
              }`}
            >
              Low Stock ({lowStockCount})
            </button>

            {/* button:nth-of-type(4) -> targeted by selector 3 */}
            <button
              type="button"
              onClick={() => setStockFilter('out_of_stock')}
              className={`px-3 py-1.5 rounded-lg font-semibold transition-colors cursor-pointer whitespace-nowrap ${
                stockFilter === 'out_of_stock' 
                  ? 'bg-red-600 text-white shadow-xs ring-1 ring-red-500' 
                  : 'bg-red-50 text-red-800 hover:bg-red-100 border border-red-200'
              }`}
            >
              Out of Stock ({outOfStockCount})
            </button>
          </div>
        </div>

        {/* Category Pills Row */}
        <div className="flex items-center space-x-1.5 overflow-x-auto pt-1 border-t border-slate-100 text-xs">
          <span className="text-[11px] font-semibold text-slate-400 mr-1 flex items-center space-x-1">
            <Filter size={11} />
            <span>Category:</span>
          </span>
          {categories.map(cat => (
            <button
              key={cat}
              type="button"
              onClick={() => setSelectedCategory(cat)}
              className={`px-2.5 py-1 rounded-full text-[11px] font-semibold whitespace-nowrap cursor-pointer transition-colors ${
                selectedCategory === cat
                  ? 'bg-slate-800 text-white'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200 border border-slate-200/60'
              }`}
            >
              {cat}
            </button>
          ))}
        </div>
      </div>

      {/* Warnings & Status Alerts Banner */}
      {stockFilter === 'low_stock' && lowStockCount > 0 && (
        <div className="bg-amber-50 border border-amber-200 p-3 rounded-xl flex items-center space-x-2 text-xs text-amber-900 animate-in fade-in">
          <AlertTriangle size={16} className="text-amber-600 shrink-0" />
          <span className="font-semibold">Low stock! Please restock this product before inventory runs out.</span>
        </div>
      )}

      {stockFilter === 'out_of_stock' && outOfStockCount > 0 && (
        <div className="bg-red-50 border border-red-200 p-3 rounded-xl flex items-center space-x-2 text-xs text-red-900 animate-in fade-in">
          <AlertCircle size={16} className="text-red-600 shrink-0" />
          <span className="font-semibold">This product is out of stock. Customers cannot purchase these items until replenished.</span>
        </div>
      )}

      {/* Main Inventory Table */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden flex-1 flex flex-col">
        <div className="overflow-x-auto flex-1">
          <table className="w-full text-left text-xs md:text-sm whitespace-nowrap">
            <thead className="bg-gray-50 text-gray-600 border-b border-gray-200 font-semibold text-xs">
              <tr>
                <th className="p-3.5">SKU</th>
                <th className="p-3.5">Product Name</th>
                <th className="p-3.5">Category</th>
                <th className="p-3.5">Unit</th>
                <th className="p-3.5">Cost Price</th>
                <th className="p-3.5">Selling Price</th>
                <th className="p-3.5">Current Stock</th>
                <th className="p-3.5">Stock Status</th>
                <th className="p-3.5 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {filteredProducts.map(product => {
                const threshold = product.minStock ?? 10;
                const status = getStockStatus(product.stock, threshold);
                const unit = product.unit || 'kg';

                return (
                  <tr key={product.id} className="hover:bg-slate-50/80 transition-colors">
                    <td className="p-3.5 text-gray-500 font-mono text-xs">{product.sku}</td>
                    <td className="p-3.5 font-semibold text-slate-900">{product.name}</td>
                    <td className="p-3.5 text-slate-600">{product.category}</td>
                    <td className="p-3.5">
                      <span className="bg-slate-100 text-slate-700 px-2 py-0.5 rounded text-[11px] font-bold uppercase border border-slate-200">
                        {unit}
                      </span>
                    </td>
                    <td className="p-3.5 text-slate-600">₹{product.costPrice}</td>
                    <td className="p-3.5 text-blue-600 font-bold">₹{product.sellingPrice}</td>
                    <td className="p-3.5">
                      <div className="flex flex-col">
                        <span className="font-bold text-slate-800">
                          {product.stock} {unit}
                        </span>
                        <span className="text-[10px] text-slate-400">
                          Threshold: {threshold} {unit}
                        </span>
                      </div>
                    </td>
                    <td className="p-3.5">
                      {status === 'In Stock' && (
                        <span className="inline-flex items-center space-x-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-100 text-emerald-800 border border-emerald-200">
                          <CheckCircle2 size={12} className="text-emerald-600" />
                          <span>In Stock</span>
                        </span>
                      )}
                      {status === 'Low Stock' && (
                        <span className="inline-flex items-center space-x-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-amber-100 text-amber-800 border border-amber-200">
                          <AlertTriangle size={12} className="text-amber-600" />
                          <span>Low Stock</span>
                        </span>
                      )}
                      {status === 'Out of Stock' && (
                        <span className="inline-flex items-center space-x-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-red-100 text-red-800 border border-red-200">
                          <AlertCircle size={12} className="text-red-600" />
                          <span>Out of Stock</span>
                        </span>
                      )}
                    </td>
                    <td className="p-3.5 text-right space-x-1.5">
                      {/* REQUIREMENTS 3 & 4: Restock / Add Stock Quick Button */}
                      {status === 'Low Stock' && (
                        <button
                          type="button"
                          onClick={() => {
                            setRestockProduct({ id: product.id, name: product.name, currentStock: product.stock, unit, minStock: threshold });
                            setRestockAmount('20');
                          }}
                          className="px-2.5 py-1 bg-amber-50 hover:bg-amber-100 text-amber-800 border border-amber-300 rounded-lg text-xs font-bold cursor-pointer transition-colors shadow-2xs"
                        >
                          + Restock
                        </button>
                      )}
                      {status === 'Out of Stock' && (
                        <button
                          type="button"
                          onClick={() => {
                            setRestockProduct({ id: product.id, name: product.name, currentStock: product.stock, unit, minStock: threshold });
                            setRestockAmount('25');
                          }}
                          className="px-2.5 py-1 bg-red-50 hover:bg-red-100 text-red-800 border border-red-300 rounded-lg text-xs font-bold cursor-pointer transition-colors shadow-2xs"
                        >
                          + Add Stock
                        </button>
                      )}
                      {status === 'In Stock' && (
                        <button
                          type="button"
                          onClick={() => {
                            setRestockProduct({ id: product.id, name: product.name, currentStock: product.stock, unit, minStock: threshold });
                            setRestockAmount('10');
                          }}
                          className="px-2 py-1 bg-slate-50 hover:bg-slate-100 text-slate-700 border border-slate-200 rounded-lg text-xs font-semibold cursor-pointer transition-colors shadow-2xs"
                          title="Add more stock"
                        >
                          + Stock
                        </button>
                      )}
                      <button 
                        onClick={() => handleOpen(product)} 
                        className="p-1.5 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded cursor-pointer"
                        title="Edit product"
                      >
                        <Edit size={16}/>
                      </button>
                      <button 
                        onClick={() => {
                          if (confirm(`Are you sure you want to delete ${product.name}?`)) {
                            deleteProduct(product.id);
                            showToast(`Deleted ${product.name}`);
                          }
                        }} 
                        className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded cursor-pointer"
                        title="Delete product"
                      >
                        <Trash2 size={16}/>
                      </button>
                    </td>
                  </tr>
                );
              })}
              {filteredProducts.length === 0 && (
                <tr>
                  <td colSpan={9} className="p-10 text-center text-gray-400 space-y-2">
                    <p className="text-sm font-semibold text-slate-600">No products match your current filter.</p>
                    <p className="text-xs text-slate-400">
                      {stockFilter === 'out_of_stock' 
                        ? 'Great! You have no products that are out of stock.' 
                        : stockFilter === 'low_stock' 
                          ? 'All inventory items are above their minimum low-stock alert thresholds.' 
                          : 'Try clearing your search query or switching filters.'}
                    </p>
                    <button
                      type="button"
                      onClick={() => {
                        setSearchTerm('');
                        setStockFilter('all');
                        setSelectedCategory('All');
                      }}
                      className="mt-2 px-3 py-1.5 bg-blue-50 text-blue-700 rounded-lg text-xs font-bold border border-blue-200 hover:bg-blue-100 cursor-pointer"
                    >
                      Clear Filters
                    </button>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* QUICK RESTOCK MODAL */}
      {restockProduct && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-2xs flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-sm p-5 space-y-4 animate-in fade-in zoom-in-95">
            <div className="flex justify-between items-center border-b border-slate-100 pb-3">
              <div>
                <h3 className="font-bold text-slate-800 text-sm">
                  Restock Inventory
                </h3>
                <p className="text-xs text-slate-500 truncate max-w-[240px]">{restockProduct.name}</p>
              </div>
              <button onClick={() => setRestockProduct(null)} className="text-slate-400 hover:text-slate-600 cursor-pointer">
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleRestockSubmit} className="space-y-4">
              <div className="bg-slate-50 p-3 rounded-xl border border-slate-200 space-y-1">
                <div className="flex justify-between text-xs text-slate-600">
                  <span>Current Stock:</span>
                  <span className="font-bold text-slate-900">{restockProduct.currentStock} {restockProduct.unit}</span>
                </div>
                <div className="flex justify-between text-xs text-slate-600">
                  <span>Alert Threshold:</span>
                  <span className="font-medium text-slate-700">{restockProduct.minStock} {restockProduct.unit}</span>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Quantity to Add ({restockProduct.unit}) *
                </label>
                <input 
                  required
                  type="number"
                  step="any"
                  min="0.1"
                  className="w-full border border-slate-200 rounded-lg p-2.5 text-sm font-bold text-slate-800 focus:ring-1 focus:ring-blue-500"
                  value={restockAmount}
                  onChange={e => setRestockAmount(e.target.value)}
                />
              </div>

              {/* Quick Presets */}
              <div className="space-y-1">
                <span className="text-[11px] text-slate-400 font-semibold">Quick Add:</span>
                <div className="flex space-x-1.5">
                  {[5, 10, 25, 50, 100].map(amt => (
                    <button
                      key={amt}
                      type="button"
                      onClick={() => setRestockAmount(amt.toString())}
                      className="flex-1 py-1 bg-slate-100 hover:bg-blue-50 hover:text-blue-700 text-slate-700 rounded text-xs font-bold border border-slate-200 cursor-pointer"
                    >
                      +{amt}
                    </button>
                  ))}
                </div>
              </div>

              <div className="pt-2 flex space-x-2">
                <button
                  type="button"
                  onClick={() => setRestockProduct(null)}
                  className="flex-1 py-2 border border-slate-200 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-50 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 py-2 bg-blue-600 text-white rounded-xl text-xs font-bold hover:bg-blue-700 shadow-xs cursor-pointer"
                >
                  Confirm Restock
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ADD / EDIT PRODUCT MODAL (with customized threshold) */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-2xs flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md max-h-full overflow-y-auto">
            <div className="flex justify-between items-center p-4 border-b border-gray-100">
              <h3 className="font-bold text-slate-900 text-base">{editingId ? 'Edit Product' : 'Add New Product'}</h3>
              <button onClick={() => setIsModalOpen(false)} className="text-gray-400 hover:text-gray-600 cursor-pointer">
                <X size={20}/>
              </button>
            </div>
            <form onSubmit={handleSubmit} className="p-4 space-y-3.5">
              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">Product Name *</label>
                <input required type="text" placeholder="e.g. Shudh Chakki Atta / Basmati Rice" className="w-full border border-gray-300 rounded-lg p-2 text-sm focus:ring-blue-500 focus:border-blue-500" value={formData.name} onChange={e=>setFormData({...formData, name: e.target.value})} />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">SKU / Code *</label>
                  <input required type="text" placeholder="GRO-001" className="w-full border border-gray-300 rounded-lg p-2 text-sm focus:ring-blue-500 focus:border-blue-500" value={formData.sku} onChange={e=>setFormData({...formData, sku: e.target.value})} />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">Category *</label>
                  <input required type="text" placeholder="Grocery / Snacks" className="w-full border border-gray-300 rounded-lg p-2 text-sm focus:ring-blue-500 focus:border-blue-500" value={formData.category} onChange={e=>setFormData({...formData, category: e.target.value})} />
                </div>
              </div>

              {/* Unit Selection */}
              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">Selling Unit *</label>
                <select
                  className="w-full border border-gray-300 rounded-lg p-2 bg-white text-xs font-medium focus:ring-blue-500 focus:border-blue-500"
                  value={formData.unit}
                  onChange={e => setFormData({...formData, unit: e.target.value as ProductUnit})}
                >
                  <option value="kg">kg (Kilogram - Atta, Rice, Sugar, Loose items)</option>
                  <option value="g">g (Gram - Spices, Dry Fruits)</option>
                  <option value="pcs">pcs (Pieces - Soap, Packaged goods)</option>
                  <option value="litre">litre (Litre - Edible Oil, Milk)</option>
                  <option value="ml">ml (Millilitre)</option>
                  <option value="pack">pack (Pack / Box)</option>
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">Cost Price (₹/{formData.unit})</label>
                  <input required type="number" step="0.01" className="w-full border border-gray-300 rounded-lg p-2 text-sm focus:ring-blue-500 focus:border-blue-500" value={formData.costPrice} onChange={e=>setFormData({...formData, costPrice: e.target.value})} />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">Selling Price (₹/{formData.unit})</label>
                  <input required type="number" step="0.01" className="w-full border border-gray-300 rounded-lg p-2 text-sm focus:ring-blue-500 focus:border-blue-500" value={formData.sellingPrice} onChange={e=>setFormData({...formData, sellingPrice: e.target.value})} />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">Current Stock ({formData.unit}) *</label>
                  <input required type="number" step="any" className="w-full border border-gray-300 rounded-lg p-2 text-sm focus:ring-blue-500 focus:border-blue-500" value={formData.stock} onChange={e=>setFormData({...formData, stock: e.target.value})} />
                </div>
                <div>
                  {/* REQUIREMENT 5: Configurable Low Stock Threshold */}
                  <label className="block text-xs font-semibold text-gray-700 mb-1">Low-Stock Alert Level ({formData.unit}) *</label>
                  <input required type="number" step="any" placeholder="10" className="w-full border border-gray-300 rounded-lg p-2 text-sm focus:ring-blue-500 focus:border-blue-500" value={formData.minStock} onChange={e=>setFormData({...formData, minStock: e.target.value})} />
                  <span className="text-[10px] text-slate-400">Default: 10 units</span>
                </div>
              </div>

              <div className="pt-3 flex justify-end space-x-2 border-t border-gray-100">
                <button type="button" onClick={() => setIsModalOpen(false)} className="px-4 py-2 border border-gray-300 rounded-lg text-xs font-semibold text-gray-700 hover:bg-gray-50 cursor-pointer">Cancel</button>
                <button type="submit" className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-xs font-bold shadow-xs cursor-pointer">Save Product</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
