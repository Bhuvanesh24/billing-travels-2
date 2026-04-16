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

      const totalRevenue = invoices.reduce((sum: number, inv: any) => sum + (inv.totalBill || inv.totalAmount || inv.grandTotal || 0), 0);
      const pendingPayments = invoices
        .filter((inv: any) => inv.paymentStatus === 'pending')
        .reduce((sum: number, inv: any) => sum + (inv.totalBill || inv.totalAmount || inv.grandTotal || 0), 0);
      const totalExpenses = expenses.reduce((sum: number, exp: any) => sum + (exp.amount || 0), 0);

      const pendingList = invoices
        .filter((inv: any) => inv.paymentStatus === 'pending')
        .sort((a: any, b: any) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
        .slice(0, 5)
        .map((inv: any) => ({ ...inv, totalAmount: inv.totalBill || inv.totalAmount || inv.grandTotal || 0 }));

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
    <div className="bg-white border border-slate-200 rounded-2xl shadow-sm p-6 space-y-6">
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

      {/* "Tables" at the top */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Ongoing Trips */}
        <div className="bg-white rounded-lg border border-slate-200 shadow-sm overflow-hidden">
          <div className="px-5 py-4 border-b border-slate-200 flex justify-between items-center bg-slate-50/50">
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 bg-blue-500 rounded-full animate-pulse"></div>
              <h3 className="font-semibold text-slate-800 text-sm">Ongoing Trips</h3>
              <span className="bg-blue-100 text-blue-700 text-[10px] font-bold px-2 py-0.5 rounded uppercase">{stats.ongoingTrips}</span>
            </div>
            <Link
              to="/trips"
              className="text-xs font-bold text-slate-600 hover:text-slate-900 flex items-center gap-1 transition-colors bg-slate-50 border border-slate-200 px-2.5 py-1 rounded-lg"
            >
              View All <ArrowRight size={12} />
            </Link>
          </div>
          <div className="divide-y divide-slate-50">
            {ongoingTrips.length > 0 ? ongoingTrips.map((trip) => (
              <div key={trip.id} className="px-5 py-3.5 flex items-center justify-between hover:bg-slate-50 transition-colors">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 bg-blue-50 rounded-md flex items-center justify-center text-blue-600">
                    <MapPin size={14} />
                  </div>
                  <div>
                    <p className="font-semibold text-slate-800 text-sm leading-tight">{trip.customerName || 'Customer'}</p>
                    <p className="text-xs text-slate-500 mt-0.5">{trip.vehicleNo || trip.carId} • {trip.driverName || 'Driver'}</p>
                  </div>
                </div>
                <div className="text-right">
                  <div className="flex items-center justify-end gap-1 text-blue-600 text-[10px] font-bold uppercase mb-0.5">
                    <Clock size={10} />
                    Live
                  </div>
                  <p className="text-[10px] text-slate-500">{trip.startTime ? new Date(trip.startTime).toLocaleDateString() : ''}</p>
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
        <div className="bg-white rounded-lg border border-slate-200 shadow-sm overflow-hidden">
          <div className="px-5 py-4 border-b border-slate-200 flex justify-between items-center bg-slate-50/50">
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 bg-orange-500 rounded-full"></div>
              <h3 className="font-semibold text-slate-800 text-sm">Pending Bills</h3>
              <span className="bg-orange-100 text-orange-600 text-[10px] font-bold px-2 py-0.5 rounded uppercase">{pendingInvoices.length}</span>
            </div>
            <Link
              to="/invoices"
              className="text-xs font-bold text-slate-600 hover:text-slate-900 flex items-center gap-1 transition-colors bg-slate-50 border border-slate-200 px-2.5 py-1 rounded-lg"
            >
              View All <ArrowRight size={12} />
            </Link>
          </div>
          <div className="divide-y divide-slate-50">
            {pendingInvoices.length > 0 ? pendingInvoices.map((inv) => (
              <div key={inv.id} className="px-5 py-3.5 flex items-center justify-between hover:bg-slate-50 transition-colors">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 bg-orange-50 rounded-md flex items-center justify-center text-orange-500">
                    <AlertCircle size={14} />
                  </div>
                  <div>
                    <p className="font-semibold text-slate-800 text-sm leading-tight">{inv.customerName}</p>
                    <p className="text-xs text-slate-500 mt-0.5">{inv.invoiceNumber} • {new Date(inv.createdAt).toLocaleDateString('en-IN')}</p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="font-bold text-slate-800 text-sm">₹ {(inv.totalAmount || 0).toLocaleString()}</p>
                  <span className="text-[10px] font-semibold text-orange-600 uppercase bg-orange-50 px-2 py-0.5 rounded">Pending</span>
                </div>
              </div>
            )) : (
              <div className="px-6 py-10 text-center">
                <CheckCircle2 size={32} className="mx-auto mb-3 text-emerald-300" />
                <p className="text-sm text-slate-400 font-medium">All bills are cleared!</p>
              </div>
            )}
          </div>
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
            <Link key={card.title} to={card.link} className="bg-white p-5 rounded-lg border border-slate-200 shadow-sm hover:border-slate-300 transition-all duration-200 group block">
                <div className="flex items-start justify-between mb-2">
                  <p className="text-sm font-semibold text-slate-600">{card.title}</p>
                  <div className={`p-2 rounded-md ${colorMap[card.color]} opacity-80 group-hover:opacity-100 transition-opacity`}>
                    <Icon size={16} />
                  </div>
                </div>
                <p className="text-2xl font-bold text-slate-800 tracking-tight">{card.value}</p>
                <div className="flex items-center justify-between mt-3">
                  <p className="text-xs text-slate-400">{card.sub}</p>
                  <ArrowUpRight size={14} className="text-slate-300 group-hover:text-slate-500 transition-colors" />
                </div>
            </Link>
          );
        })}
      </div>

      {/* Bottom summary bar */}
      <div className="bg-slate-800 rounded-xl p-5 border border-slate-700 grid grid-cols-2 md:grid-cols-4 gap-6 text-white shadow-sm mt-6">
        {[
          { label: 'Total Customers', value: stats.totalCustomers, icon: Users, link: '/customers' },
          { label: 'Total Cars', value: stats.totalCars, icon: CarIcon, link: '/cars' },
          { label: 'Total Expenses', value: `₹ ${stats.totalExpenses.toLocaleString()}`, icon: IndianRupee, link: '/accounts' },
          { label: 'Net Profit', value: `₹ ${stats.netProfit.toLocaleString()}`, icon: TrendingUp, link: '/accounts' },
        ].map((item) => {
          const Icon = item.icon;
          return (
            <Link key={item.label} to={item.link} className="group flex flex-col justify-between h-full bg-slate-900/50 p-4 rounded-lg hover:bg-slate-700/50 transition-all border border-slate-700/50 hover:border-slate-600">
              <div className="flex items-center justify-between mb-3 text-slate-400 group-hover:text-slate-300">
                <p className="text-[10px] font-semibold uppercase tracking-wider">{item.label}</p>
                <Icon size={14} className="opacity-80" />
              </div>
              <p className="text-xl font-bold group-hover:text-white transition-colors">{item.value}</p>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
