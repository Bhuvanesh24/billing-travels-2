import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  Plus,
  Loader2,
  Search,
  Trash2,
  ExternalLink,
  CheckCircle2,
  Clock,
  Filter,
  X,
  CreditCard,
  Banknote,
  Smartphone,
  Building2,
  Edit2,
  MapPin,
  ArrowRight
} from 'lucide-react';
import toast from 'react-hot-toast';
import { useDrive } from '../services/useDrive';
import { db, deleteInvoiceMetadata } from '../services/firestore';
import { collection, getDocs, doc, updateDoc } from 'firebase/firestore';
import { Pagination } from '../components/Pagination';
import { tripService, type Trip } from '../services/tripService';

interface InvoiceMetadata {
  id: string;
  invoiceNumber: string;
  customerName: string;
  // Amount can be stored under different field names across history
  grandTotal?: number;
  totalAmount?: number;
  total?: number;
  totalBill?: number;
  driveFileId?: string;
  paymentStatus: 'pending' | 'paid';
  createdAt: string;
  customerCompanyName?: string;
  paymentMode?: string;
  paymentDate?: string;
  amountReceived?: number;
  tripId?: string | null;
}

const PAYMENT_MODES = [
  { id: 'cash', label: 'Cash', icon: Banknote },
  { id: 'upi', label: 'UPI', icon: Smartphone },
  { id: 'bank', label: 'Bank Transfer', icon: Building2 },
  { id: 'cheque', label: 'Cheque', icon: CreditCard },
];

