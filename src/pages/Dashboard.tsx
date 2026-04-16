import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { 
  TrendingUp, 
  Loader2,
  Users,
  ArrowUpRight,
  Calendar,
  IndianRupee,
  Car as CarIcon,
  Wallet,
  MapPin,
  Clock,
  CheckCircle2,
  AlertCircle,
  ArrowRight
} from 'lucide-react';
import { db } from '../services/firestore';
import { collection, getDocs } from 'firebase/firestore';
import { tripService, type Trip } from '../services/tripService';

interface InvoiceSummary {
  id: string;
  invoiceNumber: string;
  customerName: string;
  totalAmount: number;
  paymentStatus: string;
  createdAt: string;
}

export default function Dashboard() {
  const [stats, setStats] = useState({
    totalRevenue: 0,
    pendingPayments: 0,
    ongoingTrips: 0,
    totalExpenses: 0,
    totalCustomers: 0,
    totalCars: 0,
    netProfit: 0
  });
  const [ongoingTrips, setOngoingTrips] = useState<Trip[]>([]);
  const [pendingInvoices, setPendingInvoices] = useState<InvoiceSummary[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchDashboardData();
  }, []);

  async function fetchDashboardData() {
    try {
      setLoading(true);
      const [invoiceSnap, expenseSnap, trips, customerSnap, carSnap] = await Promise.all([
        getDocs(collection(db, 'invoices')),
        getDocs(collection(db, 'car_expenses')),
        tripService.getOngoingTrips(),
        getDocs(collection(db, 'customers')),
        getDocs(collection(db, 'cars'))
      ]);

      const invoices = invoiceSnap.docs.map(d => ({ id: d.id, ...d.data() } as any));
      const expenses = expenseSnap.docs.map(d => d.data());

      const totalRevenue = invoices.reduce((sum: number, inv: any) => sum + (inv.totalAmount || inv.grandTotal || 0), 0);
      const pendingPayments = invoices
        .filter((inv: any) => inv.paymentStatus === 'pending')
        .reduce((sum: number, inv: any) => sum + (inv.totalAmount || inv.grandTotal || 0), 0);
      const totalExpenses = expenses.reduce((sum: number, exp: any) => sum + (exp.amount || 0), 0);

      const pendingList = invoices
        .filter((inv: any) => inv.paymentStatus === 'pending')
        .sort((a: any, b: any) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
        .slice(0, 5)
        .map((inv: any) => ({ ...inv, totalAmount: inv.totalAmount || inv.grandTotal || 0 }));

      setStats({
        totalRevenue,
        pendingPayments,
        ongoingTrips: trips.length,
        totalExpenses,
        totalCustomers: customerSnap.size,
        totalCars: carSnap.size,
        netProfit: totalRevenue - totalExpenses
      });
      setOngoingTrips(trips.slice(0, 5));
      setPendingInvoices(pendingList);
    } catch (error) {
      console.error('Dashboard data error:', error);
    } finally {
      setLoading(false);
    }
  }

  if (loading) {
    return (
      <div className="h-[80vh] flex flex-col items-center justify-center">
        <Loader2 size={48} className="animate-spin text-blue-600 mb-4" />
        <p className="text-slate-500 font-black uppercase tracking-widest text-sm">Loading Dashboard...</p>
      </div>
    );
  }

  const cards = [
    { title: 'Gross Revenue', value: `₹ ${stats.totalRevenue.toLocaleString()}`, icon: TrendingUp, color: 'emerald', sub: 'Lifetime earnings', link: '/invoices' },
    { title: 'Pending Bills', value: `₹ ${stats.pendingPayments.toLocaleString()}`, icon: IndianRupee, color: 'orange', sub: `${pendingInvoices.length} unpaid invoices`, link: '/invoices' },
    { title: 'Ongoing Trips', value: stats.ongoingTrips, icon: CarIcon, color: 'blue', sub: `Out of ${stats.totalCars} vehicles`, link: '/trips' },
    { title: 'Net Profit', value: `₹ ${stats.netProfit.toLocaleString()}`, icon: Wallet, color: stats.netProfit >= 0 ? 'indigo' : 'red', sub: 'Revenue minus expenses', link: '/accounts' },
  ];

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-3xl font-black text-slate-900 tracking-tight">Dashboard</h1>
          <p className="text-slate-500 font-medium mt-1">Real-time business overview</p>
        </div>
        <div className="flex items-center gap-3 bg-white px-5 py-3 rounded-2xl border border-slate-100 shadow-sm">
          <Calendar size={16} className="text-slate-400" />
          <span className="text-sm font-bold text-slate-700">{new Date().toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' })}</span>
        </div>
      </div>

      {/* Metric Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-5">
        {cards.map((card) => {
          const Icon = card.icon;
          const colorMap: Record<string, string> = {
            emerald: 'bg-emerald-50 text-emerald-600',
            orange: 'bg-orange-50 text-orange-500',
            blue: 'bg-blue-50 text-blue-600',
            indigo: 'bg-indigo-50 text-indigo-600',
            red: 'bg-red-50 text-red-600',
          };
          return (
            <Link key={card.title} to={card.link} className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm hover:shadow-lg transition-all duration-300 group block">
              <div className="flex items-start justify-between mb-4">
                <div className={`p-3 rounded-xl ${colorMap[card.color]}`}>
                  <Icon size={22} />
                </div>
                <ArrowUpRight size={16} className="text-slate-300 group-hover:text-slate-600 transition-colors" />
              </div>
              <p className="text-xs font-black text-slate-400 uppercase tracking-widest mb-1">{card.title}</p>
              <p className="text-2xl font-black text-slate-900 tracking-tight">{card.value}</p>
              <p className="text-xs text-slate-400 mt-1 font-medium">{card.sub}</p>
            </Link>
          );
        })}
      </div>

      {/* Two column layout */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Ongoing Trips */}
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
          <div className="px-6 py-4 border-b border-slate-50 flex justify-between items-center">
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 bg-blue-500 rounded-full animate-pulse"></div>
              <h3 className="font-black text-slate-900">Ongoing Trips</h3>
              <span className="bg-blue-100 text-blue-700 text-[10px] font-black px-2 py-0.5 rounded-full uppercase">{stats.ongoingTrips}</span>
            </div>
            <Link to="/trips" className="text-xs font-bold text-slate-400 hover:text-slate-900 flex items-center gap-1 transition-colors">
              View All <ArrowRight size={12} />
            </Link>
          </div>
          <div className="divide-y divide-slate-50">
            {ongoingTrips.length > 0 ? ongoingTrips.map((trip) => (
              <div key={trip.id} className="px-6 py-4 flex items-center justify-between hover:bg-slate-50 transition-colors">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 bg-blue-50 rounded-xl flex items-center justify-center text-blue-600">
                    <MapPin size={16} />
                  </div>
                  <div>
                    <p className="font-bold text-slate-900 text-sm">{trip.customerName || 'Customer'}</p>
                    <p className="text-xs text-slate-400">{trip.vehicleNo || trip.carId} • {trip.driverName || 'Driver'}</p>
                  </div>
                </div>
                <div className="text-right">
                  <div className="flex items-center gap-1 text-blue-600 text-[10px] font-black uppercase">
                    <Clock size={10} />
                    Live
                  </div>
                  <p className="text-[10px] text-slate-400">{trip.startTime ? new Date(trip.startTime).toLocaleDateString() : ''}</p>
                </div>
              </div>
            )) : (
              <div className="px-6 py-10 text-center">
                <CarIcon size={32} className="mx-auto mb-3 text-slate-200" />
                <p className="text-sm text-slate-400 font-medium">No ongoing trips</p>
                <Link to="/trips" className="text-xs text-blue-600 font-bold hover:underline mt-1 inline-block">Start a trip →</Link>
              </div>
            )}
          </div>
        </div>

        {/* Pending Bills */}
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
          <div className="px-6 py-4 border-b border-slate-50 flex justify-between items-center">
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 bg-orange-500 rounded-full"></div>
              <h3 className="font-black text-slate-900">Pending Bills</h3>
              <span className="bg-orange-100 text-orange-600 text-[10px] font-black px-2 py-0.5 rounded-full uppercase">{pendingInvoices.length}</span>
            </div>
            <Link to="/invoices" className="text-xs font-bold text-slate-400 hover:text-slate-900 flex items-center gap-1 transition-colors">
              View All <ArrowRight size={12} />
            </Link>
          </div>
          <div className="divide-y divide-slate-50">
            {pendingInvoices.length > 0 ? pendingInvoices.map((inv) => (
              <div key={inv.id} className="px-6 py-4 flex items-center justify-between hover:bg-slate-50 transition-colors">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 bg-orange-50 rounded-xl flex items-center justify-center text-orange-500">
                    <AlertCircle size={16} />
                  </div>
                  <div>
                    <p className="font-bold text-slate-900 text-sm">{inv.customerName}</p>
                    <p className="text-xs text-slate-400">{inv.invoiceNumber} • {new Date(inv.createdAt).toLocaleDateString('en-IN')}</p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="font-black text-slate-900 text-sm">₹ {(inv.totalAmount || 0).toLocaleString()}</p>
                  <span className="text-[10px] font-bold text-orange-500 uppercase bg-orange-50 px-2 py-0.5 rounded-full">Pending</span>
                </div>
              </div>
            )) : (
              <div className="px-6 py-10 text-center">
                <CheckCircle2 size={32} className="mx-auto mb-3 text-emerald-300" />
                <p className="text-sm text-slate-400 font-medium">All bills are cleared! 🎉</p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Bottom summary bar */}
      <div className="bg-slate-900 rounded-2xl p-6 grid grid-cols-2 md:grid-cols-4 gap-6 text-white">
        {[
          { label: 'Total Customers', value: stats.totalCustomers, icon: Users, link: '/customers' },
          { label: 'Total Cars', value: stats.totalCars, icon: CarIcon, link: '/cars' },
          { label: 'Total Expenses', value: `₹ ${stats.totalExpenses.toLocaleString()}`, icon: IndianRupee, link: '/accounts' },
          { label: 'Net Profit', value: `₹ ${stats.netProfit.toLocaleString()}`, icon: TrendingUp, link: '/accounts' },
        ].map((item) => {
          const Icon = item.icon;
          return (
            <Link key={item.label} to={item.link} className="group">
              <p className="text-slate-500 text-[10px] font-black uppercase tracking-widest mb-1">{item.label}</p>
              <div className="flex items-center gap-2">
                <Icon size={16} className="text-slate-500 group-hover:text-white transition-colors" />
                <p className="text-xl font-black group-hover:text-blue-400 transition-colors">{item.value}</p>
              </div>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
