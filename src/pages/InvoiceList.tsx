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
  Edit2
} from 'lucide-react';
import toast from 'react-hot-toast';
import { useDrive } from '../services/useDrive';
import { db, deleteInvoiceMetadata } from '../services/firestore';
import { collection, getDocs, doc, updateDoc } from 'firebase/firestore';

interface InvoiceMetadata {
  id: string;
  invoiceNumber: string;
  customerName: string;
  // Amount can be stored under different field names across history
  grandTotal?: number;
  totalAmount?: number;
  total?: number;
  paymentStatus: 'pending' | 'paid';
  createdAt: string;
  customerCompanyName?: string;
  paymentMode?: string;
  paymentDate?: string;
  amountReceived?: number;
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

  // Helper: check all possible field names — Drive file ID is the document ID (inv.id)
  const getAmount = (inv: any) =>
    inv.grandTotal ?? inv.totalAmount ?? inv.total ?? 0;

  useEffect(() => {
    fetchInvoices();
  }, []);

  async function fetchInvoices() {
    try {
      setLoading(true);
      const snap = await getDocs(collection(db, 'invoices'));
      const data = snap.docs
        .map(d => ({ id: d.id, ...d.data() } as InvoiceMetadata))
        .sort((a, b) => new Date((b as any).createdAt).getTime() - new Date((a as any).createdAt).getTime());
      // DEBUG: log the first invoice's keys so we can see what field names exist
      if (data.length > 0) {
        console.log('🧾 Invoice field names:', Object.keys(data[0]));
        console.log('🧾 First invoice data:', data[0]);
      }
      setInvoices(data);
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

  const filteredInvoices = invoices.filter(inv => {
    const matchesSearch =
      inv.customerName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      inv.invoiceNumber?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesFilter = filterStatus === 'all' || inv.paymentStatus === filterStatus;
    return matchesSearch && matchesFilter;
  });

  const totalPending = invoices
    .filter(i => i.paymentStatus === 'pending')
    .reduce((sum, i) => sum + getAmount(i), 0);

  const totalPaid = invoices
    .filter(i => i.paymentStatus === 'paid')
    .reduce((sum, i) => sum + getAmount(i), 0);

  return (
    <div className="space-y-6">
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
              {status === 'all' ? `All (${invoices.length})` :
                status === 'pending' ? `Pending (${invoices.filter(i => i.paymentStatus === 'pending').length})` :
                  `Paid (${invoices.filter(i => i.paymentStatus === 'paid').length})`}
            </button>
          ))}
        </div>
      </div>

      {/* Invoice Grid */}
      {loading ? (
        <div className="bg-white rounded-3xl border border-slate-100 p-20 flex flex-col items-center justify-center">
          <Loader2 className="animate-spin text-blue-600 mb-4" size={40} />
          <p className="text-slate-500 font-medium tracking-wide">Loading invoices...</p>
        </div>
      ) : filteredInvoices.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredInvoices.map((inv) => (
            <div key={inv.id} className="bg-white rounded-[2rem] border border-slate-100 shadow-sm hover:shadow-xl transition-all duration-300 overflow-hidden">
              <div className="p-6">
                <div className="flex justify-between items-start mb-5">
                  <div className={`p-2.5 rounded-xl ${inv.paymentStatus === 'paid' ? 'bg-emerald-50 text-emerald-600' : 'bg-orange-50 text-orange-500'}`}>
                    {inv.paymentStatus === 'paid' ? <CheckCircle2 size={20} /> : <Clock size={20} />}
                  </div>
                  <div className="flex gap-1">
                    {/* View Invoice PDF in Drive (Drive file ID = document ID) */}
                    {isSignedIn && (
                      <a
                        href={`https://drive.google.com/file/d/${inv.id}/view`}
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
      ) : (
        <div className="bg-white rounded-[2.5rem] border border-slate-100 p-24 text-center">
          <div className="w-20 h-20 bg-slate-50 rounded-3xl flex items-center justify-center mx-auto mb-6 text-slate-300">
            <Filter size={40} />
          </div>
          <h3 className="text-xl font-black text-slate-900 mb-2">No Invoices Found</h3>
          <p className="text-slate-500 max-w-sm mx-auto font-medium">Create your first invoice from the Trips page or click New Invoice.</p>
        </div>
      )}

      {/* Payment Modal */}
      {payingInvoice && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm">
          <div className="bg-white w-full max-w-sm rounded-3xl shadow-2xl overflow-hidden">
            <div className="bg-slate-900 p-6 text-white">
              <div className="flex justify-between items-start">
                <div>
                  <p className="text-slate-400 text-xs font-bold uppercase tracking-widest mb-1">Collecting Payment</p>
                  <h2 className="text-xl font-black">{payingInvoice.customerName}</h2>
                  <p className="text-slate-400 text-sm">{payingInvoice.invoiceNumber}</p>
                </div>
                <button
                  onClick={() => setPayingInvoice(null)}
                  className="text-slate-400 hover:text-white p-1 rounded-lg transition-colors"
                >
                  <X size={20} />
                </button>
              </div>
              <div className="mt-4 pt-4 border-t border-white/10">
                <p className="text-slate-400 text-xs uppercase tracking-widest">Invoice Total</p>
                <p className="text-3xl font-black">₹ {getAmount(payingInvoice).toLocaleString()}</p>
              </div>
            </div>

            <div className="p-6 space-y-5">
              <div>
                <p className="text-xs font-black text-slate-500 uppercase tracking-widest mb-3">Payment Mode</p>
                <div className="grid grid-cols-2 gap-2">
                  {PAYMENT_MODES.map(({ id, label, icon: Icon }) => (
                    <button
                      key={id}
                      onClick={() => setPaymentMode(id)}
                      className={`flex items-center gap-2 px-4 py-3 rounded-xl border-2 text-sm font-bold transition-all ${paymentMode === id
                          ? 'border-slate-900 bg-slate-900 text-white'
                          : 'border-slate-100 bg-slate-50 text-slate-600 hover:border-slate-300'
                        }`}
                    >
                      <Icon size={16} />
                      {label}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <p className="text-xs font-black text-slate-500 uppercase tracking-widest mb-2">Amount Received (₹)</p>
                <input
                  type="number"
                  className="w-full px-4 py-3 bg-slate-50 border-2 border-slate-200 rounded-xl font-bold text-slate-900 outline-none focus:border-slate-900 transition-all text-lg"
                  value={amountReceived}
                  onChange={(e) => setAmountReceived(e.target.value)}
                />
              </div>

              <button
                onClick={handleMarkPaid}
                disabled={savingPayment || !amountReceived}
                className="w-full py-4 bg-emerald-600 hover:bg-emerald-700 disabled:bg-slate-200 disabled:text-slate-400 text-white rounded-2xl font-black text-base transition-all flex items-center justify-center gap-2 shadow-lg shadow-emerald-100"
              >
                {savingPayment ? <Loader2 size={20} className="animate-spin" /> : <CheckCircle2 size={20} />}
                Confirm Payment
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