export default function InvoiceList() {
  const { isSignedIn } = useDrive();
  const [invoices, setInvoices] = useState<InvoiceMetadata[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState<'all' | 'pending' | 'paid'>('all');
  const [deletingId, setDeletingId] = useState<string | null>(null);

  // Payment modal state
  const [payingInvoice, setPayingInvoice] = useState<InvoiceMetadata | null>(null);
  const [paymentMode, setPaymentMode] = useState('cash');
  const [amountReceived, setAmountReceived] = useState('');
  const [savingPayment, setSavingPayment] = useState(false);

  // Ready for Invoicing trips
  const [pendingTrips, setPendingTrips] = useState<Trip[]>([]);
  const [showLegacy, setShowLegacy] = useState(false);

  // Helper: check all possible field names
  const getAmount = (inv: any) =>
    inv.totalBill ?? inv.grandTotal ?? inv.totalAmount ?? inv.total ?? 0;

  useEffect(() => {
    fetchInvoices();
  }, []);

  async function fetchInvoices() {
    try {
      setLoading(true);
      const [invoiceSnap, trips] = await Promise.all([
        getDocs(collection(db, 'invoices')),
        tripService.getCompletedTripsWithoutInvoice()
      ]);

      const data = invoiceSnap.docs
        .map(d => ({ id: d.id, ...d.data() } as InvoiceMetadata))
        .sort((a, b) => new Date((b as any).createdAt).getTime() - new Date((a as any).createdAt).getTime());
      
      setInvoices(data);
      setPendingTrips(trips);
    } catch (error) {
      console.error(error);
      toast.error('Failed to load invoices');
    } finally {
      setLoading(false);
    }
  }

  const openPaymentModal = (invoice: InvoiceMetadata) => {
    setPayingInvoice(invoice);
    setPaymentMode('cash');
    setAmountReceived(String(getAmount(invoice)));
  };

  const handleMarkPaid = async () => {
    if (!payingInvoice) return;
    try {
      setSavingPayment(true);
      const ref = doc(db, 'invoices', payingInvoice.id);
      await updateDoc(ref, {
        paymentStatus: 'paid',
        paymentMode,
        amountReceived: Number(amountReceived),
        paymentDate: new Date().toISOString()
      });
      setInvoices(prev => prev.map(inv =>
        inv.id === payingInvoice.id
          ? { ...inv, paymentStatus: 'paid', paymentMode }
          : inv
      ));
      toast.success('Invoice marked as paid!');
      setPayingInvoice(null);
    } catch (error) {
      console.error(error);
      toast.error('Failed to update payment');
    } finally {
      setSavingPayment(false);
    }
  };

  const handleMarkUnpaid = async (invoiceId: string) => {
    try {
      const ref = doc(db, 'invoices', invoiceId);
      await updateDoc(ref, { paymentStatus: 'pending', paymentDate: null });
      setInvoices(prev => prev.map(inv =>
        inv.id === invoiceId ? { ...inv, paymentStatus: 'pending' } : inv
      ));
      toast.success('Marked as pending');
    } catch (error) {
      toast.error('Failed to update');
    }
  };

  const handleDelete = async (invoice: InvoiceMetadata) => {
    if (!window.confirm(`Delete invoice ${invoice.invoiceNumber}?`)) return;
    try {
      setDeletingId(invoice.id);
      await deleteInvoiceMetadata(invoice.id);
      setInvoices(prev => prev.filter(inv => inv.id !== invoice.id));
      toast.success('Invoice deleted');
    } catch (error) {
      toast.error('Delete failed');
    } finally {
      setDeletingId(null);
    }
  };

  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 10;

  const filteredInvoices = invoices.filter(inv => {
    const matchesSearch =
      inv.customerName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      inv.invoiceNumber?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesFilter = filterStatus === 'all' || inv.paymentStatus === filterStatus;
    const matchesSource = showLegacy || (inv.tripId !== undefined && inv.tripId !== null);
    return matchesSearch && matchesFilter && matchesSource;
  });

  const totalPages = Math.ceil(filteredInvoices.length / pageSize);
  const paginatedInvoices = filteredInvoices.slice(
    (currentPage - 1) * pageSize,
    currentPage * pageSize
  );

  // Reset to first page when searching or filtering
  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, filterStatus]);

  const totalPending = invoices
    .filter(i => i.paymentStatus === 'pending')
    .reduce((sum, i) => sum + getAmount(i), 0);

  const totalPaid = invoices
    .filter(i => i.paymentStatus === 'paid')
    .reduce((sum, i) => sum + getAmount(i), 0);

  return (
    <div className="bg-white border border-slate-200 rounded-2xl shadow-sm p-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-6">
        <div>
          <h1 className="text-3xl font-black text-slate-900 tracking-tight">Invoices</h1>
          <p className="text-slate-500 font-medium">Track payments and manage billing history</p>
        </div>
        <div className="flex items-center gap-3 flex-wrap">
          <div className="bg-orange-50 border border-orange-100 px-5 py-3 rounded-2xl text-center">
            <p className="text-[10px] font-black text-orange-400 uppercase tracking-widest">Outstanding</p>
            <p className="text-lg font-black text-orange-600">₹ {totalPending.toLocaleString()}</p>
          </div>
          <div className="bg-emerald-50 border border-emerald-100 px-5 py-3 rounded-2xl text-center">
            <p className="text-[10px] font-black text-emerald-500 uppercase tracking-widest">Collected</p>
            <p className="text-lg font-black text-emerald-600">₹ {totalPaid.toLocaleString()}</p>
          </div>
          <Link
            to="/create"
            className="bg-slate-900 hover:bg-slate-800 text-white px-6 py-3 rounded-2xl font-bold shadow-xl flex items-center gap-2 transition-all text-sm"
          >
            <Plus size={18} />
            New Invoice
          </Link>
        </div>
      </div>

      {/* Search & Filter */}
      <div className="bg-white p-4 rounded-2xl border border-slate-100 shadow-sm flex flex-col md:flex-row gap-4 items-center">
        <div className="relative flex-1 w-full">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-300" size={18} />
          <input
            type="text"
            placeholder="Search by customer or invoice #..."
            className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:ring-4 focus:ring-blue-50 focus:bg-white transition-all font-medium text-slate-700"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
        <div className="flex bg-slate-100 p-1 rounded-xl w-full md:w-auto">
          {(['all', 'pending', 'paid'] as const).map((status) => (
            <button
              key={status}
              onClick={() => setFilterStatus(status)}
              className={`px-6 py-2 rounded-lg text-xs font-bold capitalize transition-all flex-1 md:flex-none ${filterStatus === status
                  ? 'bg-white text-slate-900 shadow-sm'
                  : 'text-slate-500 hover:text-slate-700'
                }`}
            >
              {status === 'all' ? `All (${invoices.filter(i => showLegacy || (i.tripId !== undefined && i.tripId !== null)).length})` :
                status === 'pending' ? `Pending (${invoices.filter(i => i.paymentStatus === 'pending' && (showLegacy || (i.tripId !== undefined && i.tripId !== null))).length})` :
                  `Paid (${invoices.filter(i => i.paymentStatus === 'paid' && (showLegacy || (i.tripId !== undefined && i.tripId !== null))).length})`}
            </button>
          ))}
        </div>
        <button
          onClick={() => setShowLegacy(!showLegacy)}
          className={`px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all border ${showLegacy ? 'bg-slate-900 text-white border-slate-900' : 'bg-white text-slate-400 border-slate-200'}`}
        >
          {showLegacy ? 'Trip-Only Mode' : 'Show All History'}
        </button>
      </div>

      {/* Ready for Invoicing Section */}
      {!loading && pendingTrips.length > 0 && (
        <div className="bg-blue-50/50 rounded-[2rem] border border-blue-100 p-8 space-y-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-blue-600 rounded-2xl flex items-center justify-center text-white shadow-lg shadow-blue-200">
                <Clock size={20} />
              </div>
              <div>
                <h2 className="text-xl font-black text-slate-900 leading-tight">Ready for Invoicing</h2>
                <p className="text-xs text-blue-600 font-bold uppercase tracking-wider">Completed journeys pending settlement</p>
              </div>
            </div>
            <span className="bg-blue-600 text-white text-[10px] font-black px-3 py-1 rounded-full">{pendingTrips.length} Trips</span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {pendingTrips.map((trip) => (
              <div key={trip.id} className="bg-white p-5 rounded-2xl border border-blue-100 shadow-sm hover:shadow-md transition-all group">
                <div className="flex justify-between items-start mb-4">
                  <div>
                    <h3 className="font-bold text-slate-900 text-sm leading-tight">{trip.customerName}</h3>
                    <p className="text-[10px] text-slate-500 font-medium">{trip.vehicleNo} • {trip.driverName}</p>
                  </div>
                  <div className="p-2 bg-blue-50 text-blue-600 rounded-xl">
                    <MapPin size={16} />
                  </div>
                </div>
                <div className="flex items-center justify-between pt-3 border-t border-slate-50">
                   <p className="text-[10px] text-slate-400 font-bold">{new Date(trip.completedAt || trip.startTime).toLocaleDateString()}</p>
                   <Link 
                    to={`/create?tripId=${trip.id}`}
                    className="flex items-center gap-1.5 text-blue-600 font-black text-[10px] uppercase tracking-widest hover:gap-2 transition-all"
                   >
                     Bill Now <ArrowRight size={12} />
                   </Link>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Invoice Grid */}
      {loading ? (
        <div className="bg-white rounded-3xl border border-slate-100 p-20 flex flex-col items-center justify-center">
          <Loader2 className="animate-spin text-blue-600 mb-4" size={40} />
          <p className="text-slate-500 font-medium tracking-wide">Loading invoices...</p>
        </div>
      ) : paginatedInvoices.length > 0 ? (
        <div className="space-y-6 flex flex-col">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {paginatedInvoices.map((inv) => (
            <div key={inv.id} className="bg-white rounded-[2rem] border border-slate-100 shadow-sm hover:shadow-xl transition-all duration-300 overflow-hidden">
              <div className="p-6">
                <div className="flex justify-between items-start mb-5">
                  <div className={`p-2.5 rounded-xl ${inv.paymentStatus === 'paid' ? 'bg-emerald-50 text-emerald-600' : 'bg-orange-50 text-orange-500'}`}>
                    {inv.paymentStatus === 'paid' ? <CheckCircle2 size={20} /> : <Clock size={20} />}
                  </div>
                  <div className="flex gap-1">
                    {/* View Invoice PDF in Drive */}
                    {isSignedIn && inv.driveFileId && (
                      <a
                        href={`https://drive.google.com/file/d/${inv.driveFileId}/view`}
                        target="_blank"
                        rel="noreferrer"
                        title="View Invoice PDF"
                        className="p-2 text-slate-300 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-all"
                      >
                        <ExternalLink size={15} />
                      </a>
                    )}
                    {/* Edit Invoice */}
                    <Link
                      to={`/edit/${encodeURIComponent(inv.id)}`}
                      title="Edit Invoice"
                      className="p-2 text-slate-300 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-all"
                    >
                      <Edit2 size={15} />
                    </Link>
                    {/* Delete */}
                    <button
                      onClick={() => handleDelete(inv)}
                      disabled={deletingId === inv.id}
                      title="Delete Invoice"
                      className="p-2 text-slate-300 hover:text-red-600 hover:bg-red-50 rounded-lg transition-all"
                    >
                      {deletingId === inv.id ? <Loader2 size={15} className="animate-spin" /> : <Trash2 size={15} />}
                    </button>
                  </div>
                </div>

                <div className="space-y-3">
                  <div>
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">{inv.invoiceNumber}</p>
                    <h3 className="text-lg font-extrabold text-slate-900 leading-tight">{inv.customerName}</h3>
                    {inv.customerCompanyName && (
                      <p className="text-xs text-slate-400">{inv.customerCompanyName}</p>
                    )}
                  </div>

                  <div className="flex items-end justify-between pt-3 border-t border-slate-50">
                    <div>
                      <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Total Bill</p>
                      <p className="text-2xl font-black text-slate-900">₹ {getAmount(inv).toLocaleString()}</p>
                      <p className="text-[10px] text-slate-400">{new Date(inv.createdAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}</p>
                    </div>
                    {inv.paymentStatus === 'paid' ? (
                      <div className="text-right">
                        <span className="px-3 py-1 bg-emerald-100 text-emerald-700 text-[10px] font-black uppercase tracking-widest rounded-lg block mb-1">PAID</span>
                        {inv.paymentMode && <p className="text-[10px] text-slate-400 capitalize">{inv.paymentMode}</p>}
                        <button
                          onClick={() => handleMarkUnpaid(inv.id)}
                          className="text-[10px] text-slate-400 hover:text-orange-600 underline mt-1"
                        >
                          Revert
                        </button>
                      </div>
                    ) : (
                      <button
                        onClick={() => openPaymentModal(inv)}
                        className="px-4 py-2.5 bg-slate-900 text-white rounded-xl text-xs font-extrabold hover:bg-slate-800 transition-all shadow-lg shadow-slate-100"
                      >
                        Mark Paid
                      </button>
                    )}
                  </div>
                </div>
              </div>
            </div>
            ))}
          </div>
          <Pagination 
            currentPage={currentPage}
            totalPages={totalPages}
            onPageChange={setCurrentPage}
            totalItems={filteredInvoices.length}
            pageSize={pageSize}
          />
        </div>
      ) : (
        <div className="bg-white rounded-[2.5rem] border border-slate-100 p-24 text-center">
          <div className="w-20 h-20 bg-slate-50 rounded-3xl flex items-center justify-center mx-auto mb-6 text-slate-300">
            <Filter size={40} />
          </div>
          <h3 className="text-xl font-black text-slate-900 mb-2">No Invoices Found</h3>
          <p className="text-slate-500 max-w-sm mx-auto font-medium">Create your first invoice from the Trips page or click New Invoice.</p>
        </div>
      )}

      {payingInvoice && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm">
          <div className="bg-white w-full max-w-sm rounded-lg shadow-xl overflow-hidden border border-slate-200">
            <div className="px-6 py-4 border-b border-slate-200 flex justify-between items-center bg-slate-50/50">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 bg-blue-600 rounded flex items-center justify-center text-white">
                  <CreditCard size={18} />
                </div>
                <div>
                  <h2 className="text-sm font-bold text-slate-800 leading-tight">Record Payment</h2>
                  <p className="text-[10px] text-slate-500 font-semibold uppercase tracking-wider">{payingInvoice.invoiceNumber}</p>
                </div>
              </div>
              <button onClick={() => setPayingInvoice(null)} className="text-slate-400 hover:bg-slate-100 p-1.5 rounded transition-colors border border-transparent hover:border-slate-200">
                <X size={18} />
              </button>
            </div>
            
            <div className="p-6 pb-0">
               <div className="bg-slate-50 p-4 rounded-lg border border-slate-200 shadow-sm mb-4">
                  <p className="text-slate-500 text-[10px] font-bold uppercase tracking-wider mb-1">Total Billable</p>
                  <p className="text-2xl font-bold text-slate-900">₹ {getAmount(payingInvoice).toLocaleString()}</p>
               </div>
            </div>

            <div className="p-6 space-y-5">
              <div>
                <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-2">Payment Mode</p>
                <div className="grid grid-cols-2 gap-2">
                  {PAYMENT_MODES.map(({ id, label, icon: Icon }) => (
                    <button
                      key={id}
                      onClick={() => setPaymentMode(id)}
                      className={`flex items-center gap-2 px-3 py-2 rounded border text-xs font-bold transition-all shadow-sm ${paymentMode === id
                          ? 'bg-slate-900 border-slate-900 text-white'
                          : 'bg-white border-slate-200 text-slate-600 hover:border-slate-300'
                        }`}
                    >
                      <Icon size={14} />
                      {label}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-2">Amount Received (₹)</p>
                <input
                  type="number"
                  className="w-full px-3 py-2 bg-white border border-slate-300 rounded-md font-bold text-slate-900 outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500 transition-all text-lg shadow-sm"
                  value={amountReceived}
                  onChange={(e) => setAmountReceived(e.target.value)}
                />
              </div>

              <div className="pt-2">
                <button
                  onClick={handleMarkPaid}
                  disabled={savingPayment || !amountReceived}
                  className="w-full py-2.5 bg-blue-600 hover:bg-blue-700 disabled:bg-slate-100 disabled:text-slate-400 text-white rounded font-bold transition-all flex items-center justify-center gap-2 shadow-sm"
                >
                  {savingPayment ? <Loader2 size={18} className="animate-spin" /> : <CheckCircle2 size={18} />}
                  Confirm Settlement
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
