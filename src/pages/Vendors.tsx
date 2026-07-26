import { useState, useEffect } from 'react';
import { 
  Plus, 
  Search, 
  Edit2, 
  Trash2, 
  Briefcase,
  X,
  Loader2
} from 'lucide-react';
import toast from 'react-hot-toast';
import { masterService, type Vendor } from '../services/masterService';
import { Pagination } from '../components/Pagination';

export default function Vendors() {
  const [vendors, setVendors] = useState<Vendor[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  
  // Modals
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingVendor, setEditingVendor] = useState<Vendor | null>(null);

  // Form State
  const [formData, setFormData] = useState<Omit<Vendor, 'id' | 'createdAt'>>({
    name: '',
    contactPerson: '',
    phone: '',
    email: '',
    address: '',
    gstNo: '',
    bankDetails: {
      accountName: '',
      accountNumber: '',
      bankName: '',
      ifsc: ''
    }
  });

  useEffect(() => {
    fetchVendors();
  }, []);

  async function fetchVendors() {
    try {
      setLoading(true);
      const data = await masterService.getVendors();
      setVendors(data);
    } catch (error) {
      console.error(error);
      toast.error('Failed to fetch vendors');
    } finally {
      setLoading(false);
    }
  }

  const handleOpenModal = (vendor?: Vendor) => {
    if (vendor) {
      setEditingVendor(vendor);
      setFormData({
        name: vendor.name,
        contactPerson: vendor.contactPerson || '',
        phone: vendor.phone || '',
        email: vendor.email || '',
        address: vendor.address || '',
        gstNo: vendor.gstNo || '',
        bankDetails: vendor.bankDetails || {
          accountName: '',
          accountNumber: '',
          bankName: '',
          ifsc: ''
        }
      });
    } else {
      setEditingVendor(null);
      setFormData({
        name: '',
        contactPerson: '',
        phone: '',
        email: '',
        address: '',
        gstNo: '',
        bankDetails: {
          accountName: '',
          accountNumber: '',
          bankName: '',
          ifsc: ''
        }
      });
    }
    setIsModalOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (editingVendor?.id) {
        await masterService.updateVendor(editingVendor.id, formData);
        toast.success('Vendor updated successfully');
      } else {
        await masterService.addVendor(formData as Vendor);
        toast.success('Vendor added successfully');
      }
      setIsModalOpen(false);
      fetchVendors();
    } catch (error) {
      console.error(error);
      toast.error('Error saving vendor');
    }
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm('Are you sure you want to delete this vendor?')) return;
    try {
      await masterService.deleteVendor(id);
      toast.success('Vendor deleted successfully');
      fetchVendors();
    } catch (error) {
      console.error(error);
      toast.error('Failed to delete vendor');
    }
  };

  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 10;

  const filteredVendors = vendors.filter(v => 
    v.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
    (v.contactPerson && v.contactPerson.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  const totalPages = Math.ceil(filteredVendors.length / pageSize);
  const paginatedVendors = filteredVendors.slice(
    (currentPage - 1) * pageSize,
    currentPage * pageSize
  );

  // Reset to first page when searching
  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm]);

  return (
    <div className="bg-white border border-slate-200 rounded-2xl shadow-sm p-6 space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Vendors</h1>
          <p className="text-slate-500 text-sm">Manage outside vehicle owners and travel agencies</p>
        </div>
        <button 
          onClick={() => handleOpenModal()}
          className="bg-slate-900 hover:bg-slate-800 text-white px-5 py-2.5 rounded-xl font-semibold transition-all shadow-md hover:shadow-lg flex items-center gap-2"
        >
          <Plus size={18} />
          Add Vendor
        </button>
      </div>

      {/* Search */}
      <div className="bg-white p-4 rounded-xl border border-slate-200">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
          <input 
            type="text"
            placeholder="Search by vendor name or contact person..."
            className="w-full pl-10 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-lg outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white transition-all"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
      </div>

      {/* Vendors Table */}
      {loading ? (
        <div className="flex flex-col items-center justify-center p-20 bg-white rounded-lg border border-slate-200">
          <Loader2 className="animate-spin text-blue-600 mb-4" size={32} />
          <p className="text-slate-500 font-medium">Loading vendors...</p>
        </div>
      ) : filteredVendors.length > 0 ? (
        <div className="bg-white border text-sm border-slate-200 rounded-lg shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50 text-slate-500 border-b border-slate-200">
                  <th className="px-4 py-3 font-semibold uppercase text-[10px] tracking-wider">Vendor Name</th>
                  <th className="px-4 py-3 font-semibold uppercase text-[10px] tracking-wider">Contact</th>
                  <th className="px-4 py-3 font-semibold uppercase text-[10px] tracking-wider">Bank Details</th>
                  <th className="px-4 py-3 font-semibold uppercase text-[10px] tracking-wider text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {paginatedVendors.map((vendor) => (
                  <tr key={vendor.id} className="hover:bg-slate-50 transition-colors group">
                    <td className="px-4 py-3">
                      <p className="font-semibold text-slate-800">{vendor.name}</p>
                      {vendor.gstNo && <p className="text-[10px] text-slate-500 font-mono mt-0.5">GST: {vendor.gstNo}</p>}
                    </td>
                    <td className="px-4 py-3">
                      <p className="text-sm font-medium text-slate-700">{vendor.contactPerson || '-'}</p>
                      <p className="text-xs text-slate-500">{vendor.phone}</p>
                    </td>
                    <td className="px-4 py-3">
                      {vendor.bankDetails && vendor.bankDetails.accountNumber ? (
                        <div>
                          <p className="text-xs font-semibold text-slate-700">{vendor.bankDetails.bankName}</p>
                          <p className="text-[10px] text-slate-500 font-mono">{vendor.bankDetails.accountNumber}</p>
                        </div>
                      ) : (
                        <span className="text-slate-400 italic text-xs">Not added</span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center justify-end gap-2">
                        <button
                          onClick={() => handleOpenModal(vendor)}
                          className="p-1.5 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded transition-colors"
                          title="Edit"
                        >
                          <Edit2 size={16} />
                        </button>
                        <button
                          onClick={() => handleDelete(vendor.id!)}
                          className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded transition-colors"
                          title="Delete"
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {totalPages > 1 && (
            <Pagination 
              currentPage={currentPage} 
              totalPages={totalPages} 
              onPageChange={setCurrentPage} 
              totalItems={filteredVendors.length}
              pageSize={pageSize}
            />
          )}
        </div>
      ) : (
        <div className="flex flex-col items-center justify-center p-20 bg-white border border-slate-200 rounded-lg text-center">
          <div className="w-16 h-16 bg-slate-50 rounded-full flex items-center justify-center mb-4">
            <Briefcase className="text-slate-400" size={32} />
          </div>
          <h3 className="text-lg font-bold text-slate-900 mb-1">No vendors found</h3>
          <p className="text-slate-500 text-sm max-w-md">
            {searchTerm ? 'Try adjusting your search terms.' : 'Add your first vendor to start logging purchase bills.'}
          </p>
          {!searchTerm && (
            <button
              onClick={() => handleOpenModal()}
              className="mt-6 bg-slate-900 hover:bg-slate-800 text-white px-5 py-2.5 rounded-xl font-semibold transition-all shadow-md hover:shadow-lg flex items-center gap-2"
            >
              <Plus size={18} />
              Add Vendor
            </button>
          )}
        </div>
      )}

      {/* Add/Edit Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm">
          <div className="bg-white w-full max-w-2xl rounded-2xl shadow-xl overflow-hidden animate-in fade-in zoom-in duration-200 max-h-[90vh] flex flex-col">
            <div className="px-6 py-4 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
              <h2 className="text-lg font-bold text-slate-800">
                {editingVendor ? 'Edit Vendor' : 'Add New Vendor'}
              </h2>
              <button 
                onClick={() => setIsModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 hover:bg-slate-100 p-1.5 rounded-lg transition-colors"
              >
                <X size={20} />
              </button>
            </div>
            
            <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-6 space-y-6">
              
              <div>
                <h3 className="text-sm font-bold text-slate-800 mb-4 flex items-center gap-2 uppercase tracking-wide">
                  <Briefcase size={16} className="text-blue-500" /> Basic Details
                </h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-slate-600 mb-1">Vendor Name / Agency Name *</label>
                    <input 
                      type="text" required 
                      className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                      value={formData.name}
                      onChange={e => setFormData({...formData, name: e.target.value})}
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-600 mb-1">Contact Person</label>
                    <input 
                      type="text" 
                      className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                      value={formData.contactPerson}
                      onChange={e => setFormData({...formData, contactPerson: e.target.value})}
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-600 mb-1">Phone Number</label>
                    <input 
                      type="tel" 
                      className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                      value={formData.phone}
                      onChange={e => setFormData({...formData, phone: e.target.value})}
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-600 mb-1">Email</label>
                    <input 
                      type="email" 
                      className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                      value={formData.email}
                      onChange={e => setFormData({...formData, email: e.target.value})}
                    />
                  </div>
                  <div className="sm:col-span-2">
                    <label className="block text-xs font-semibold text-slate-600 mb-1">Billing Address</label>
                    <textarea 
                      rows={2}
                      className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                      value={formData.address}
                      onChange={e => setFormData({...formData, address: e.target.value})}
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-600 mb-1">GSTIN</label>
                    <input 
                      type="text" 
                      className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none uppercase"
                      value={formData.gstNo}
                      onChange={e => setFormData({...formData, gstNo: e.target.value.toUpperCase()})}
                    />
                  </div>
                </div>
              </div>

              <div className="pt-4 border-t border-slate-100">
                <h3 className="text-sm font-bold text-slate-800 mb-4 flex items-center gap-2 uppercase tracking-wide">
                  Bank Details
                </h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-slate-600 mb-1">Account Name</label>
                    <input 
                      type="text" 
                      className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                      value={formData.bankDetails?.accountName || ''}
                      onChange={e => setFormData({...formData, bankDetails: { ...formData.bankDetails!, accountName: e.target.value }})}
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-600 mb-1">Account Number</label>
                    <input 
                      type="text" 
                      className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                      value={formData.bankDetails?.accountNumber || ''}
                      onChange={e => setFormData({...formData, bankDetails: { ...formData.bankDetails!, accountNumber: e.target.value }})}
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-600 mb-1">Bank Name</label>
                    <input 
                      type="text" 
                      className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                      value={formData.bankDetails?.bankName || ''}
                      onChange={e => setFormData({...formData, bankDetails: { ...formData.bankDetails!, bankName: e.target.value }})}
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-600 mb-1">IFSC Code</label>
                    <input 
                      type="text" 
                      className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none uppercase"
                      value={formData.bankDetails?.ifsc || ''}
                      onChange={e => setFormData({...formData, bankDetails: { ...formData.bankDetails!, ifsc: e.target.value.toUpperCase() }})}
                    />
                  </div>
                </div>
              </div>

              <div className="pt-6 border-t border-slate-100 flex justify-end gap-3">
                <button 
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-5 py-2.5 rounded-xl font-semibold text-slate-600 hover:bg-slate-100 transition-colors"
                >
                  Cancel
                </button>
                <button 
                  type="submit"
                  className="px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-bold transition-all shadow-md hover:shadow-lg"
                >
                  {editingVendor ? 'Update Vendor' : 'Add Vendor'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
