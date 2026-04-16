import React, { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { 
  LayoutDashboard, 
  MapPin, 
  FileText, 
  Users, 
  UserSquare2, 
  Car, 
  IndianRupee, 
  Menu, 
  X,
  PlusCircle,
  LogOut,
  Cloud,
  CloudOff,
  RefreshCw,
  CheckCircle2
} from 'lucide-react';
import { useAuth } from '../services/AuthContext';
import { useDrive } from '../services/useDrive';

interface SidebarItemProps {
  to: string;
  icon: React.ReactNode;
  label: string;
  active: boolean;
  onClick?: () => void;
}

const SidebarItem = ({ to, icon, label, active, onClick }: SidebarItemProps) => {
  return (
    <Link
      to={to}
      onClick={onClick}
      className={`flex items-center gap-3 px-4 py-3 rounded-lg transition-all duration-200 group ${
        active 
          ? 'bg-slate-900 text-white shadow-lg shadow-slate-200' 
          : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
      }`}
    >
      <div className={`${active ? 'text-white' : 'text-slate-400 group-hover:text-slate-900'}`}>
        {icon}
      </div>
      <span className="font-medium">{label}</span>
    </Link>
  );
};

export default function Layout({ children }: { children: React.ReactNode }) {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const location = useLocation();
  const { logout } = useAuth();
  const { signOut, isSignedIn, signIn } = useDrive();

  const navItems = [
    { to: '/', icon: <LayoutDashboard size={20} />, label: 'Dashboard' },
    { to: '/trips', icon: <MapPin size={20} />, label: 'Trips' },
    { to: '/invoices', icon: <FileText size={20} />, label: 'Invoices' },
    { to: '/customers', icon: <Users size={20} />, label: 'Customers' },
    { to: '/drivers', icon: <UserSquare2 size={20} />, label: 'Drivers' },
    { to: '/cars', icon: <Car size={20} />, label: 'Cars' },
    { to: '/accounts', icon: <IndianRupee size={20} />, label: 'Accounts' },
  ];

  const handleLogout = () => {
    signOut();
    logout();
  };

  return (
    <div className="min-h-screen bg-slate-50 flex">
      {/* Mobile Sidebar Toggle */}
      <button 
        className="lg:hidden fixed bottom-6 right-6 z-50 bg-slate-900 text-white p-4 rounded-full shadow-xl"
        onClick={() => setIsSidebarOpen(!isSidebarOpen)}
      >
        {isSidebarOpen ? <X size={24} /> : <Menu size={24} />}
      </button>

      {/* Sidebar Overlay */}
      {isSidebarOpen && (
        <div 
          className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-40 lg:hidden"
          onClick={() => setIsSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside className={`
        fixed inset-y-0 left-0 z-40 w-72 bg-white border-r border-slate-200 transform transition-transform duration-300 ease-in-out lg:translate-x-0 lg:static flex flex-col
        ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full'}
      `}>
        <div className="p-6 border-b border-slate-100">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-slate-900 rounded-xl flex items-center justify-center text-white">
              <Car size={24} fill="white" />
            </div>
            <div>
              <h2 className="font-bold text-slate-900 leading-tight">Gokilam</h2>
              <p className="text-xs text-slate-500 font-medium tracking-wider uppercase">Enterprise ERP</p>
            </div>
          </div>
        </div>

        <nav className="flex-1 p-4 space-y-2 overflow-y-auto mt-4">
          {navItems.map((item) => (
            <SidebarItem
              key={item.to}
              to={item.to}
              icon={item.icon}
              label={item.label}
              active={location.pathname === item.to}
              onClick={() => setIsSidebarOpen(false)}
            />
          ))}
        </nav>

        <div className="p-4 border-t border-slate-100 bg-slate-50/50">
          {/* Cloud Sync Status */}
          <div className="mb-6 p-4 bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden relative group">
             <div className="flex justify-between items-start mb-2">
                <div className={`p-2 rounded-lg ${isSignedIn ? 'bg-emerald-50 text-emerald-600' : 'bg-rose-50 text-rose-600'}`}>
                    {isSignedIn ? <Cloud size={18} /> : <CloudOff size={18} />}
                </div>
                {isSignedIn && (
                    <button 
                        onClick={() => signOut()}
                        className="text-[10px] font-black text-slate-400 hover:text-rose-600 uppercase tracking-widest transition-colors"
                    >
                        Disconnect
                    </button>
                )}
             </div>
             
             <div className="space-y-1">
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Cloud Storage</p>
                <div className="flex items-center gap-2">
                    <h4 className="text-sm font-black text-slate-900 leading-tight">
                        {isSignedIn ? 'Google Connected' : 'Drive Disconnected'}
                    </h4>
                    {isSignedIn && <CheckCircle2 size={12} className="text-emerald-500" />}
                </div>
                {!isSignedIn && (
                    <button 
                        onClick={() => signIn()}
                        className="mt-3 w-full py-2 bg-slate-900 text-white rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-slate-800 transition-all flex items-center justify-center gap-2"
                    >
                        <RefreshCw size={12} className="group-hover:rotate-180 transition-transform duration-500" />
                        Connect Now
                    </button>
                )}
             </div>
          </div>

          <Link
            to="/create"
            className="flex items-center justify-center gap-2 w-full py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-semibold transition-all shadow-md hover:shadow-lg mb-4"
            onClick={() => setIsSidebarOpen(false)}
          >
            <PlusCircle size={20} />
            New Trip/Invoice
          </Link>
          
          <button 
            onClick={handleLogout}
            className="flex items-center gap-3 w-full px-4 py-3 text-slate-500 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors font-medium border border-transparent hover:border-red-100"
          >
            <LogOut size={20} />
            Logout
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 w-full relative">
        <div className="h-full">
          {/* Header/Top Bar */}
          <header className="sticky top-0 z-30 bg-white/80 backdrop-blur-md border-b border-slate-200 px-6 py-4 flex justify-between items-center sm:hidden lg:flex">
             <div className="flex items-center gap-2">
                <span className="text-sm font-medium text-slate-400 capitalize">{location.pathname.replace('/', '') || 'Dashboard'}</span>
             </div>
             <div className="flex items-center gap-4">
                <div className="text-right hidden sm:block">
                  <p className="text-sm font-bold text-slate-900">SRI GOKILAM TRAVELS</p>
                  <p className="text-xs text-slate-500">Administrator</p>
                </div>
                <div className="w-10 h-10 rounded-full bg-slate-100 border border-slate-200 flex items-center justify-center text-slate-600 font-bold">
                  G
                </div>
             </div>
          </header>

          <div className="p-6 lg:p-10 max-w-7xl mx-auto">
            {children}
          </div>
        </div>
      </main>
    </div>
  );
}
