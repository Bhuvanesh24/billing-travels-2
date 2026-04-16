import { useState, useEffect } from 'react';
import {
  TrendingUp,
  TrendingDown,
  Loader2,
  Car as CarIcon,
  User,
  History,
  IndianRupee,
  Download
} from 'lucide-react';
import { db } from '../services/firestore';
import { collection, getDocs } from 'firebase/firestore';
import toast from 'react-hot-toast';

interface BusinessMetric {
  id: string;
  name: string;
  revenue: number;
  expense: number;
  profit: number;
  trips: number;
}

interface LedgerEntry {
  type: 'income' | 'expense';
  name: string;
  date: string;
  amount: number;
  category?: string;
}

type TabId = 'overview' | 'ledger' | 'cars' | 'drivers';

export default function Accounts() {
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<TabId>('overview');

  const [totals, setTotals] = useState({ revenue: 0, expenses: 0, netProfit: 0, pendingRevenue: 0 });
  const [ledger, setLedger] = useState<LedgerEntry[]>([]);
  const [carMetrics, setCarMetrics] = useState<BusinessMetric[]>([]);
  const [driverMetrics, setDriverMetrics] = useState<BusinessMetric[]>([]);

  useEffect(() => {
    fetchData();
  }, []);

  async function fetchData() {
    try {
      setLoading(true);
      const [invSnap, expSnap, carSnap, driSnap] = await Promise.all([
        getDocs(collection(db, 'invoices')),
        getDocs(collection(db, 'car_expenses')),
        getDocs(collection(db, 'cars')),
        getDocs(collection(db, 'drivers')),
      ]);

      const invoices = invSnap.docs.map(d => ({ id: d.id, ...d.data() } as any));
      const expenses = expSnap.docs.map(d => ({ id: d.id, ...d.data() } as any));
      const cars = carSnap.docs.map(d => ({ id: d.id, ...d.data() } as any));
      const drivers = driSnap.docs.map(d => ({ id: d.id, ...d.data() } as any));

      const getAmt = (inv: any) => inv.totalAmount || inv.grandTotal || 0;

      const revenue = invoices.reduce((s: number, i: any) => s + getAmt(i), 0);
      const pendingRevenue = invoices.filter((i: any) => i.paymentStatus === 'pending').reduce((s: number, i: any) => s + getAmt(i), 0);
      const totalExpenses = expenses.reduce((s: number, e: any) => s + (e.amount || 0), 0);
      setTotals({ revenue, expenses: totalExpenses, netProfit: revenue - totalExpenses, pendingRevenue });

      // Ledger
      const incomeEntries: LedgerEntry[] = invoices.map((inv: any) => ({
        type: 'income',
        name: inv.customerName || 'Customer',
        date: inv.createdAt,
        amount: getAmt(inv),
        category: inv.paymentStatus === 'paid' ? 'Collected' : 'Pending',
      }));
      const expenseEntries: LedgerEntry[] = expenses.map((exp: any) => ({
        type: 'expense',
        name: exp.description || exp.label || 'Expense',
        date: exp.createdAt || exp.date,
        amount: exp.amount || 0,
        category: exp.category || 'General',
      }));
      const allEntries = [...incomeEntries, ...expenseEntries]
        .sort((a, b) => new Date(b.date || 0).getTime() - new Date(a.date || 0).getTime());
      setLedger(allEntries);

      // Car Metrics
      const cm = cars.map((car: any) => {
        const rev = invoices.filter((i: any) => i.vehicleNo === car.regNo).reduce((s: number, i: any) => s + getAmt(i), 0);
        const ex = expenses.filter((e: any) => e.carId === car.id).reduce((s: number, e: any) => s + (e.amount || 0), 0);
        const trips = invoices.filter((i: any) => i.vehicleNo === car.regNo).length;
        return { id: car.id, name: `${car.regNo} (${car.model})`, revenue: rev, expense: ex, profit: rev - ex, trips };
      }).sort((a: BusinessMetric, b: BusinessMetric) => b.profit - a.profit);
      setCarMetrics(cm);

      // Driver Metrics
      const dm = drivers.map((dri: any) => {
        const rev = invoices.filter((i: any) => i.driverName === dri.name).reduce((s: number, i: any) => s + getAmt(i), 0);
        const trips = invoices.filter((i: any) => i.driverName === dri.name).length;
        return { id: dri.id, name: dri.name, revenue: rev, expense: 0, profit: rev, trips };
      }).sort((a: BusinessMetric, b: BusinessMetric) => b.revenue - a.revenue);
      setDriverMetrics(dm);

    } catch (error) {
      console.error(error);
      toast.error('Failed to load accounting data');
    } finally {
      setLoading(false);
    }
  }

  const tabs: { id: TabId; label: string; icon: React.ReactNode }[] = [
    { id: 'overview', label: 'Overview', icon: <TrendingUp size={16} /> },
    { id: 'ledger', label: 'Ledger', icon: <History size={16} /> },
    { id: 'cars', label: 'By Car', icon: <CarIcon size={16} /> },
    { id: 'drivers', label: 'By Driver', icon: <User size={16} /> },
  ];

  if (loading) {
    return (
      <div className="h-[60vh] flex flex-col items-center justify-center">
        <Loader2 size={40} className="animate-spin text-blue-600 mb-4" />
        <p className="text-slate-500 font-medium uppercase tracking-widest text-sm">Crunching numbers...</p>
      </div>
    );
  }

  const MetricPill = ({ label, value, color }: { label: string; value: string; color: string }) => (
    <div className={`${color} rounded-2xl p-5`}>
      <p className="text-[10px] font-black uppercase tracking-widest opacity-70 mb-1">{label}</p>
      <p className="text-2xl font-black">{value}</p>
    </div>
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-black text-slate-900 tracking-tight">Accounts</h1>
          <p className="text-slate-500 font-medium text-sm">Profit, loss and financial overview</p>
        </div>
        <button
          onClick={fetchData}
          className="bg-white border border-slate-200 text-slate-700 px-4 py-2 rounded-xl font-semibold text-sm flex items-center gap-2 hover:bg-slate-50 transition-all shadow-sm"
        >
          <Download size={16} />
          Refresh
        </button>
      </div>

      {/* Tabs */}
      <div className="flex bg-slate-100 p-1 rounded-xl w-full md:w-fit">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`flex items-center gap-2 px-5 py-2 rounded-lg text-xs font-bold transition-all ${
              activeTab === tab.id
                ? 'bg-white text-slate-900 shadow-sm'
                : 'text-slate-500 hover:text-slate-700'
            }`}
          >
            {tab.icon}
            {tab.label}
          </button>
        ))}
      </div>

      {/* Overview Tab */}
      {activeTab === 'overview' && (
        <div className="space-y-6">
          {/* Big P&L Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-5">
            <MetricPill label="Gross Revenue" value={`₹ ${totals.revenue.toLocaleString()}`} color="bg-emerald-600 text-white" />
            <MetricPill label="Total Expenses" value={`₹ ${totals.expenses.toLocaleString()}`} color="bg-red-50 text-red-700" />
            <MetricPill label="Net Profit" value={`₹ ${totals.netProfit.toLocaleString()}`} color={totals.netProfit >= 0 ? 'bg-indigo-600 text-white' : 'bg-red-600 text-white'} />
            <MetricPill label="Pending Collection" value={`₹ ${totals.pendingRevenue.toLocaleString()}`} color="bg-orange-50 text-orange-700" />
          </div>

          {/* P&L Summary */}
          <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
            <div className="px-8 py-5 border-b border-slate-50">
              <h3 className="font-black text-slate-900">Profit & Loss Summary</h3>
            </div>
            <div className="divide-y divide-slate-50">
              {[
                { label: 'Revenue (Paid Invoices)', value: totals.revenue - totals.pendingRevenue, color: 'text-emerald-600', icon: <TrendingUp size={16} className="text-emerald-500" /> },
                { label: 'Revenue (Pending Invoices)', value: totals.pendingRevenue, color: 'text-orange-500', icon: <IndianRupee size={16} className="text-orange-400" /> },
                { label: 'Fleet Expenses', value: -totals.expenses, color: 'text-red-600', icon: <TrendingDown size={16} className="text-red-500" /> },
              ].map((row) => (
                <div key={row.label} className="px-8 py-5 flex items-center justify-between hover:bg-slate-50 transition-colors">
                  <div className="flex items-center gap-3">
                    {row.icon}
                    <span className="font-semibold text-slate-700">{row.label}</span>
                  </div>
                  <span className={`font-black text-lg ${row.color}`}>
                    {row.value < 0 ? '-' : '+'} ₹ {Math.abs(row.value).toLocaleString()}
                  </span>
                </div>
              ))}
              {/* Net Line */}
              <div className="px-8 py-5 flex items-center justify-between bg-slate-900 text-white">
                <span className="font-black uppercase tracking-widest text-sm">Net Profit / Loss</span>
                <span className={`font-black text-xl ${totals.netProfit >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                  {totals.netProfit >= 0 ? '+' : '-'} ₹ {Math.abs(totals.netProfit).toLocaleString()}
                </span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Ledger Tab */}
      {activeTab === 'ledger' && (
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
          <div className="px-8 py-5 border-b border-slate-50 flex justify-between items-center">
            <h3 className="font-black text-slate-900">Transaction Ledger</h3>
            <span className="text-xs text-slate-400 font-bold">{ledger.length} entries</span>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead>
                <tr className="text-[10px] font-black text-slate-400 uppercase tracking-widest border-b border-slate-100">
                  <th className="px-8 py-3">Type</th>
                  <th className="px-8 py-3">Description</th>
                  <th className="px-8 py-3">Category</th>
                  <th className="px-8 py-3">Date</th>
                  <th className="px-8 py-3 text-right">Amount</th>
                </tr>
              </thead>
              <tbody>
                {ledger.map((entry, idx) => (
                  <tr key={idx} className="border-b border-slate-50 hover:bg-slate-50 transition-colors group">
                    <td className="px-8 py-4">
                      <span className={`text-[10px] font-black px-2 py-1 rounded-md uppercase ${entry.type === 'income' ? 'bg-emerald-50 text-emerald-600' : 'bg-red-50 text-red-600'}`}>
                        {entry.type === 'income' ? 'Income' : 'Expense'}
                      </span>
                    </td>
                    <td className="px-8 py-4 text-sm font-bold text-slate-900">{entry.name}</td>
                    <td className="px-8 py-4 text-xs text-slate-400 font-medium capitalize">{entry.category}</td>
                    <td className="px-8 py-4 text-xs text-slate-500">
                      {entry.date ? new Date(entry.date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }) : '-'}
                    </td>
                    <td className={`px-8 py-4 text-right font-black text-sm ${entry.type === 'income' ? 'text-emerald-600' : 'text-red-600'}`}>
                      {entry.type === 'income' ? '+' : '-'} ₹ {(entry.amount || 0).toLocaleString()}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {ledger.length === 0 && (
              <div className="py-20 text-center">
                <History size={40} className="mx-auto mb-3 text-slate-200" />
                <p className="text-slate-400 text-sm">No transactions found. Start creating invoices.</p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Cars Tab */}
      {activeTab === 'cars' && (
        <div className="space-y-4">
          {carMetrics.length === 0 ? (
            <div className="bg-white rounded-2xl border border-slate-100 p-16 text-center">
              <CarIcon size={40} className="mx-auto mb-3 text-slate-200" />
              <p className="text-slate-400 text-sm">Add cars and log trips to see car-wise metrics.</p>
            </div>
          ) : (
            carMetrics.map((car, idx) => (
              <div key={car.id} className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6 hover:shadow-md transition-all">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div className="flex items-center gap-4">
                    <div className="w-10 h-10 bg-slate-900 text-white rounded-xl flex items-center justify-center font-black text-sm">
                      #{idx + 1}
                    </div>
                    <div>
                      <h4 className="font-black text-slate-900">{car.name}</h4>
                      <p className="text-xs text-slate-400">{car.trips} trips completed</p>
                    </div>
                  </div>
                  <div className="grid grid-cols-3 gap-6">
                    <div className="text-center">
                      <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Revenue</p>
                      <p className="font-black text-emerald-600">₹ {car.revenue.toLocaleString()}</p>
                    </div>
                    <div className="text-center">
                      <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Expenses</p>
                      <p className="font-black text-red-500">₹ {car.expense.toLocaleString()}</p>
                    </div>
                    <div className="text-center">
                      <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Net Profit</p>
                      <p className={`font-black ${car.profit >= 0 ? 'text-indigo-600' : 'text-red-600'}`}>
                        ₹ {car.profit.toLocaleString()}
                      </p>
                    </div>
                  </div>
                </div>
                {/* Profit bar */}
                <div className="mt-5">
                  <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all ${car.profit >= 0 ? 'bg-emerald-500' : 'bg-red-500'}`}
                      style={{ width: `${car.revenue > 0 ? Math.min(100, ((car.revenue - car.expense) / car.revenue) * 100) : 0}%` }}
                    />
                  </div>
                  <p className="text-[10px] text-slate-400 mt-1 text-right font-bold">
                    {car.revenue > 0 ? `${Math.round(((car.revenue - car.expense) / car.revenue) * 100)}% margin` : 'No data'}
                  </p>
                </div>
              </div>
            ))
          )}
        </div>
      )}

      {/* Drivers Tab */}
      {activeTab === 'drivers' && (
        <div className="space-y-4">
          {driverMetrics.length === 0 ? (
            <div className="bg-white rounded-2xl border border-slate-100 p-16 text-center">
              <User size={40} className="mx-auto mb-3 text-slate-200" />
              <p className="text-slate-400 text-sm">Add drivers and complete trips to see driver metrics.</p>
            </div>
          ) : (
            driverMetrics.map((driver, idx) => (
              <div key={driver.id} className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6 hover:shadow-md transition-all">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div className="flex items-center gap-4">
                    <div className={`w-10 h-10 rounded-xl flex items-center justify-center font-black text-sm ${idx === 0 ? 'bg-yellow-400 text-yellow-900' : idx === 1 ? 'bg-slate-300 text-slate-700' : idx === 2 ? 'bg-orange-300 text-orange-900' : 'bg-slate-100 text-slate-600'}`}>
                      #{idx + 1}
                    </div>
                    <div>
                      <h4 className="font-black text-slate-900">{driver.name}</h4>
                      <p className="text-xs text-slate-400">{driver.trips} trips completed</p>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-8">
                    <div className="text-center">
                      <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Total Trips</p>
                      <p className="font-black text-slate-900 text-lg">{driver.trips}</p>
                    </div>
                    <div className="text-center">
                      <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Revenue Generated</p>
                      <p className="font-black text-emerald-600 text-lg">₹ {driver.revenue.toLocaleString()}</p>
                    </div>
                  </div>
                </div>
                {/* Revenue bar */}
                {driverMetrics[0]?.revenue > 0 && (
                  <div className="mt-5">
                    <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-blue-500 rounded-full transition-all"
                        style={{ width: `${(driver.revenue / driverMetrics[0].revenue) * 100}%` }}
                      />
                    </div>
                    <p className="text-[10px] text-slate-400 mt-1 text-right font-bold">
                      {Math.round((driver.revenue / driverMetrics[0].revenue) * 100)}% of top performer
                    </p>
                  </div>
                )}
              </div>
            ))
          )}
        </div>
      )}
    </div>
  );
}
