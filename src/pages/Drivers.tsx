import { useState, useEffect } from 'react';
import { Plus, Search, Edit2, Trash2, Phone, User as UserIcon, Calendar, Loader2, X, TrendingUp, FileText, IndianRupee } from 'lucide-react';
import toast from 'react-hot-toast';
import { masterService, type Driver } from '../services/masterService';
import { db } from '../services/firestore';
import { collection, getDocs } from 'firebase/firestore';

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

  return (
    <div className="space-y-6">
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

      {/* Drivers Grid */}
      {loading ? (
        <div className="bg-white rounded-xl border border-slate-200 p-20 flex flex-col items-center justify-center">
          <Loader2 className="animate-spin text-blue-600 mb-4" size={40} />
          <p className="text-slate-500 font-medium">Fetching drivers...</p>
        </div>
      ) : filteredDrivers.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredDrivers.map((driver) => {
            const m = metrics[driver.name];
            return (
              <div key={driver.id} className="bg-white rounded-2xl border border-slate-200 shadow-sm hover:shadow-md transition-all group overflow-hidden">
                <div className="p-5">
                  <div className="flex justify-between items-start mb-4">
                    <div className="w-12 h-12 bg-slate-100 rounded-xl flex items-center justify-center text-slate-600 group-hover:bg-blue-50 group-hover:text-blue-600 transition-colors">
                      <UserIcon size={24} />
                    </div>
                    <div className="flex gap-1">
                      <button
                        onClick={() => handleOpenModal(driver)}
                        className="p-2 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-all"
                      >
                        <Edit2 size={15} />
                      </button>
                      <button
                        onClick={() => handleDelete(driver.id!)}
                        className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-all"
                      >
                        <Trash2 size={15} />
                      </button>
                    </div>
                  </div>

                  <div className="space-y-1 mb-4">
                    <h3 className="font-bold text-slate-900 text-lg leading-tight">{driver.name}</h3>
                    <div className="flex items-center gap-2 text-sm text-slate-500">
                      <Phone size={13} className="text-slate-400" />
                      <span>{driver.phone}</span>
                    </div>
                    <div className="flex items-center gap-2 text-xs text-slate-500">
                      <FileText size={13} className="text-slate-400" />
                      <span className="font-mono">{driver.license}</span>
                    </div>
                  </div>

                  {/* Metrics bar */}
                  <div className="bg-slate-50 rounded-xl p-4 grid grid-cols-2 gap-4 border border-slate-100">
                    <div>
                      <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-0.5">Total Trips</p>
                      <div className="flex items-center gap-1">
                        <TrendingUp size={12} className="text-blue-500" />
                        <p className="text-base font-black text-slate-900">{m?.totalTrips || 0}</p>
                      </div>
                    </div>
                    <div>
                      <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-0.5">Revenue</p>
                      <div className="flex items-center gap-1">
                        <IndianRupee size={12} className="text-emerald-500" />
                        <p className="text-base font-black text-emerald-700">{(m?.totalRevenue || 0).toLocaleString()}</p>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center justify-between mt-4 pt-3 border-t border-slate-50">
                    <span className={`px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-wider ${driver.status === 'active' ? 'bg-green-100 text-green-700' : 'bg-slate-100 text-slate-500'}`}>
                      {driver.status}
                    </span>
                    <div className="flex items-center gap-1 text-[10px] text-slate-400">
                      <Calendar size={10} />
                      <span>{driver.createdAt ? new Date(driver.createdAt).toLocaleDateString() : 'N/A'}</span>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <div className="bg-white rounded-xl border border-slate-200 p-16 text-center">
          <UserIcon size={48} className="mx-auto mb-4 text-slate-200" />
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
          <div className="bg-white w-full max-w-md rounded-2xl shadow-2xl overflow-hidden">
            <div className="px-6 py-4 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
              <h2 className="font-bold text-slate-900">{editingDriver ? 'Edit Driver' : 'Add New Driver'}</h2>
              <button onClick={() => setIsModalOpen(false)} className="p-1.5 hover:bg-slate-200 rounded-lg text-slate-500 transition-colors">
                <X size={18} />
              </button>
            </div>
            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Driver Full Name</label>
                <input type="text" required placeholder="e.g. Rahul Sharma"
                  className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white"
                  value={formData.name} onChange={(e) => setFormData({ ...formData, name: e.target.value })} />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Phone</label>
                  <input type="tel" required placeholder="+91 98..."
                    className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-blue-500"
                    value={formData.phone} onChange={(e) => setFormData({ ...formData, phone: e.target.value })} />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">License No.</label>
                  <input type="text" required placeholder="DL-XXXXXXXX"
                    className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-blue-500"
                    value={formData.license} onChange={(e) => setFormData({ ...formData, license: e.target.value })} />
                </div>
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Address</label>
                <textarea rows={2} placeholder="Street, City, Pin..."
                  className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-blue-500 resize-none"
                  value={formData.address} onChange={(e) => setFormData({ ...formData, address: e.target.value })} />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Status</label>
                <div className="flex gap-2">
                  {(['active', 'inactive'] as const).map((s) => (
                    <button key={s} type="button" onClick={() => setFormData({ ...formData, status: s })}
                      className={`flex-1 py-2 rounded-xl text-sm font-bold capitalize border transition-all ${formData.status === s ? 'bg-slate-900 border-slate-900 text-white' : 'bg-white border-slate-200 text-slate-500 hover:border-slate-400'}`}>
                      {s}
                    </button>
                  ))}
                </div>
              </div>
              <button type="submit" className="w-full py-3.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-bold shadow-lg transition-all mt-2">
                {editingDriver ? 'Save Changes' : 'Create Driver'}
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
