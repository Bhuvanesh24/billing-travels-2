import { useState, useEffect } from 'react';
import {
  TrendingUp,
  TrendingDown,
  Loader2,
  Car as CarIcon,
  User,
  History,
  IndianRupee,
  Download,
  Filter,
  CalendarDays,
  X,
  Activity,
  ArrowRight
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
  tripDate?: string;
  amount: number;
  category?: string;
}

type TabId = 'overview' | 'ledger' | 'cars' | 'drivers';

export default function Accounts() {
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<TabId>('overview');

  const [totals, setTotals] = useState({ revenue: 0, expenses: 0, vendorPayouts: 0, netProfit: 0, pendingRevenue: 0 });
  const [ledger, setLedger] = useState<LedgerEntry[]>([]);
  const [carMetrics, setCarMetrics] = useState<BusinessMetric[]>([]);
  const [driverMetrics, setDriverMetrics] = useState<BusinessMetric[]>([]);

  // Raw Data State
  const [rawInvoices, setRawInvoices] = useState<any[]>([]);
  const [rawExpenses, setRawExpenses] = useState<any[]>([]);
  const [rawCars, setRawCars] = useState<any[]>([]);
  const [rawDrivers, setRawDrivers] = useState<any[]>([]);
  const [rawVendorBills, setRawVendorBills] = useState<any[]>([]);

  // Filter State
  const defaultFilters = {
    dateFilterTarget: 'bill' as 'bill' | 'trip',
    dateFilterType: 'this_month' as 'all' | 'this_month' | 'month' | 'custom',
    filterMonth: new Date().toISOString().slice(0, 7),
    startDate: '',
    endDate: ''
  };
  const [draftFilters, setDraftFilters] = useState(defaultFilters);
  const [appliedFilters, setAppliedFilters] = useState(defaultFilters);

  // Modal State
  const [selectedCarMetrics, setSelectedCarMetrics] = useState<BusinessMetric | null>(null);
  const [isCarModalOpen, setIsCarModalOpen] = useState(false);

  useEffect(() => {
    fetchData();
  }, []);

  async function fetchData() {
    try {
      setLoading(true);
      const [invSnap, expSnap, carSnap, driSnap, vendBillSnap] = await Promise.all([
        getDocs(collection(db, 'invoices')),
        getDocs(collection(db, 'car_expenses')),
        getDocs(collection(db, 'cars')),
        getDocs(collection(db, 'drivers')),
        getDocs(collection(db, 'vendor_bills'))
      ]);

      setRawInvoices(invSnap.docs.map(d => ({ id: d.id, ...d.data() })));
      setRawExpenses(expSnap.docs.map(d => ({ id: d.id, ...d.data() })));
      setRawCars(carSnap.docs.map(d => ({ id: d.id, ...d.data() })));
      setRawDrivers(driSnap.docs.map(d => ({ id: d.id, ...d.data() })));
      setRawVendorBills(vendBillSnap.docs.map(d => ({ id: d.id, ...d.data() })));
    } catch (error) {
      console.error(error);
      toast.error('Failed to load accounting data');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (!rawInvoices.length && !rawExpenses.length && !rawCars.length && !rawDrivers.length) return;

    const filteredInvoices = rawInvoices.filter(inv => {
      const dStr = appliedFilters.dateFilterTarget === 'trip' 
        ? (inv.startTime || inv.createdAt || inv.date || '')
        : (inv.createdAt || inv.date || '');
      if (!dStr) return false;
      const d = new Date(dStr);
      
      if (appliedFilters.dateFilterType === 'this_month') {
        const now = new Date();
        return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
      }
      if (appliedFilters.dateFilterType === 'month' && appliedFilters.filterMonth) {
        const [yyyy, mm] = appliedFilters.filterMonth.split('-');
        return d.getFullYear() === parseInt(yyyy) && d.getMonth() === parseInt(mm) - 1;
      }
      if (appliedFilters.dateFilterType === 'custom' && appliedFilters.startDate && appliedFilters.endDate) {
        const start = new Date(appliedFilters.startDate);
        const end = new Date(appliedFilters.endDate);
        end.setHours(23, 59, 59, 999);
        return d >= start && d <= end;
      }
      return true;
    });

    const filteredExpenses = rawExpenses.filter(exp => {
      const dStr = exp.createdAt || exp.date || '';
      if (!dStr) return false;
      const d = new Date(dStr);
      
      if (appliedFilters.dateFilterType === 'this_month') {
        const now = new Date();
        return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
      }
      if (appliedFilters.dateFilterType === 'month' && appliedFilters.filterMonth) {
        const [yyyy, mm] = appliedFilters.filterMonth.split('-');
        return d.getFullYear() === parseInt(yyyy) && d.getMonth() === parseInt(mm) - 1;
      }
      if (appliedFilters.dateFilterType === 'custom' && appliedFilters.startDate && appliedFilters.endDate) {
        const start = new Date(appliedFilters.startDate);
        const end = new Date(appliedFilters.endDate);
        end.setHours(23, 59, 59, 999);
        return d >= start && d <= end;
      }
      return true;
    });

    const filteredVendorBills = rawVendorBills.filter(bill => {
      const dStr = bill.date || bill.createdAt || '';
      if (!dStr) return false;
      const d = new Date(dStr);
      
      if (appliedFilters.dateFilterType === 'this_month') {
        const now = new Date();
        return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
      }
      if (appliedFilters.dateFilterType === 'month' && appliedFilters.filterMonth) {
        const [yyyy, mm] = appliedFilters.filterMonth.split('-');
        return d.getFullYear() === parseInt(yyyy) && d.getMonth() === parseInt(mm) - 1;
      }
      if (appliedFilters.dateFilterType === 'custom' && appliedFilters.startDate && appliedFilters.endDate) {
        const start = new Date(appliedFilters.startDate);
        const end = new Date(appliedFilters.endDate);
        end.setHours(23, 59, 59, 999);
        return d >= start && d <= end;
      }
      return true;
    });

    const getAmt = (inv: any) => inv.totalAmount || inv.grandTotal || 0;

    const revenue = filteredInvoices.reduce((s: number, i: any) => s + getAmt(i), 0);
    const pendingRevenue = filteredInvoices.filter((i: any) => i.paymentStatus === 'pending').reduce((s: number, i: any) => s + getAmt(i), 0);
    const totalExpenses = filteredExpenses.reduce((s: number, e: any) => s + (e.amount || 0), 0);
    const vendorPayouts = filteredVendorBills.reduce((s: number, b: any) => s + (b.amount || 0), 0);
    setTotals({ 
      revenue, 
      expenses: totalExpenses, 
      vendorPayouts,
      netProfit: revenue - totalExpenses - vendorPayouts, 
      pendingRevenue 
    });

    // Ledger
    const incomeEntries: LedgerEntry[] = filteredInvoices.map((inv: any) => ({
      type: 'income',
      name: inv.customerName || 'Customer',
      date: inv.createdAt || inv.date,
      tripDate: inv.startTime,
      amount: getAmt(inv),
      category: inv.paymentStatus === 'paid' ? 'Collected' : 'Pending',
    }));
    const expenseEntries: LedgerEntry[] = filteredExpenses.map((exp: any) => ({
      type: 'expense',
      name: exp.description || exp.label || 'Expense',
      date: exp.createdAt || exp.date,
      amount: exp.amount || 0,
      category: exp.category || 'General',
    }));
    const vendorBillEntries: LedgerEntry[] = filteredVendorBills.map((bill: any) => ({
      type: 'expense',
      name: `Vendor Bill - ${bill.vendorName}`,
      date: bill.date || bill.createdAt,
      amount: bill.amount || 0,
      category: 'Vendor Payout',
    }));
    const allEntries = [...incomeEntries, ...expenseEntries, ...vendorBillEntries]
      .sort((a, b) => new Date(b.date || 0).getTime() - new Date(a.date || 0).getTime());
    setLedger(allEntries);

    // Car Metrics
    const cm = rawCars.map((car: any) => {
      const rev = filteredInvoices.filter((i: any) => i.vehicleNo === car.regNo).reduce((s: number, i: any) => s + getAmt(i), 0);
      const ex = filteredExpenses.filter((e: any) => e.carId === car.id).reduce((s: number, e: any) => s + (e.amount || 0), 0);
      const trips = filteredInvoices.filter((i: any) => i.vehicleNo === car.regNo).length;
      return { id: car.id, name: `${car.regNo} (${car.model})`, revenue: rev, expense: ex, profit: rev - ex, trips };
    }).sort((a: BusinessMetric, b: BusinessMetric) => b.profit - a.profit);
    setCarMetrics(cm);

    // Driver Metrics
    const dm = rawDrivers.map((dri: any) => {
      const rev = filteredInvoices.filter((i: any) => i.driverName === dri.name).reduce((s: number, i: any) => s + getAmt(i), 0);
      const trips = filteredInvoices.filter((i: any) => i.driverName === dri.name).length;
      return { id: dri.id, name: dri.name, revenue: rev, expense: 0, profit: rev, trips };
    }).sort((a: BusinessMetric, b: BusinessMetric) => b.revenue - a.revenue);
    setDriverMetrics(dm);

  }, [rawInvoices, rawExpenses, rawCars, rawDrivers, rawVendorBills, appliedFilters]);

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
    <div className="bg-white border border-slate-200 rounded-2xl shadow-sm p-6 space-y-6">
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

      {/* Filters */}
      <div className="bg-slate-50 border border-slate-100 p-4 rounded-xl flex flex-col sm:flex-row gap-4 items-end flex-wrap">
        <div className="flex-1 min-w-[150px]">
          <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1.5 block">Filter Date By</label>
          <div className="relative">
            <Filter size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <select
              className="w-full pl-9 pr-4 py-2 bg-white border border-slate-200 rounded-lg text-sm font-semibold text-slate-700 outline-none focus:border-blue-500 transition-colors"
              value={draftFilters.dateFilterTarget}
              onChange={(e) => setDraftFilters({ ...draftFilters, dateFilterTarget: e.target.value as any })}
            >
              <option value="bill">Bill Date</option>
              <option value="trip">Trip Date</option>
            </select>
          </div>
        </div>

        <div className="flex-1 min-w-[200px]">
          <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1.5 block">Time Period</label>
          <div className="relative">
            <CalendarDays size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <select
              className="w-full pl-9 pr-4 py-2 bg-white border border-slate-200 rounded-lg text-sm font-semibold text-slate-700 outline-none focus:border-blue-500 transition-colors"
              value={draftFilters.dateFilterType}
              onChange={(e) => setDraftFilters({ ...draftFilters, dateFilterType: e.target.value as any })}
            >
              <option value="all">All Time</option>
              <option value="this_month">This Month</option>
              <option value="month">Select Month</option>
              <option value="custom">Custom Range</option>
            </select>
          </div>
        </div>

        {draftFilters.dateFilterType === 'month' && (
          <div className="flex-1 min-w-[200px]">
            <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1.5 block">Month</label>
            <input
              type="month"
              className="w-full px-4 py-2 bg-white border border-slate-200 rounded-lg text-sm font-semibold text-slate-700 outline-none focus:border-blue-500 transition-colors"
              value={draftFilters.filterMonth}
              onChange={(e) => setDraftFilters({ ...draftFilters, filterMonth: e.target.value })}
            />
          </div>
        )}

        {draftFilters.dateFilterType === 'custom' && (
          <>
            <div className="flex-1 min-w-[150px]">
              <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1.5 block">Start Date</label>
              <input
                type="date"
                className="w-full px-4 py-2 bg-white border border-slate-200 rounded-lg text-sm font-semibold text-slate-700 outline-none focus:border-blue-500 transition-colors"
                value={draftFilters.startDate}
                onChange={(e) => setDraftFilters({ ...draftFilters, startDate: e.target.value })}
              />
            </div>
            <div className="flex-1 min-w-[150px]">
              <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1.5 block">End Date</label>
              <input
                type="date"
                className="w-full px-4 py-2 bg-white border border-slate-200 rounded-lg text-sm font-semibold text-slate-700 outline-none focus:border-blue-500 transition-colors"
                value={draftFilters.endDate}
                onChange={(e) => setDraftFilters({ ...draftFilters, endDate: e.target.value })}
              />
            </div>
          </>
        )}

        <button
          onClick={() => setAppliedFilters(draftFilters)}
          className="px-6 py-2 bg-blue-600 text-white rounded-lg font-bold text-sm hover:bg-blue-700 transition-colors flex items-center justify-center gap-2"
        >
          <Filter size={16} />
          Apply
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
          <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-5 gap-5">
            <MetricPill label="Gross Revenue" value={`₹ ${totals.revenue.toLocaleString()}`} color="bg-emerald-600 text-white" />
            <MetricPill label="Fleet Expenses" value={`₹ ${totals.expenses.toLocaleString()}`} color="bg-red-50 text-red-700" />
            <MetricPill label="Vendor Payouts" value={`₹ ${totals.vendorPayouts.toLocaleString()}`} color="bg-amber-50 text-amber-700" />
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
                { label: 'Vendor Payouts', value: -totals.vendorPayouts, color: 'text-amber-600', icon: <TrendingDown size={16} className="text-amber-500" /> },
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
                  <th className="px-8 py-3">Date (Trip / Bill)</th>
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
                      {entry.type === 'income' ? (
                        <div className="flex flex-col gap-0.5">
                          {entry.tripDate && <span className="font-semibold text-slate-700">Trip: {new Date(entry.tripDate).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}</span>}
                          <span className="text-[10px]">Billed: {entry.date ? new Date(entry.date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }) : '-'}</span>
                        </div>
                      ) : (
                        entry.date ? new Date(entry.date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }) : '-'
                      )}
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
              <div 
                key={car.id} 
                className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6 hover:shadow-md hover:border-blue-200 cursor-pointer transition-all group"
                onClick={() => {
                  setSelectedCarMetrics(car);
                  setIsCarModalOpen(true);
                }}
              >
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div className="flex items-center gap-4">
                    <div className="w-10 h-10 bg-slate-900 text-white rounded-xl flex items-center justify-center font-black text-sm group-hover:bg-blue-600 transition-colors">
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
      {/* Car Details Modal */}
      {isCarModalOpen && selectedCarMetrics && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-md">
          <div className="bg-white w-full max-w-4xl max-h-[90vh] overflow-y-auto rounded-2xl shadow-2xl border border-slate-200 animate-in fade-in zoom-in duration-300">
            <div className="px-6 py-4 border-b border-slate-200 flex justify-between items-center bg-slate-50/50 sticky top-0 z-10">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 bg-blue-100 rounded flex items-center justify-center text-blue-600">
                  <CarIcon size={18} />
                </div>
                <div>
                  <h2 className="text-sm font-bold text-slate-800 leading-tight">Detailed Stats: {selectedCarMetrics.name}</h2>
                  <p className="text-[10px] text-slate-500 font-semibold uppercase tracking-wider">Filtered View</p>
                </div>
              </div>
              <button onClick={() => setIsCarModalOpen(false)} className="p-1.5 hover:bg-slate-100 rounded text-slate-400 transition-colors border border-transparent hover:border-slate-200">
                <X size={18} />
              </button>
            </div>

            <div className="p-6 space-y-6">
              {/* Summary Cards */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="bg-blue-50 border border-blue-100 rounded-xl p-4">
                  <p className="text-[10px] font-black text-blue-500 uppercase tracking-widest mb-1">Trips</p>
                  <p className="font-black text-xl text-blue-700">{selectedCarMetrics.trips}</p>
                </div>
                <div className="bg-emerald-50 border border-emerald-100 rounded-xl p-4">
                  <p className="text-[10px] font-black text-emerald-500 uppercase tracking-widest mb-1">Revenue</p>
                  <p className="font-black text-xl text-emerald-700">₹ {selectedCarMetrics.revenue.toLocaleString()}</p>
                </div>
                <div className="bg-red-50 border border-red-100 rounded-xl p-4">
                  <p className="text-[10px] font-black text-red-500 uppercase tracking-widest mb-1">Expenses</p>
                  <p className="font-black text-xl text-red-700">₹ {selectedCarMetrics.expense.toLocaleString()}</p>
                </div>
                <div className={`border rounded-xl p-4 ${selectedCarMetrics.profit >= 0 ? 'bg-indigo-50 border-indigo-100' : 'bg-orange-50 border-orange-100'}`}>
                  <p className={`text-[10px] font-black uppercase tracking-widest mb-1 ${selectedCarMetrics.profit >= 0 ? 'text-indigo-500' : 'text-orange-500'}`}>Net Profit</p>
                  <p className={`font-black text-xl ${selectedCarMetrics.profit >= 0 ? 'text-indigo-700' : 'text-orange-700'}`}>₹ {selectedCarMetrics.profit.toLocaleString()}</p>
                </div>
              </div>

              {/* Transactions Split */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Trips List */}
                <div className="bg-white border border-slate-100 rounded-xl shadow-sm overflow-hidden flex flex-col h-[400px]">
                  <div className="px-4 py-3 border-b border-slate-50 bg-slate-50/50 flex items-center gap-2">
                    <Activity size={14} className="text-emerald-500" />
                    <h3 className="font-black text-slate-800 text-xs uppercase tracking-widest">Trips Completed</h3>
                  </div>
                  <div className="overflow-y-auto flex-1 p-2 space-y-2">
                    {(() => {
                      const carRegNo = rawCars.find(c => c.id === selectedCarMetrics.id)?.regNo;
                      const trips = rawInvoices.filter(i => {
                        if (i.vehicleNo !== carRegNo) return false;
                        const dStr = appliedFilters.dateFilterTarget === 'trip'
                          ? (i.startTime || i.createdAt || i.date || '')
                          : (i.createdAt || i.date || '');
                        if (!dStr) return false;
                        const d = new Date(dStr);
                        if (appliedFilters.dateFilterType === 'this_month') {
                          const now = new Date();
                          return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
                        }
                        if (appliedFilters.dateFilterType === 'month' && appliedFilters.filterMonth) {
                          const [yyyy, mm] = appliedFilters.filterMonth.split('-');
                          return d.getFullYear() === parseInt(yyyy) && d.getMonth() === parseInt(mm) - 1;
                        }
                        if (appliedFilters.dateFilterType === 'custom' && appliedFilters.startDate && appliedFilters.endDate) {
                          const start = new Date(appliedFilters.startDate);
                          const end = new Date(appliedFilters.endDate);
                          end.setHours(23, 59, 59, 999);
                          return d >= start && d <= end;
                        }
                        return true;
                      });

                      if (trips.length === 0) return <p className="text-xs text-slate-400 text-center py-8 font-semibold">No trips found in this period.</p>;
                      
                      return trips.map((trip, idx) => (
                        <div key={idx} className="p-3 border border-slate-100 rounded-lg hover:bg-slate-50 transition-colors">
                          <div className="flex justify-between items-start mb-2">
                            <div>
                              <p className="text-xs font-bold text-slate-800">{trip.customerName || 'Customer'}</p>
                              {trip.tripStartLocation && (
                                <p className="text-[10px] text-slate-500 font-semibold flex items-center gap-1 mt-0.5">
                                  {trip.tripStartLocation} <ArrowRight size={10} /> {trip.tripEndLocation}
                                </p>
                              )}
                            </div>
                            <p className="text-xs font-black text-emerald-600">₹ {(trip.totalAmount || trip.grandTotal || 0).toLocaleString()}</p>
                          </div>
                          <div className="text-[10px] font-bold text-slate-400 mt-2 border-t border-slate-100 pt-1 flex flex-col gap-0.5">
                            {trip.startTime && <span className="text-slate-700">Trip: {new Date(trip.startTime).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}</span>}
                            <span>Billed: {trip.createdAt || trip.date ? new Date(trip.createdAt || trip.date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }) : '-'}</span>
                          </div>
                        </div>
                      ));
                    })()}
                  </div>
                </div>

                {/* Expenses List */}
                <div className="bg-white border border-slate-100 rounded-xl shadow-sm overflow-hidden flex flex-col h-[400px]">
                  <div className="px-4 py-3 border-b border-slate-50 bg-slate-50/50 flex items-center gap-2">
                    <TrendingDown size={14} className="text-red-500" />
                    <h3 className="font-black text-slate-800 text-xs uppercase tracking-widest">Expenses Logged</h3>
                  </div>
                  <div className="overflow-y-auto flex-1 p-2 space-y-2">
                    {(() => {
                      const exps = rawExpenses.filter(e => {
                        if (e.carId !== selectedCarMetrics.id) return false;
                        const dStr = e.createdAt || e.date || '';
                        if (!dStr) return false;
                        const d = new Date(dStr);
                        if (appliedFilters.dateFilterType === 'this_month') {
                          const now = new Date();
                          return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
                        }
                        if (appliedFilters.dateFilterType === 'month' && appliedFilters.filterMonth) {
                          const [yyyy, mm] = appliedFilters.filterMonth.split('-');
                          return d.getFullYear() === parseInt(yyyy) && d.getMonth() === parseInt(mm) - 1;
                        }
                        if (appliedFilters.dateFilterType === 'custom' && appliedFilters.startDate && appliedFilters.endDate) {
                          const start = new Date(appliedFilters.startDate);
                          const end = new Date(appliedFilters.endDate);
                          end.setHours(23, 59, 59, 999);
                          return d >= start && d <= end;
                        }
                        return true;
                      });

                      if (exps.length === 0) return <p className="text-xs text-slate-400 text-center py-8 font-semibold">No expenses found in this period.</p>;

                      return exps.map((exp, idx) => (
                        <div key={idx} className="p-3 border border-slate-100 rounded-lg hover:bg-slate-50 transition-colors">
                          <div className="flex justify-between items-start mb-2">
                            <p className="text-xs font-bold text-slate-800">{exp.description || exp.label}</p>
                            <p className="text-xs font-black text-red-600">₹ {(exp.amount || 0).toLocaleString()}</p>
                          </div>
                          <div className="flex justify-between items-center border-t border-slate-100 pt-1 mt-2">
                            <span className="text-[9px] font-black px-2 py-0.5 rounded bg-slate-100 text-slate-500 capitalize">{exp.category || 'General'}</span>
                            <p className="text-[10px] font-bold text-slate-400">
                              {exp.createdAt || exp.date ? new Date(exp.createdAt || exp.date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }) : '-'}
                            </p>
                          </div>
                        </div>
                      ));
                    })()}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
