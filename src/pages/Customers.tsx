import { useState, useEffect } from 'react';
import { 
  Plus, 
  Search, 
  Edit2, 
  Trash2, 
  Users, 
  Building2, 
  Phone, 
  FileText, 
  ArrowRight,
  X,
  Loader2,
  CheckCircle2,
  Clock
} from 'lucide-react';
import toast from 'react-hot-toast';
import { masterService, type Customer } from '../services/masterService';
import { db } from '../services/firestore';
import { collection, query, where, getDocs, doc, updateDoc } from 'firebase/firestore';

interface CustomerInvoice {
  id: string;
  invoiceNumber: string;
  createdAt: string;
  totalAmount: number;
  paymentStatus: 'pending' | 'paid';
  paymentMode?: string;
}

export default function Customers() {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  
  // Modals
  const [isCustomerModalOpen, setIsCustomerModalOpen] = useState(false);
  const [isDetailsModalOpen, setIsDetailsModalOpen] = useState(false);
  
  // Selection
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
  const [editingCustomer, setEditingCustomer] = useState<Customer | null>(null);
  const [customerInvoices, setCustomerInvoices] = useState<CustomerInvoice[]>([]);
  const [loadingInvoices, setLoadingInvoices] = useState(false);

  // Form State
  const [formData, setFormData] = useState<Omit<Customer, 'id' | 'createdAt'>>({
    name: '',
    companyName: 'M/S ',
    address: '',
    phone: '',
    email: '',
    gstNo: ''
  });

  useEffect(() => {
    fetchCustomers();
  }, []);

  async function fetchCustomers() {
    try {
      setLoading(true);
      const data = await masterService.getCustomers();
      setCustomers(data);
    } catch (error) {
      console.error(error);
      toast.error('Failed to fetch customers');
    } finally {
      setLoading(false);
    }
  }

  const handleOpenModal = (customer?: Customer) => {
    if (customer) {
      setEditingCustomer(customer);
      setFormData({
        name: customer.name,
        companyName: customer.companyName,
        address: customer.address,
        phone: customer.phone,
        email: customer.email,
        gstNo: customer.gstNo
      });
    } else {
      setEditingCustomer(null);
      setFormData({
        name: '',
        companyName: 'M/S ',
        address: '',
        phone: '',
        email: '',
        gstNo: ''
      });
    }
    setIsCustomerModalOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (editingCustomer?.id) {
        await masterService.updateCustomer(editingCustomer.id, formData);
        toast.success('Customer updated successfully');
      } else {
        await masterService.addCustomer(formData as Customer);
        toast.success('Customer added successfully');
      }
      setIsCustomerModalOpen(false);
      fetchCustomers();
    } catch (error) {
      console.error(error);
      toast.error('Error saving customer');
    }
  };

  const handleOpenDetails = async (customer: Customer) => {
    setSelectedCustomer(customer);
    setIsDetailsModalOpen(true);
    setLoadingInvoices(true);
    try {
      // Query invoices for this customer
      // Note: We're searching by customerName which is saved in metadata
      const q = query(
        collection(db, 'invoices'),
        where('customerName', '==', customer.name)
      );
      const snap = await getDocs(q);
      const invoices = snap.docs
        .map(doc => ({
          id: doc.id,
          invoiceNumber: doc.data().invoiceNumber,
          createdAt: doc.data().createdAt,
          totalAmount: doc.data().totalAmount || doc.data().grandTotal || 0,
          paymentStatus: doc.data().paymentStatus || 'pending',
          paymentMode: doc.data().paymentMode
        }))
        .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
      setCustomerInvoices(invoices);
    } catch (error) {
      console.error(error);
      toast.error('Failed to load invoice history');
    } finally {
      setLoadingInvoices(false);
    }
  };

  const togglePaymentStatus = async (invoiceId: string, currentStatus: string) => {
    try {
      const newStatus = currentStatus === 'paid' ? 'pending' : 'paid';
      const ref = doc(db, 'invoices', invoiceId);
      await updateDoc(ref, { 
        paymentStatus: newStatus,
        paymentDate: newStatus === 'paid' ? new Date().toISOString() : null
      });
      
      // Update local state
      setCustomerInvoices(prev => prev.map(inv => 
        inv.id === invoiceId ? { ...inv, paymentStatus: newStatus as any } : inv
      ));
      
      toast.success(`Marked as ${newStatus}`);
    } catch (error) {
      console.error(error);
      toast.error('Failed to update status');
    }
  };

  const filteredCustomers = customers.filter(c => 
    c.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    c.companyName.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const pendingAmount = customerInvoices
    .filter(inv => inv.paymentStatus === 'pending')
    .reduce((sum, inv) => sum + inv.totalAmount, 0);

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Customers (CRM)</h1>
          <p className="text-slate-500 text-sm">Manage client relationships and billing history</p>
        </div>
        <button 
          onClick={() => handleOpenModal()}
          className="bg-slate-900 hover:bg-slate-800 text-white px-5 py-2.5 rounded-xl font-semibold transition-all shadow-md hover:shadow-lg flex items-center gap-2"
        >
          <Plus size={18} />
          Add Customer
        </button>
      </div>

      {/* Search */}
      <div className="bg-white p-4 rounded-xl border border-slate-200">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
          <input 
            type="text"
            placeholder="Search by name or company..."
            className="w-full pl-10 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-lg outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white transition-all"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
      </div>

      {/* Customers List */}
      {loading ? (
        <div className="flex flex-col items-center justify-center p-20 bg-white rounded-xl border border-slate-200">
          <Loader2 className="animate-spin text-blue-600 mb-4" size={32} />
          <p className="text-slate-500 font-medium">Loading customers...</p>
        </div>
      ) : filteredCustomers.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredCustomers.map((customer) => (
            <div key={customer.id} className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm hover:shadow-md transition-all group">
              <div className="flex justify-between items-start mb-4">
                <div className="w-12 h-12 bg-slate-100 rounded-xl flex items-center justify-center text-slate-600 group-hover:bg-slate-900 group-hover:text-white transition-all">
                  <Building2 size={24} />
                </div>
                <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                  <button onClick={() => handleOpenModal(customer)} className="p-2 text-slate-400 hover:text-blue-600 rounded-lg">
                    <Edit2 size={16} />
                  </button>
                  <button className="p-2 text-slate-400 hover:text-red-600 rounded-lg">
                    <Trash2 size={16} />
                  </button>
                </div>
              </div>

              <div className="space-y-4">
                <div>
                  <h3 className="font-bold text-slate-900 text-lg leading-tight">{customer.companyName}</h3>
                  <p className="text-slate-500 text-xs font-medium uppercase tracking-wide mt-1">{customer.name}</p>
                </div>

                <div className="space-y-2">
                  <div className="flex items-center gap-2 text-sm text-slate-600">
                    <Phone size={14} className="text-slate-400" />
                    <span>{customer.phone}</span>
                  </div>
                  {customer.gstNo && (
                    <div className="flex items-center gap-2 text-[10px] font-bold text-blue-600 bg-blue-50 px-2 py-0.5 rounded w-fit">
                      GST: {customer.gstNo}
                    </div>
                  )}
                </div>

                <button 
                  onClick={() => handleOpenDetails(customer)}
                  className="w-full mt-4 flex items-center justify-center gap-2 py-2.5 bg-slate-50 text-slate-900 rounded-xl text-sm font-bold hover:bg-slate-900 hover:text-white transition-all border border-slate-100 group/btn"
                >
                  View History
                  <ArrowRight size={16} className="group-hover/btn:translate-x-1 transition-transform" />
                </button>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-16 text-center">
          <Users size={48} className="mx-auto mb-4 text-slate-200" />
          <p className="text-slate-500 italic">No customers matched your search.</p>
        </div>
      )}

      {/* Add/Edit Modal */}
      {isCustomerModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm">
          <div className="bg-white w-full max-w-lg rounded-2xl shadow-2xl overflow-hidden animate-in zoom-in duration-200">
            <div className="px-6 py-4 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
              <h2 className="font-bold text-slate-900">{editingCustomer ? 'Edit Customer' : 'Add New Customer'}</h2>
              <button onClick={() => setIsCustomerModalOpen(false)} className="text-slate-500 hover:bg-slate-200 p-1 rounded-lg">
                <X size={18} />
              </button>
            </div>
            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase mb-2">Company Name</label>
                  <input 
                    type="text" required placeholder="e.g. M/S ABC Corp"
                    className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none"
                    value={formData.companyName}
                    onChange={(e) => setFormData({...formData, companyName: e.target.value})}
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase mb-2">Contact Person</label>
                  <input 
                    type="text" required placeholder="e.g. Rahul Sharma"
                    className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none"
                    value={formData.name}
                    onChange={(e) => setFormData({...formData, name: e.target.value})}
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase mb-2">Phone Number</label>
                  <input 
                    type="tel" required placeholder="+91 ..."
                    className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none"
                    value={formData.phone}
                    onChange={(e) => setFormData({...formData, phone: e.target.value})}
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase mb-2">Email Address</label>
                  <input 
                    type="email" placeholder="client@example.com"
                    className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none"
                    value={formData.email}
                    onChange={(e) => setFormData({...formData, email: e.target.value})}
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase mb-2">GST Number</label>
                <input 
                  type="text" placeholder="22AAAAA0000A1Z5"
                  className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none uppercase"
                  value={formData.gstNo}
                  onChange={(e) => setFormData({...formData, gstNo: e.target.value.toUpperCase()})}
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase mb-2">Address</label>
                <textarea 
                  rows={2} placeholder="Full billing address..."
                  className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none resize-none"
                  value={formData.address}
                  onChange={(e) => setFormData({...formData, address: e.target.value})}
                />
              </div>

              <button type="submit" className="w-full py-4 bg-slate-900 text-white rounded-xl font-bold shadow-lg mt-4 flex items-center justify-center gap-2">
                <CheckCircle2 size={18} />
                {editingCustomer ? 'Update Customer' : 'Save Customer'}
              </button>
            </form>
          </div>
        </div>
      )}

      {/* History Modal */}
      {isDetailsModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm">
          <div className="bg-white w-full max-w-4xl rounded-2xl shadow-2xl h-[85vh] flex flex-col overflow-hidden animate-in slide-in-from-bottom duration-300">
             <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
                <div className="flex items-center gap-4">
                    <div className="w-12 h-12 bg-slate-900 rounded-xl flex items-center justify-center text-white">
                        <Users size={24} />
                    </div>
                    <div>
                        <h2 className="font-bold text-slate-900 text-xl tracking-tight">{selectedCustomer?.companyName}</h2>
                        <p className="text-xs text-slate-500">Billing History & Outstanding Payments</p>
                    </div>
                </div>
                <button onClick={() => setIsDetailsModalOpen(false)} className="text-slate-400 hover:bg-slate-200 p-2 rounded-lg">
                    <X size={24} />
                </button>
             </div>

             <div className="flex-1 overflow-y-auto p-6">
                <div className="mb-8 grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="bg-blue-600 p-6 rounded-2xl text-white shadow-lg shadow-blue-100">
                        <p className="text-blue-100 text-sm font-medium">Pending Balance</p>
                        <p className="text-3xl font-extrabold mt-1">₹ {pendingAmount.toLocaleString()}</p>
                    </div>
                    <div className="bg-slate-900 p-6 rounded-2xl text-white shadow-lg shadow-slate-100">
                        <p className="text-slate-400 text-sm font-medium">Total Billed</p>
                        <p className="text-3xl font-extrabold mt-1">₹ {customerInvoices.reduce((sum, inv) => sum + inv.totalAmount, 0).toLocaleString()}</p>
                    </div>
                </div>

                <h3 className="font-bold text-slate-900 mb-4 flex items-center gap-2">
                    <FileText size={18} className="text-slate-400" />
                    Invoices ({customerInvoices.length})
                </h3>

                {loadingInvoices ? (
                    <div className="flex flex-col items-center justify-center py-12">
                        <Loader2 className="animate-spin text-blue-600 mb-2" size={32} />
                        <p className="text-sm text-slate-400">Loading history...</p>
                    </div>
                ) : customerInvoices.length > 0 ? (
                    <div className="overflow-x-auto">
                        <table className="w-full text-left">
                            <thead>
                                <tr className="text-[10px] font-bold text-slate-400 uppercase tracking-widest border-b border-slate-100">
                                    <th className="px-4 py-3">Date</th>
                                    <th className="px-4 py-3">Invoice #</th>
                                    <th className="px-4 py-3">Amount</th>
                                    <th className="px-4 py-3">Status</th>
                                    <th className="px-4 py-3 text-right">Actions</th>
                                </tr>
                            </thead>
                            <tbody>
                                {customerInvoices.map((inv) => (
                                    <tr key={inv.id} className="border-b border-slate-50 group hover:bg-slate-50 transition-colors">
                                        <td className="px-4 py-4 text-xs text-slate-500 font-medium">
                                            {new Date(inv.createdAt).toLocaleDateString()}
                                        </td>
                                        <td className="px-4 py-4 text-sm font-bold text-slate-900">
                                            {inv.invoiceNumber}
                                        </td>
                                        <td className="px-4 py-4 text-sm font-extrabold text-slate-900">
                                            ₹ {inv.totalAmount.toLocaleString()}
                                        </td>
                                        <td className="px-4 py-4">
                                            <span className={`px-2 py-1 rounded-full text-[10px] font-bold uppercase ${
                                                inv.paymentStatus === 'paid' ? 'bg-green-100 text-green-700' : 'bg-orange-100 text-orange-700'
                                            }`}>
                                                {inv.paymentStatus}
                                            </span>
                                        </td>
                                        <td className="px-4 py-4 text-right">
                                            <button 
                                                onClick={() => togglePaymentStatus(inv.id, inv.paymentStatus)}
                                                className={`text-xs font-bold px-3 py-1.5 rounded-lg transition-all ${
                                                    inv.paymentStatus === 'paid' 
                                                    ? 'text-slate-400 hover:text-slate-600 hover:bg-slate-100' 
                                                    : 'bg-green-600 text-white hover:bg-green-700 shadow-md'
                                                }`}
                                            >
                                                {inv.paymentStatus === 'paid' ? 'Mark Pending' : 'Mark Paid'}
                                            </button>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                ) : (
                    <div className="py-20 text-center bg-slate-50 rounded-2xl border border-dashed border-slate-200">
                        <Clock size={40} className="mx-auto mb-3 text-slate-300" />
                        <p className="text-slate-500 text-sm">No billing history found for this customer.</p>
                    </div>
                )}
             </div>

             <div className="p-6 bg-slate-50 border-t border-slate-100">
                 <button onClick={() => setIsDetailsModalOpen(false)} className="w-full py-3 bg-white border border-slate-200 text-slate-900 rounded-xl font-bold hover:bg-slate-100 transition-all">
                    Close History
                 </button>
             </div>
          </div>
        </div>
      )}
    </div>
  );
}

