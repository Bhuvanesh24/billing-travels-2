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
  LogOut,
  CloudOff,
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
      className={`flex items-center gap-3 px-3 py-2 rounded-md transition-all duration-200 group ${
        active 
          ? 'bg-blue-50 text-blue-700 shadow-sm border border-blue-100' 
          : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900 border border-transparent'
      }`}
    >
      <div className={`${active ? 'text-blue-600' : 'text-slate-400 group-hover:text-slate-600'}`}>
        {icon}
      </div>
      <span className="font-semibold text-sm">{label}</span>
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
        className="lg:hidden fixed top-6 right-6 z-50 bg-slate-900 text-white p-4 rounded-xl shadow-xl"
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
        fixed inset-y-0 left-0 z-40 w-64 min-w-[16rem] flex-shrink-0 bg-white border-r border-slate-200 transform transition-transform duration-300 ease-in-out lg:translate-x-0 lg:static flex flex-col shadow-sm
        ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full'}
      `}>
        <div className="p-4 border-b border-slate-200">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-blue-600 rounded flex items-center justify-center text-white">
              <Car size={18} fill="white" />
            </div>
            <div>
              <h2 className="font-bold text-slate-800 text-sm leading-tight">Gokilam</h2>
              <p className="text-[10px] text-slate-500 font-semibold tracking-wider uppercase">ERP System</p>
            </div>
          </div>
        </div>

        <nav className="flex-1 p-4 space-y-1 overflow-y-auto mt-2">
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
      </aside>

      {/* Main Content */}
      <main className="flex-1 w-full relative overflow-x-hidden">
        <div className="h-full">
          {/* Header/Top Bar */}
          <header className="sticky top-0 z-30 bg-white/90 backdrop-blur border-b border-slate-200 px-4 py-2.5 flex justify-between items-center sm:hidden lg:flex">
             <div className="flex items-center gap-2">
                <span className="text-sm font-bold text-slate-900 uppercase tracking-tight">{location.pathname.replace('/', '') || 'Dashboard'}</span>
             </div>
             
             <div className="flex items-center gap-3">
                {/* Cloud Sync Status (Topbar) */}
                <div className="flex items-center gap-2 px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-md">
                   {isSignedIn ? <CheckCircle2 size={14} className="text-emerald-500" /> : <CloudOff size={14} className="text-slate-400" />}
                   <span className="text-[10px] font-bold text-slate-600 uppercase tracking-tight hidden md:inline">
                       {isSignedIn ? 'Sync Active' : 'Offline'}
                   </span>
                   {isSignedIn ? (
                        <button onClick={() => signOut()} className="ml-2 text-[10px] font-bold text-slate-400 hover:text-red-600 uppercase transition-colors">
                            Disconnect
                        </button>
                    ) : (
                        <button onClick={() => signIn()} className="ml-2 text-[10px] font-bold text-blue-600 hover:text-blue-700 uppercase transition-colors">
                            Connect
                        </button>
                    )}
                </div>

                <div className="h-6 w-px bg-slate-200 mx-1 hidden sm:block"></div>

                <div className="flex items-center gap-3">
                    <div className="text-right hidden sm:block leading-none">
                      <p className="text-[10px] font-bold text-slate-900 uppercase">SRI GOKILAM</p>
                      <p className="text-[9px] text-slate-400 font-bold uppercase tracking-widest mt-0.5">Admin</p>
                    </div>
                    <button 
                        onClick={handleLogout}
                        className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-full transition-all"
                        title="Logout Securely"
                    >
                        <LogOut size={18} />
                    </button>
                </div>
             </div>
          </header>

          <div className="p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto">
            {isSignedIn ? (
                <div className="space-y-6">{children}</div>
            ) : (
                <div className="min-h-[70vh] flex items-center justify-center">
                    <div className="max-w-md w-full bg-white border border-slate-200 rounded-2xl p-8 text-center shadow-xl animate-in fade-in slide-in-from-bottom-4 duration-500">
                        <div className="w-20 h-20 bg-blue-50 text-blue-600 rounded-3xl flex items-center justify-center mx-auto mb-6 shadow-inner ring-4 ring-blue-50/50">
                            <CloudOff size={40} />
                        </div>
                        <h2 className="text-2xl font-bold text-slate-900 mb-3">Cloud Synchronization Required</h2>
                        <p className="text-slate-500 text-sm mb-8 leading-relaxed">
                            To ensure your data is safely backed up and invoices can be generated, 
                            please connect your Google Drive account before continuing.
                        </p>
                        <div className="space-y-4">
                            <button 
                                onClick={() => signIn()}
                                className="w-full py-4 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-bold transition-all shadow-lg shadow-blue-100 flex items-center justify-center gap-3 active:scale-[0.98]"
                            >
                                <CheckCircle2 size={20} />
                                Connect Google Drive
                            </button>
                            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest pt-2">
                                Secure end-to-end sync through Google
                            </p>
                        </div>
                    </div>
                </div>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}
