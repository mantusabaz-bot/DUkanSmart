import React from 'react';
import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import { useStore } from '../store';
import { Store, LayoutDashboard, ShoppingCart, Package, Users, FileText, QrCode, LogOut, Menu } from 'lucide-react';

const NAV_ITEMS = [
  { name: 'Dashboard', path: '/', icon: LayoutDashboard },
  { name: 'POS Billing', path: '/pos', icon: ShoppingCart },
  { name: 'Products', path: '/products', icon: Package },
  { name: 'Udhaar Book', path: '/customers', icon: Users },
  { name: 'Reports', path: '/reports', icon: FileText },
  { name: 'Payment QR', path: '/payment-settings', icon: QrCode },
];

export const Layout = () => {
  const { user, logout } = useStore();
  const navigate = useNavigate();
  const [mobileMenuOpen, setMobileMenuOpen] = React.useState(false);

  if (!user) {
    return <Outlet />;
  }

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <div className="flex h-screen bg-slate-50">
      {/* Desktop Sidebar */}
      <aside className="hidden md:flex w-64 flex-col bg-white border-r border-slate-200">
        <div className="p-4 flex items-center space-x-2 border-b border-slate-100">
          <div className="bg-blue-600 p-1.5 rounded-lg">
            <Store className="h-6 w-6 text-white" />
          </div>
          <div>
            <h1 className="font-bold text-xl text-slate-800">DukaanSmart</h1>
            <p className="text-xs text-slate-500 truncate">{user.shopName}</p>
          </div>
        </div>
        
        <nav className="flex-1 overflow-y-auto py-4">
          <ul className="space-y-1 px-3">
            {NAV_ITEMS.map((item) => (
              <li key={item.path}>
                <NavLink
                  to={item.path}
                  className={({ isActive }) =>
                    `flex items-center space-x-3 px-3 py-2 rounded-md transition-colors ${
                      isActive 
                        ? 'bg-blue-50 text-blue-700 font-medium' 
                        : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
                    }`
                  }
                >
                  <item.icon className="h-5 w-5" />
                  <span>{item.name}</span>
                </NavLink>
              </li>
            ))}
          </ul>
        </nav>

        <div className="p-4 border-t border-slate-200">
          <button 
            onClick={handleLogout}
            className="flex items-center space-x-3 text-slate-600 hover:text-red-600 transition-colors w-full px-3 py-2"
          >
            <LogOut className="h-5 w-5" />
            <span>Logout</span>
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* Mobile Header */}
        <header className="md:hidden bg-white border-b border-slate-200 p-4 flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <Store className="h-6 w-6 text-blue-600" />
            <h1 className="font-bold text-lg text-slate-800">DukaanSmart</h1>
          </div>
          <button onClick={handleLogout} className="text-slate-500">
            <LogOut className="h-5 w-5" />
          </button>
        </header>

        <div className="flex-1 overflow-auto p-4 md:p-6 pb-20 md:pb-6">
          <Outlet />
        </div>
      </main>

      {/* Mobile Bottom Nav */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 bg-white border-t border-slate-200 flex justify-around p-1.5 pb-safe z-40 shadow-lg">
        {NAV_ITEMS.map((item) => (
          <NavLink
            key={item.path}
            to={item.path}
            className={({ isActive }) =>
              `flex flex-col items-center p-1 rounded-lg ${
                isActive ? 'text-blue-600 font-bold' : 'text-slate-500'
              }`
            }
          >
            <item.icon className="h-4 w-4 mb-0.5" />
            <span className="text-[9px] font-medium leading-tight">{item.name}</span>
          </NavLink>
        ))}
      </nav>
    </div>
  );
};
