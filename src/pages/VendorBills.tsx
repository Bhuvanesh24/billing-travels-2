import { useState, useEffect } from 'react';
import { 
  Plus, 
  Search, 
  Trash2, 
  Receipt,
  X,
  Loader2,
  CheckCircle2,
  Clock
} from 'lucide-react';
import toast from 'react-hot-toast';
import { vendorBillService, type VendorBill } from '../services/vendorBillService';
import { masterService, type Vendor } from '../services/masterService';
import { tripService, type Trip } from '../services/tripService';
import { Pagination } from '../components/Pagination';

export default function VendorBills() {
  const [bills, setBills] = useState<VendorBill[]>([]);
  const [vendors, setVendors] = useState<Vendor[]>([]);
  const [trips, setTrips] = useState<Trip[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  
  // Modals
  const [isModalOpen, setIsModalOpen] = useState(false);

  // Form State
  const [formData, setFormData] = useState<Omit<VendorBill, 'id' | 'createdAt'>>({
    vendorId: '',
    vendorName: '',
    tripId: '',
    invoiceNumber: '',
    amount: 0,
    date: new Date().toISOString().slice(0, 10),
    status: 'pending',
    notes: ''
  });

  useEffect(() => {
    fetchData();
  }, []);

  async function fetchData() {
    try {
      setLoading(true);
      const [fetchedBills, fetchedVendors, fetchedTrips] = await Promise.all([
        vendorBillService.getBills(),
        masterService.getVendors(),
        tripService.getAllTrips() // To link a bill to a trip
      ]);
      setBills(fetchedBills);
      setVendors(fetchedVendors);
      // Only keep completed trips that used a vendor
      setTrips(fetchedTrips.filter(t => t.status === 'completed' && t.vendorId));
    } catch (error) {
      console.error(error);
      toast.error('Failed to load data');
    } finally {
      setLoading(false);
    }
  }

  const handleOpenModal = () => {
    setFormData({
      vendorId: '',
      vendorName: '',
      tripId: '',
      invoiceNumber: '',
      amount: 0,
      date: new Date().toISOString().slice(0, 10),
      status: 'pending',
      notes: ''
    });
    setIsModalOpen(true);
  };

  const handleVendorSelect = (vendorId: string) => {
    const vendor = vendors.find(v => v.id === vendorId);
    setFormData(prev => ({ 
      ...prev, 
      vendorId, 
      vendorName: vendor ? vendor.name : '',
      tripId: '' // Reset trip selection when vendor changes
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.vendorId || !formData.tripId) {
      toast.error('Please select both a vendor and a trip');
      return;
    }
    
    try {
      await vendorBillService.addBill(formData as VendorBill);
      toast.success('Vendor bill added successfully');
      setIsModalOpen(false);
      fetchData();
    } catch (error) {
      console.error(error);
      toast.error('Error saving vendor bill');
    }
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm('Are you sure you want to delete this bill?')) return;
    try {
      await vendorBillService.deleteBill(id);
      toast.success('Bill deleted successfully');
      fetchData();
    } catch (error) {
      console.error(error);
      toast.error('Failed to delete bill');
    }
  };

  const togglePaymentStatus = async (billId: string, currentStatus: string) => {
    try {
      const newStatus = currentStatus === 'paid' ? 'pending' : 'paid';
      await vendorBillService.updateBill(billId, { 
        status: newStatus,
        paymentDate: newStatus === 'paid' ? new Date().toISOString() : undefined
      });
      toast.success(`Marked as ${newStatus}`);
      fetchData();
    } catch (error) {
      console.error(error);
      toast.error('Failed to update status');
    }
  };

  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 10;

  const filteredBills = bills.filter(b => 
    b.vendorName.toLowerCase().includes(searchTerm.toLowerCase()) || 
    b.invoiceNumber.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const totalPages = Math.ceil(filteredBills.length / pageSize);
  const paginatedBills = filteredBills.slice(
    (currentPage - 1) * pageSize,
    currentPage * pageSize
  );

  // Filter trips for the selected vendor in the form
  const availableTripsForVendor = trips.filter(t => t.vendorId === formData.vendorId);

  return (
    <div className="bg-white border border-slate-200 rounded-2xl shadow-sm p-6 space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Vendor Bills</h1>
          <p className="text-slate-500 text-sm">Log and track purchase invoices from vendors (Accounts Payable)</p>
        </div>
        <button 
          onClick={handleOpenModal}
          className="bg-slate-900 hover:bg-slate-800 text-white px-5 py-2.5 rounded-xl font-semibold transition-all shadow-md hover:shadow-lg flex items-center gap-2"
        >
          <Plus size={18} />
          Log Vendor Bill
        </button>
      </div>

      {/* Search */}
      <div className="bg-white p-4 rounded-xl border border-slate-200">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
          <input 
            type="text"
            placeholder="Search by vendor name or invoice number..."
            className="w-full pl-10 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-lg outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white transition-all"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
      </div>

      {/* Bills Table */}
      {loading ? (
        <div className="flex flex-col items-center justify-center p-20 bg-white rounded-lg border border-slate-200">
          <Loader2 className="animate-spin text-blue-600 mb-4" size={32} />
          <p className="text-slate-500 font-medium">Loading bills...</p>
        </div>
      ) : filteredBills.length > 0 ? (
        <div className="bg-white border text-sm border-slate-200 rounded-lg shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50 text-slate-500 border-b border-slate-200">
                  <th className="px-4 py-3 font-semibold uppercase text-[10px] tracking-wider">Date & Inv #</th>
                  <th className="px-4 py-3 font-semibold uppercase text-[10px] tracking-wider">Vendor</th>
                  <th className="px-4 py-3 font-semibold uppercase text-[10px] tracking-wider">Trip Link</th>
                  <th className="px-4 py-3 font-semibold uppercase text-[10px] tracking-wider text-right">Amount</th>
                  <th className="px-4 py-3 font-semibold uppercase text-[10px] tracking-wider text-center">Status</th>
                  <th className="px-4 py-3 font-semibold uppercase text-[10px] tracking-wider text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {paginatedBills.map((bill) => {
                  const trip = trips.find(t => t.id === bill.tripId);
                  return (
                    <tr key={bill.id} className="hover:bg-slate-50 transition-colors group">
                      <td className="px-4 py-3">
                        <p className="font-semibold text-slate-800">{new Date(bill.date).toLocaleDateString()}</p>
                        <p className="text-[10px] text-slate-500 font-mono mt-0.5">Inv: {bill.invoiceNumber || 'N/A'}</p>
                      </td>
                      <td className="px-4 py-3">
                        <p className="font-semibold text-slate-800">{bill.vendorName}</p>
                      </td>
                      <td className="px-4 py-3">
                        {trip ? (
                          <>
                            <p className="text-xs font-semibold text-slate-700">{trip.customerName}</p>
                            <p className="text-[10px] text-slate-500">{new Date(trip.startTime).toLocaleDateString()} • {trip.vehicleNo}</p>
                          </>
                        ) : (
                          <span className="text-slate-400 italic text-xs">Trip deleted</span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-right">
                        <p className="font-bold text-slate-900">₹{bill.amount.toFixed(2)}</p>
                      </td>
                      <td className="px-4 py-3 text-center">
                        <button
                          onClick={() => togglePaymentStatus(bill.id!, bill.status)}
                          className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-widest transition-all ${
                            bill.status === 'paid' 
                              ? 'bg-emerald-100 text-emerald-700 hover:bg-emerald-200' 
                              : 'bg-orange-100 text-orange-700 hover:bg-orange-200'
                          }`}
                        >
                          {bill.status === 'paid' ? <CheckCircle2 size={12} /> : <Clock size={12} />}
                          {bill.status}
                        </button>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center justify-end gap-2">
                          <button
                            onClick={() => handleDelete(bill.id!)}
                            className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded transition-colors"
                            title="Delete"
                          >
                            <Trash2 size={16} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          {totalPages > 1 && (
            <Pagination 
              currentPage={currentPage} 
              totalPages={totalPages} 
              onPageChange={setCurrentPage} 
              totalItems={filteredBills.length}
              pageSize={pageSize}
            />
          )}
        </div>
      ) : (
        <div className="flex flex-col items-center justify-center p-20 bg-white border border-slate-200 rounded-lg text-center">
          <div className="w-16 h-16 bg-slate-50 rounded-full flex items-center justify-center mb-4">
            <Receipt className="text-slate-400" size={32} />
          </div>
          <h3 className="text-lg font-bold text-slate-900 mb-1">No vendor bills logged</h3>
          <p className="text-slate-500 text-sm max-w-md">
            {searchTerm ? 'Try adjusting your search terms.' : 'Log purchase invoices you receive from vendors for outsourced trips.'}
          </p>
          {!searchTerm && (
            <button
              onClick={handleOpenModal}
              className="mt-6 bg-slate-900 hover:bg-slate-800 text-white px-5 py-2.5 rounded-xl font-semibold transition-all shadow-md hover:shadow-lg flex items-center gap-2"
            >
              <Plus size={18} />
              Log Vendor Bill
            </button>
          )}
        </div>
      )}

      {/* Add Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm">
          <div className="bg-white w-full max-w-lg rounded-2xl shadow-xl overflow-hidden animate-in fade-in zoom-in duration-200 max-h-[90vh] flex flex-col">
            <div className="px-6 py-4 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
              <h2 className="text-lg font-bold text-slate-800">
                Log Vendor Bill
              </h2>
              <button 
                onClick={() => setIsModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 hover:bg-slate-100 p-1.5 rounded-lg transition-colors"
              >
                <X size={20} />
              </button>
            </div>
            
            <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-6 space-y-4">
              
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1">Select Vendor *</label>
                <select 
                  required 
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none bg-white"
                  value={formData.vendorId}
                  onChange={e => handleVendorSelect(e.target.value)}
                >
                  <option value="">-- Choose Vendor --</option>
                  {vendors.map(v => (
                    <option key={v.id} value={v.id}>{v.name}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1">Link to Trip *</label>
                <select 
                  required 
                  disabled={!formData.vendorId}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none bg-white disabled:bg-slate-100"
                  value={formData.tripId}
                  onChange={e => setFormData({...formData, tripId: e.target.value})}
                >
                  <option value="">-- Choose Completed Trip --</option>
                  {availableTripsForVendor.map(t => (
                    <option key={t.id} value={t.id}>
                      {new Date(t.startTime).toLocaleDateString()} - {t.customerName} ({t.vehicleNo})
                    </option>
                  ))}
                </select>
                {formData.vendorId && availableTripsForVendor.length === 0 && (
                  <p className="text-[10px] text-amber-600 mt-1">No completed trips found for this vendor.</p>
                )}
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1">Bill Date *</label>
                  <input 
                    type="date" required 
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                    value={formData.date}
                    onChange={e => setFormData({...formData, date: e.target.value})}
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1">Vendor Invoice No</label>
                  <input 
                    type="text" 
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                    value={formData.invoiceNumber}
                    onChange={e => setFormData({...formData, invoiceNumber: e.target.value})}
                    placeholder="e.g. INV-001"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1">Bill Amount (₹) *</label>
                <input 
                  type="number" required min="0" step="0.01"
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none font-bold text-lg"
                  value={formData.amount || ''}
                  onChange={e => setFormData({...formData, amount: Number(e.target.value)})}
                  placeholder="0.00"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1">Payment Status</label>
                <select 
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none bg-white"
                  value={formData.status}
                  onChange={e => setFormData({...formData, status: e.target.value as 'pending' | 'paid'})}
                >
                  <option value="pending">Pending</option>
                  <option value="paid">Paid</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1">Notes (Optional)</label>
                <textarea 
                  rows={2}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                  value={formData.notes}
                  onChange={e => setFormData({...formData, notes: e.target.value})}
                  placeholder="Any additional details..."
                />
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
                  Save Vendor Bill
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
