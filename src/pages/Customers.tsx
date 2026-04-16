import { useState, useEffect } from 'react';
import { 
  Plus, 
  Search, 
  Edit2, 
  Trash2, 
  Users, 
  FileText, 
  X,
  Loader2,
  CheckCircle2,
  Clock
} from 'lucide-react';
import toast from 'react-hot-toast';
import { masterService, type Customer } from '../services/masterService';
import { db } from '../services/firestore';
import { collection, query, where, getDocs, doc, updateDoc } from 'firebase/firestore';
import { Pagination } from '../components/Pagination';

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

  const handleDeleteCustomer = async (id: string) => {
    if (!window.confirm('Are you sure you want to delete this customer? This will NOT delete their invoices.')) return;
    try {
      await masterService.deleteCustomer(id);
      toast.success('Customer deleted successfully');
      fetchCustomers();
    } catch (error) {
      console.error(error);
      toast.error('Failed to delete customer');
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

  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 10;

  const filteredCustomers = customers.filter(c => 
    c.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    c.companyName.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const totalPages = Math.ceil(filteredCustomers.length / pageSize);
  const paginatedCustomers = filteredCustomers.slice(
    (currentPage - 1) * pageSize,
    currentPage * pageSize
  );

  const pendingAmount = customerInvoices
    .filter(inv => inv.paymentStatus === 'pending')
    .reduce((sum, inv) => sum + inv.totalAmount, 0);

  // Reset to first page when searching
  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm]);

  return (
    <div className="bg-white border border-slate-200 rounded-2xl shadow-sm p-6 space-y-6">
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

      {/* Customers Table */}
      {loading ? (
        <div className="flex flex-col items-center justify-center p-20 bg-white rounded-lg border border-slate-200">
          <Loader2 className="animate-spin text-blue-600 mb-4" size={32} />
          <p className="text-slate-500 font-medium">Loading customers...</p>
        </div>
      ) : filteredCustomers.length > 0 ? (
        <div className="bg-white border text-sm border-slate-200 rounded-lg shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50 text-slate-500 border-b border-slate-200">
                  <th className="px-4 py-3 font-semibold uppercase text-[10px] tracking-wider">Company Details</th>
                  <th className="px-4 py-3 font-semibold uppercase text-[10px] tracking-wider">Contact Info</th>
                  <th className="px-4 py-3 font-semibold uppercase text-[10px] tracking-wider">GST No</th>
                  <th className="px-4 py-3 font-semibold uppercase text-[10px] tracking-wider text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {paginatedCustomers.map((customer) => (
                  <tr key={customer.id} className="hover:bg-slate-50 transition-colors group">
                    <td className="px-4 py-3">
                      <p className="font-semibold text-slate-800">{customer.companyName}</p>
                      <p className="text-xs text-slate-500 mt-0.5">{customer.name}</p>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex flex-col gap-0.5">
                        <span className="text-slate-700">{customer.phone}</span>
                        {customer.email && <span className="text-xs text-slate-500">{customer.email}</span>}
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      {customer.gstNo ? (
                        <span className="inline-flex items-center text-[10px] font-semibold text-slate-600 bg-slate-100 px-2 py-0.5 rounded border border-slate-200">
                          {customer.gstNo}
                        </span>
                      ) : (
                        <span className="text-xs text-slate-400 italic">None</span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center justify-end gap-2 transition-opacity">
                        <button onClick={() => handleOpenDetails(customer)} className="px-2 py-1 text-xs font-semibold text-slate-600 bg-white border border-slate-200 rounded hover:bg-slate-100 transition-colors">
                          History
                        </button>
                        <button onClick={() => handleOpenModal(customer)} className="p-1.5 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded transition-colors" title="Edit">
                          <Edit2 size={14} />
                        </button>
                        <button 
                          onClick={() => handleDeleteCustomer(customer.id!)}
                          className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded transition-colors" 
                          title="Delete"
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <Pagination 
            currentPage={currentPage}
            totalPages={totalPages}
            onPageChange={setCurrentPage}
            totalItems={filteredCustomers.length}
            pageSize={pageSize}
          />
        </div>
      ) : (
        <div className="bg-white rounded-lg border border-slate-200 shadow-sm p-16 text-center">
          <Users size={40} className="mx-auto mb-3 text-slate-200" />
          <p className="text-slate-500 font-medium">No customers matched your search.</p>
        </div>
      )}

      {isCustomerModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm">
          <div className="bg-white w-full max-w-lg rounded-lg shadow-xl overflow-hidden border border-slate-200 animate-in fade-in zoom-in duration-200">
            <div className="px-6 py-4 border-b border-slate-200 flex justify-between items-center bg-slate-50/50">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 bg-blue-600 rounded flex items-center justify-center text-white">
                  <Plus size={18} />
                </div>
                <div>
                  <h2 className="text-sm font-bold text-slate-800 leading-tight">{editingCustomer ? 'Update Profile' : 'New Customer'}</h2>
                  <p className="text-[10px] text-slate-500 font-semibold uppercase tracking-wider">CRM Registry</p>
                </div>
              </div>
              <button onClick={() => setIsCustomerModalOpen(false)} className="text-slate-400 hover:bg-slate-100 p-1.5 rounded transition-colors border border-transparent hover:border-slate-200">
                <X size={18} />
              </button>
            </div>
            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1.5">Company Name</label>
                  <input 
                    type="text" required placeholder="e.g. M/S ABC Corp"
                    className="w-full px-3 py-2 bg-white border border-slate-300 rounded-md focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none text-sm font-semibold shadow-sm"
                    value={formData.companyName}
                    onChange={(e) => setFormData({...formData, companyName: e.target.value})}
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1.5">Contact Person</label>
                  <input 
                    type="text" placeholder="name"
                    className="w-full px-3 py-2 bg-white border border-slate-300 rounded-md focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none text-sm font-semibold shadow-sm"
                    value={formData.name}
                    onChange={(e) => setFormData({...formData, name: e.target.value})}
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1.5">Phone Number</label>
                  <input 
                    type="tel" placeholder="+91 ..."
                    className="w-full px-3 py-2 bg-white border border-slate-300 rounded-md focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none text-sm font-semibold shadow-sm"
                    value={formData.phone}
                    onChange={(e) => setFormData({...formData, phone: e.target.value})}
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1.5">Email Address</label>
                  <input 
                    type="email" placeholder="client@example.com"
                    className="w-full px-3 py-2 bg-white border border-slate-300 rounded-md focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none text-sm font-semibold shadow-sm"
                    value={formData.email}
                    onChange={(e) => setFormData({...formData, email: e.target.value})}
                  />
                </div>
              </div>

              <div>
                <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1.5">GST Number</label>
                <input 
                  type="text" placeholder="22AAAAA0000A1Z5"
                  className="w-full px-3 py-2 bg-white border border-slate-300 rounded-md focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none text-sm font-bold shadow-sm uppercase"
                  value={formData.gstNo}
                  onChange={(e) => setFormData({...formData, gstNo: e.target.value.toUpperCase()})}
                />
              </div>

              <div>
                <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1.5">Address</label>
                <textarea 
                  rows={2} placeholder="Full billing address..."
                  className="w-full px-3 py-2 bg-white border border-slate-300 rounded-md focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none text-sm font-semibold shadow-sm resize-none"
                  value={formData.address}
                  onChange={(e) => setFormData({...formData, address: e.target.value})}
                />
              </div>

              <div className="pt-2">
                <button type="submit" className="w-full py-2.5 bg-slate-900 text-white rounded font-bold shadow-sm hover:bg-black transition-all flex items-center justify-center gap-2">
                  <CheckCircle2 size={18} />
                  {editingCustomer ? 'Update Profile' : 'Register Customer'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* History Modal */}
      {isDetailsModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm">
          <div className="bg-white w-full max-w-4xl rounded-lg shadow-xl h-[85vh] flex flex-col overflow-hidden border border-slate-200 animate-in slide-in-from-bottom duration-300">
             <div className="px-6 py-4 border-b border-slate-200 flex justify-between items-center bg-slate-50/50">
                <div className="flex items-center gap-3">
                    <div className="w-8 h-8 bg-slate-900 rounded flex items-center justify-center text-white">
                        <Users size={18} />
                    </div>
                    <div>
                        <h2 className="text-sm font-bold text-slate-800 leading-tight">{selectedCustomer?.companyName}</h2>
                        <p className="text-[10px] text-slate-500 font-semibold uppercase tracking-wider">Account History & Statements</p>
                    </div>
                </div>
                <button onClick={() => setIsDetailsModalOpen(false)} className="text-slate-400 hover:bg-slate-100 p-1.5 rounded transition-colors border border-transparent hover:border-slate-200">
                    <X size={18} />
                </button>
             </div>

             <div className="flex-1 overflow-y-auto p-6 space-y-6">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="bg-blue-600 p-5 rounded-lg text-white shadow-sm">
                        <p className="text-blue-100 text-[10px] font-bold uppercase tracking-wider">Pending Balance</p>
                        <p className="text-2xl font-bold mt-1">₹ {pendingAmount.toLocaleString()}</p>
                    </div>
                    <div className="bg-slate-900 p-5 rounded-lg text-white shadow-sm">
                        <p className="text-slate-400 text-[10px] font-bold uppercase tracking-wider">Total Billed</p>
                        <p className="text-2xl font-bold mt-1">₹ {customerInvoices.reduce((sum, inv) => sum + inv.totalAmount, 0).toLocaleString()}</p>
                    </div>
                </div>

                <h3 className="font-bold text-slate-800 text-sm flex items-center gap-2">
                    <FileText size={16} className="text-slate-400" />
                    Billed Invoices ({customerInvoices.length})
                </h3>

                {loadingInvoices ? (
                    <div className="flex flex-col items-center justify-center py-12">
                        <Loader2 className="animate-spin text-blue-600 mb-2" size={24} />
                        <p className="text-xs text-slate-400 font-medium">Loading history...</p>
                    </div>
                ) : customerInvoices.length > 0 ? (
                    <div className="border border-slate-200 rounded-lg overflow-hidden shadow-sm">
                        <table className="w-full text-left">
                            <thead className="bg-slate-50">
                                <tr className="text-[10px] font-bold text-slate-500 uppercase tracking-wider border-b border-slate-200">
                                    <th className="px-4 py-3">Date</th>
                                    <th className="px-4 py-3">Invoice #</th>
                                    <th className="px-4 py-3">Amount</th>
                                    <th className="px-4 py-3">Status</th>
                                    <th className="px-4 py-3 text-right">Actions</th>
                                </tr>
                            </thead>
                            <tbody>
                                {customerInvoices.map((inv) => (
                                    <tr key={inv.id} className="border-b border-slate-100 group hover:bg-slate-50 transition-colors">
                                        <td className="px-4 py-3 text-[11px] text-slate-500 font-medium font-mono">
                                            {new Date(inv.createdAt).toLocaleDateString(undefined, { day: '2-digit', month: 'short', year: 'numeric' })}
                                        </td>
                                        <td className="px-4 py-3 text-xs font-semibold text-slate-800">
                                            {inv.invoiceNumber}
                                        </td>
                                        <td className="px-4 py-3 text-xs font-bold text-slate-900">
                                            ₹ {inv.totalAmount.toLocaleString()}
                                        </td>
                                        <td className="px-4 py-3">
                                            <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase border ${
                                                inv.paymentStatus === 'paid' 
                                                ? 'bg-emerald-50 text-emerald-700 border-emerald-100' 
                                                : 'bg-orange-50 text-orange-700 border-orange-100'
                                            }`}>
                                                {inv.paymentStatus}
                                            </span>
                                        </td>
                                        <td className="px-4 py-3 text-right">
                                            <button 
                                                onClick={() => togglePaymentStatus(inv.id, inv.paymentStatus)}
                                                className={`text-[10px] font-bold px-2 py-1 rounded transition-all border ${
                                                    inv.paymentStatus === 'paid' 
                                                    ? 'text-slate-400 border-slate-200 hover:text-slate-600 hover:bg-slate-50' 
                                                    : 'bg-blue-600 text-white border-blue-600 hover:bg-blue-700 shadow-sm'
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
                    <div className="py-16 text-center bg-slate-50 rounded-lg border border-dashed border-slate-200">
                        <Clock size={32} className="mx-auto mb-2 text-slate-300" />
                        <p className="text-slate-500 text-xs font-medium">No billing history found for this customer.</p>
                    </div>
                )}
             </div>

             <div className="p-4 bg-slate-50 border-t border-slate-200 flex justify-end">
                 <button onClick={() => setIsDetailsModalOpen(false)} className="px-4 py-1.5 bg-white border border-slate-300 text-slate-700 rounded font-bold text-xs hover:bg-slate-50 transition-all shadow-sm">
                     Close Record
                 </button>
             </div>
          </div>
        </div>
      )}
    </div>
  );
}

