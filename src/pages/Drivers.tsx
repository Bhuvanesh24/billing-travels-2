import { useState, useEffect } from 'react';
import { Plus, Search, Edit2, Trash2, User as UserIcon, Loader2, X } from 'lucide-react';
import toast from 'react-hot-toast';
import { masterService, type Driver } from '../services/masterService';
import { db } from '../services/firestore';
import { collection, getDocs } from 'firebase/firestore';
import { Pagination } from '../components/Pagination';

interface DriverMetric {
  driverId: string;
  totalTrips: number;
  totalRevenue: number;
}

export default function Drivers() {
  const [drivers, setDrivers] = useState<Driver[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingDriver, setEditingDriver] = useState<Driver | null>(null);
  const [metrics, setMetrics] = useState<Record<string, DriverMetric>>({});
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 10;

  const [formData, setFormData] = useState<Omit<Driver, 'id' | 'createdAt'>>({
    name: '', phone: '', license: '', address: '', status: 'active'
  });

  useEffect(() => {
    fetchDrivers();
    fetchMetrics();
  }, []);

  async function fetchDrivers() {
    try {
      setLoading(true);
      const data = await masterService.getDrivers();
      setDrivers(data);
    } catch (error) {
      toast.error('Failed to fetch drivers');
    } finally {
      setLoading(false);
    }
  }

  async function fetchMetrics() {
    try {
      const snap = await getDocs(collection(db, 'invoices'));
      const invoices = snap.docs.map(d => d.data() as any);
      const map: Record<string, DriverMetric> = {};
      for (const inv of invoices) {
        const key = inv.driverName || '';
        if (!key) continue;
        if (!map[key]) map[key] = { driverId: key, totalTrips: 0, totalRevenue: 0 };
        map[key].totalTrips += 1;
        map[key].totalRevenue += (inv.totalAmount || inv.grandTotal || 0);
      }
      setMetrics(map);
    } catch (e) {
      console.error(e);
    }
  }

  const handleOpenModal = (driver?: Driver) => {
    if (driver) {
      setEditingDriver(driver);
      setFormData({ name: driver.name, phone: driver.phone, license: driver.license, address: driver.address, status: driver.status });
    } else {
      setEditingDriver(null);
      setFormData({ name: '', phone: '', license: '', address: '', status: 'active' });
    }
    setIsModalOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (editingDriver?.id) {
        await masterService.updateDriver(editingDriver.id, formData);
        toast.success('Driver updated');
      } else {
        await masterService.addDriver(formData as Driver);
        toast.success('Driver added');
      }
      setIsModalOpen(false);
      fetchDrivers();
    } catch (error) {
      toast.error('Error saving driver');
    }
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm('Delete this driver?')) return;
    try {
      await masterService.deleteDriver(id);
      toast.success('Driver deleted');
      fetchDrivers();
    } catch (error) {
      toast.error('Error deleting driver');
    }
  };

  const filteredDrivers = drivers.filter(d =>
    d.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    d.phone.includes(searchTerm) ||
    d.license.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const totalPages = Math.ceil(filteredDrivers.length / pageSize);
  const paginatedDrivers = filteredDrivers.slice(
    (currentPage - 1) * pageSize,
    currentPage * pageSize
  );

  // Reset to first page when searching
  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm]);

  return (
    <div className="bg-white border border-slate-200 rounded-2xl shadow-sm p-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-black text-slate-900 tracking-tight">Drivers</h1>
          <p className="text-slate-500 text-sm font-medium">Manage your operators and view performance metrics</p>
        </div>
        <button
          onClick={() => handleOpenModal()}
          className="bg-slate-900 hover:bg-slate-800 text-white px-5 py-2.5 rounded-xl font-semibold transition-all shadow-md flex items-center gap-2"
        >
          <Plus size={18} />
          Add Driver
        </button>
      </div>

      {/* Search & Stats */}
      <div className="flex flex-col md:flex-row gap-4 items-center bg-white p-4 rounded-xl border border-slate-200">
        <div className="relative flex-1 w-full">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
          <input
            type="text"
            placeholder="Search by name, phone or license..."
            className="w-full pl-10 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-lg outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white transition-all"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
        <div className="flex items-center gap-3 text-sm font-medium text-slate-600 px-2">
          <span className="font-bold text-slate-800">Total: {drivers.length}</span>
          <span className="w-1 h-1 bg-slate-300 rounded-full"></span>
          <span className="text-green-600 font-bold">Active: {drivers.filter(d => d.status === 'active').length}</span>
        </div>
      </div>

      {/* Drivers Table */}
      {loading ? (
        <div className="bg-white rounded-lg border border-slate-200 p-20 flex flex-col items-center justify-center">
          <Loader2 className="animate-spin text-blue-600 mb-4" size={40} />
          <p className="text-slate-500 font-medium">Fetching drivers...</p>
        </div>
      ) : filteredDrivers.length > 0 ? (
        <div className="bg-white border text-sm border-slate-200 rounded-lg shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50 text-slate-500 border-b border-slate-200">
                  <th className="px-4 py-3 font-semibold uppercase text-[10px] tracking-wider">Driver Details</th>
                  <th className="px-4 py-3 font-semibold uppercase text-[10px] tracking-wider">Contact & License</th>
                  <th className="px-4 py-3 font-semibold uppercase text-[10px] tracking-wider text-center">Performance Stats</th>
                  <th className="px-4 py-3 font-semibold uppercase text-[10px] tracking-wider">Status</th>
                  <th className="px-4 py-3 font-semibold uppercase text-[10px] tracking-wider text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {paginatedDrivers.map((driver) => {
                  const m = metrics[driver.name];
                  return (
                    <tr key={driver.id} className="hover:bg-slate-50 transition-colors group">
                      <td className="px-4 py-3">
                        <p className="font-semibold text-slate-800">{driver.name}</p>
                        <p className="text-[10px] text-slate-400 mt-0.5">Joined: {driver.createdAt ? new Date(driver.createdAt).toLocaleDateString() : 'N/A'}</p>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex flex-col gap-0.5">
                          <span className="text-slate-700">{driver.phone}</span>
                          <span className="text-xs text-slate-500 font-mono">{driver.license}</span>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-center">
                        <div className="flex items-center justify-center gap-4">
                          <div className="text-center">
                            <p className="text-[9px] text-slate-400 font-semibold uppercase">Trips</p>
                            <p className="font-bold text-slate-800">{m?.totalTrips || 0}</p>
                          </div>
                          <div className="w-px h-6 bg-slate-200"></div>
                          <div className="text-center">
                            <p className="text-[9px] text-slate-400 font-semibold uppercase">Revenue</p>
                            <p className="font-bold text-emerald-600">₹{(m?.totalRevenue || 0).toLocaleString()}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <span className={`px-2.5 py-1 rounded-sm text-[10px] font-bold uppercase tracking-wider ${driver.status === 'active' ? 'bg-emerald-50 text-emerald-700 border border-emerald-100' : 'bg-slate-100 text-slate-500 border border-slate-200'}`}>
                          {driver.status}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-right">
                        <div className="flex items-center justify-end gap-2 transition-opacity">
                          <button onClick={() => handleOpenModal(driver)} className="p-1.5 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded transition-colors" title="Edit">
                            <Edit2 size={14} />
                          </button>
                          <button onClick={() => handleDelete(driver.id!)} className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded transition-colors" title="Delete">
                            <Trash2 size={14} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          <Pagination 
            currentPage={currentPage}
            totalPages={totalPages}
            onPageChange={setCurrentPage}
            totalItems={filteredDrivers.length}
            pageSize={pageSize}
          />
        </div>
      ) : (
        <div className="bg-white rounded-xl border border-slate-200 p-16 text-center shadow-sm">
          <UserIcon size={40} className="mx-auto mb-4 text-slate-200" />
          <h3 className="text-lg font-bold text-slate-900 mb-1">No drivers found</h3>
          <p className="text-slate-500 text-sm mb-5">Add your first driver to start tracking performance.</p>
          <button onClick={() => handleOpenModal()} className="text-blue-600 font-semibold hover:underline inline-flex items-center gap-1">
            <Plus size={16} /> Add Driver
          </button>
        </div>
      )}

      {/* Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm">
          <div className="bg-white w-full max-w-md rounded-lg shadow-xl overflow-hidden border border-slate-200">
            <div className="px-6 py-4 border-b border-slate-200 flex justify-between items-center bg-slate-50/50">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 bg-blue-600 rounded flex items-center justify-center text-white">
                  <UserIcon size={18} />
                </div>
                <div>
                  <h2 className="text-sm font-bold text-slate-800 leading-tight">{editingDriver ? 'Edit Operator' : 'Add New Driver'}</h2>
                  <p className="text-[10px] text-slate-500 font-semibold uppercase tracking-wider">Staff Registry</p>
                </div>
              </div>
              <button onClick={() => setIsModalOpen(false)} className="p-1.5 hover:bg-slate-100 rounded text-slate-400 border border-transparent hover:border-slate-200 transition-colors">
                <X size={18} />
              </button>
            </div>
            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              <div>
                <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1.5">Driver Full Name</label>
                <input type="text" required placeholder="e.g. Rahul Sharma"
                  className="w-full px-3 py-2 bg-white border border-slate-300 rounded-md outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500 text-sm font-semibold shadow-sm"
                  value={formData.name} onChange={(e) => setFormData({ ...formData, name: e.target.value })} />
              </div>
               <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1.5">Phone</label>
                  <input type="tel" required placeholder="+91 98..."
                    className="w-full px-3 py-2 bg-white border border-slate-300 rounded-md outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500 text-sm font-semibold shadow-sm"
                    value={formData.phone} onChange={(e) => setFormData({ ...formData, phone: e.target.value })} />
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1.5">License No.</label>
                  <input type="text" required placeholder="DL-XXXXXXXX"
                    className="w-full px-3 py-2 bg-white border border-slate-300 rounded-md outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500 text-sm font-bold shadow-sm"
                    value={formData.license} onChange={(e) => setFormData({ ...formData, license: e.target.value })} />
                </div>
              </div>
              <div>
                <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1.5">Full Address</label>
                <textarea rows={2} placeholder="Street, City, Pin..."
                  className="w-full px-3 py-2 bg-white border border-slate-300 rounded-md outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500 text-sm font-medium resize-none shadow-sm"
                  value={formData.address} onChange={(e) => setFormData({ ...formData, address: e.target.value })} />
              </div>
              <div>
                <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1.5">Employment Status</label>
                <div className="flex gap-2">
                  {(['active', 'inactive'] as const).map((s) => (
                    <button key={s} type="button" onClick={() => setFormData({ ...formData, status: s })}
                      className={`flex-1 py-1.5 rounded text-[10px] font-bold uppercase border transition-all ${formData.status === s ? 'bg-slate-900 border-slate-900 text-white' : 'bg-white border-slate-200 text-slate-500 hover:border-slate-300'}`}>
                      {s}
                    </button>
                  ))}
                </div>
              </div>
               <div className="pt-2">
                <button type="submit" className="w-full py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded font-bold transition-all shadow-sm">
                  {editingDriver ? 'Save Operator Changes' : 'Register Operator'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
