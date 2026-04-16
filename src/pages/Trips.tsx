import { useState, useEffect } from 'react';
import { 
  Plus, 
  MapPin, 
  Clock, 
  Car as CarIcon, 
  Loader2,
  Hash,
  Activity,
  CalendarDays,
  User,
  X,
  History,
  FileText,
  CheckCircle2
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import { tripService, type Trip } from '../services/tripService';
import { masterService, type Driver, type Car, type Customer } from '../services/masterService';
import { Pagination } from '../components/Pagination';

export default function Trips() {
  const navigate = useNavigate();
  const [ongoingTrips, setOngoingTrips] = useState<Trip[]>([]);
  const [completedTrips, setCompletedTrips] = useState<Trip[]>([]);
  const [loading, setLoading] = useState(true);
  const [isStartModalOpen, setIsStartModalOpen] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 10;

  const totalPages = Math.ceil(ongoingTrips.length / pageSize);
  const paginatedTrips = ongoingTrips.slice(
    (currentPage - 1) * pageSize,
    currentPage * pageSize
  );
  
  // Masters for selection
  const [drivers, setDrivers] = useState<Driver[]>([]);
  const [cars, setCars] = useState<Car[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);

  // Form State
  const [formData, setFormData] = useState({
    customerId: '',
    driverId: '',
    carId: '',
    startKm: 0,
    startTime: new Date().toISOString().slice(0, 16), // datetime-local format
    tripStartLocation: ''
  });

  useEffect(() => {
    fetchTrips();
    fetchMasters();
  }, []);

  async function fetchTrips() {
    try {
      setLoading(true);
      const [ongoing, history] = await Promise.all([
        tripService.getOngoingTrips(),
        tripService.getTripHistory(10)
      ]);
      setOngoingTrips(ongoing);
      setCompletedTrips(history.filter(t => t.status === 'completed'));
    } catch (error) {
      console.error(error);
      toast.error('Failed to load trips');
    } finally {
      setLoading(false);
    }
  }

  async function fetchMasters() {
    try {
      const [d, c, cust] = await Promise.all([
        masterService.getDrivers(),
        masterService.getCars(),
        masterService.getCustomers()
      ]);
      setDrivers(d.filter(dri => dri.status === 'active'));
      setCars(c);
      setCustomers(cust);
    } catch (error) {
      console.error('Error fetching masters:', error);
    }
  }

  const handleStartTrip = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.customerId || !formData.driverId || !formData.carId) {
      toast.error('Please select Customer, Driver, and Car');
      return;
    }

    try {
      const customer = customers.find(c => c.id === formData.customerId);
      const driver = drivers.find(d => d.id === formData.driverId);
      const car = cars.find(c => c.id === formData.carId);

      await tripService.startTrip({
        ...formData,
        customerName: customer?.name || '',
        driverName: driver?.name || '',
        vehicleNo: car?.regNo || ''
      });

      toast.success('Trip started successfully');
      setIsStartModalOpen(false);
      fetchTrips();
    } catch (error) {
      console.error(error);
      toast.error('Failed to start trip');
    }
  };

  const handleEndTrip = (trip: Trip) => {
    // Navigate to Create Invoice page with trip details pre-filled
    navigate(`/create?tripId=${trip.id}`);
  };

  return (
    <div className="bg-white border border-slate-200 rounded-lg shadow-sm p-6 space-y-6">
      {/* Header Row */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Active Journeys</h1>
          <p className="text-slate-500 text-sm">Monitoring ongoing trips in real-time</p>
        </div>
        <button 
          onClick={() => setIsStartModalOpen(true)}
          className="bg-blue-600 hover:bg-blue-700 text-white px-5 py-2.5 rounded-lg font-semibold transition-all shadow-sm flex items-center gap-2 group"
        >
          <Plus size={18} className="group-hover:rotate-90 transition-transform duration-300" />
          Dispatch New Trip
        </button>
      </div>

      {/* Analytics Mini-Dashboard */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white p-5 rounded-lg border border-slate-200 shadow-sm flex items-center gap-4">
            <div className="w-10 h-10 bg-blue-50 text-blue-600 rounded flex items-center justify-center">
                <Activity size={20} />
            </div>
            <div>
                <p className="text-slate-500 text-xs font-semibold uppercase tracking-wider">On Road</p>
                <p className="text-xl font-bold text-slate-900">{ongoingTrips.length}</p>
            </div>
        </div>
        <div className="bg-white p-5 rounded-lg border border-slate-200 shadow-sm flex items-center gap-4">
            <div className="w-10 h-10 bg-emerald-50 text-emerald-600 rounded flex items-center justify-center">
                <CheckCircle2 size={20} className="text-emerald-500" />
            </div>
            <div>
                <p className="text-slate-500 text-xs font-semibold uppercase tracking-wider">Completed</p>
                <p className="text-xl font-bold text-slate-900">{completedTrips.length}</p>
            </div>
        </div>
        <div className="bg-white p-5 rounded-lg border border-slate-200 shadow-sm flex items-center gap-4">
            <div className="w-10 h-10 bg-orange-50 text-orange-600 rounded flex items-center justify-center">
                <History size={20} strokeWidth={2.5} />
            </div>
            <div>
                <p className="text-slate-500 text-xs font-semibold uppercase tracking-wider">Recent</p>
                <p className="text-xl font-bold text-slate-900">{completedTrips.slice(0, 5).length}</p>
            </div>
        </div>
      </div>

      {/* Main Content Layout */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        {/* Active Trips Column */}
        <div className="xl:col-span-2 space-y-6">
          <div className="flex items-center gap-2 mb-2">
            <Activity size={18} className="text-blue-600" />
            <h2 className="text-lg font-bold text-slate-800">Active Journeys</h2>
          </div>

          {loading ? (
             <div className="flex flex-col items-center justify-center py-20 bg-white rounded-lg border border-slate-200">
                <Loader2 className="animate-spin text-blue-600 mb-4" size={40} />
                <p className="text-slate-500 font-medium">Syncing live data...</p>
             </div>
          ) : ongoingTrips.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {paginatedTrips.map((trip: Trip) => (
                <div key={trip.id} className="bg-white border border-slate-200 rounded-2xl p-5 hover:border-blue-300 transition-all shadow-sm group">
                  <div className="flex justify-between items-start mb-4">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-blue-50 rounded-lg flex items-center justify-center text-blue-600 group-hover:bg-blue-600 group-hover:text-white transition-colors">
                        <CarIcon size={20} />
                      </div>
                      <div>
                        <h3 className="font-bold text-slate-900 leading-tight">{trip.customerName}</h3>
                        <p className="text-xs text-slate-500 font-medium">{trip.vehicleNo}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-1.5 px-2 py-1 bg-blue-50 text-blue-600 rounded text-[10px] font-bold uppercase tracking-wider">
                      <Clock size={10} /> {trip.startTime ? new Date(trip.startTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : ''}
                    </div>
                  </div>

                  <div className="space-y-3 mb-5">
                    <div className="flex items-center gap-2 text-slate-600">
                      <User size={14} className="text-slate-400" />
                      <span className="text-xs font-semibold">{trip.driverName}</span>
                    </div>
                    <div className="flex items-center gap-2 text-slate-600">
                      <MapPin size={14} className="text-slate-400" />
                      <span className="text-xs font-semibold truncate">{trip.tripStartLocation}</span>
                    </div>
                  </div>

                  <button 
                    onClick={() => handleEndTrip(trip)}
                    className="w-full py-2.5 bg-slate-900 text-white rounded font-bold text-xs hover:bg-black transition-all flex items-center justify-center gap-2"
                  >
                    Finish Journey & Bill
                  </button>
                </div>
              ))}
            </div>
          ) : (
            <div className="bg-slate-50 border-2 border-dashed border-slate-200 rounded-2xl p-12 text-center">
               <CarIcon size={40} className="mx-auto text-slate-300 mb-3" />
               <p className="text-slate-500 font-bold">No active journeys</p>
               <p className="text-xs text-slate-400 mt-1">Start a new trip to see it here</p>
            </div>
          )}

          {totalPages > 1 && (
            <Pagination 
              currentPage={currentPage}
              totalPages={totalPages}
              onPageChange={(p) => setCurrentPage(p)}
              totalItems={ongoingTrips.length}
              pageSize={pageSize}
            />
          )}
        </div>

        {/* History / Recent Activity Column */}
        <div className="space-y-6">
          <div className="flex items-center gap-2 mb-2">
            <History size={18} className="text-slate-400" />
            <h2 className="text-lg font-bold text-slate-800">Recent History</h2>
          </div>

          <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-sm">
            <div className="divide-y divide-slate-100">
              {completedTrips.length > 0 ? completedTrips.slice(0, 10).map((trip: Trip) => (
                <div key={trip.id} className="p-4 hover:bg-slate-50 transition-colors">
                  <div className="flex justify-between items-start mb-2">
                    <div>
                      <h4 className="font-bold text-slate-800 text-sm leading-tight">{trip.customerName}</h4>
                      <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider mt-0.5">{trip.vehicleNo}</p>
                    </div>
                    {trip.invoiceId ? (
                      <span className="px-2 py-0.5 bg-emerald-50 text-emerald-600 text-[9px] font-black rounded uppercase border border-emerald-100 italic">Billed</span>
                    ) : (
                      <span className="px-2 py-0.5 bg-orange-50 text-orange-600 text-[9px] font-black rounded uppercase border border-orange-100">Pending</span>
                    )}
                  </div>
                  
                  <div className="flex items-center gap-3 text-slate-500 text-[10px] font-bold mb-3">
                    <span className="flex items-center gap-1"><CalendarDays size={10} /> {new Date(trip.completedAt || '').toLocaleDateString()}</span>
                    <span className="flex items-center gap-1"><Hash size={10} /> {trip.endKm ? `${trip.endKm - (trip.startKm || 0)} KM` : ''}</span>
                  </div>

                  {!trip.invoiceId && (
                    <button 
                      onClick={() => handleEndTrip(trip)}
                      className="w-full py-2 bg-blue-50 text-blue-600 hover:bg-blue-600 hover:text-white rounded font-black text-[10px] uppercase tracking-widest transition-all flex items-center justify-center gap-1.5"
                    >
                      <FileText size={12} /> Generate Invoice
                    </button>
                  )}
                </div>
              )) : (
                <div className="p-10 text-center">
                  <p className="text-xs text-slate-400 font-bold uppercase tracking-widest">No history yet</p>
                </div>
              )}
            </div>
            {completedTrips.length > 10 && (
              <div className="p-3 bg-slate-50 text-center border-t border-slate-100">
                <p className="text-[10px] text-slate-400 font-bold italic">Showing last 10 trips</p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Start Trip Modal */}
      {isStartModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-md">
            <div className="bg-white w-full max-w-lg rounded-2xl shadow-2xl border border-slate-200 overflow-hidden animate-in fade-in zoom-in duration-300">
                <div className="px-6 py-4 border-b border-slate-200 flex justify-between items-center bg-slate-50/50">
                    <div className="flex items-center gap-3">
                        <div className="w-8 h-8 bg-blue-600 rounded flex items-center justify-center text-white">
                            <Activity size={18} />
                        </div>
                        <div>
                            <h2 className="text-sm font-bold text-slate-800 leading-tight">New Trip Dispatch</h2>
                            <p className="text-[10px] text-slate-500 font-semibold uppercase tracking-wider">Operational Log</p>
                        </div>
                    </div>
                    <button onClick={() => setIsStartModalOpen(false)} className="p-1.5 hover:bg-slate-100 rounded text-slate-400 transition-colors border border-transparent hover:border-slate-200">
                        <X size={18} />
                    </button>
                </div>

                <form onSubmit={handleStartTrip} className="p-6 space-y-4">
                    <div className="space-y-4">
                        <div>
                            <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1.5 block">1. Select Client</label>
                            <select 
                                required
                                className="w-full px-3 py-2 bg-white border border-slate-300 rounded-md focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none transition-all text-sm font-semibold text-slate-700 shadow-sm"
                                value={formData.customerId}
                                onChange={(e) => setFormData({...formData, customerId: e.target.value})}
                            >
                                <option value="">Select a customer...</option>
                                {customers.map((c: Customer) => <option key={c.id} value={c.id}>{c.companyName} ({c.name})</option>)}
                            </select>
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1.5 block">2. Assign Vehicle</label>
                                <select 
                                    required
                                    className="w-full px-3 py-2 bg-white border border-slate-300 rounded-md focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none transition-all text-sm font-semibold text-slate-700 shadow-sm"
                                    value={formData.carId}
                                    onChange={(e) => setFormData({...formData, carId: e.target.value})}
                                >
                                    <option value="">Select vehicle...</option>
                                    {cars.map((c: Car) => <option key={c.id} value={c.id}>{c.regNo} - {c.model}</option>)}
                                </select>
                            </div>
                            <div>
                                <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1.5 block">3. Assigned Driver</label>
                                <select 
                                    required
                                    className="w-full px-3 py-2 bg-white border border-slate-300 rounded-md focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none transition-all text-sm font-semibold text-slate-700 shadow-sm"
                                    value={formData.driverId}
                                    onChange={(e) => setFormData({...formData, driverId: e.target.value})}
                                >
                                    <option value="">Select driver...</option>
                                    {drivers.map((d: Driver) => <option key={d.id} value={d.id}>{d.name}</option>)}
                                </select>
                            </div>
                        </div>

                        <div className="grid grid-cols-2 gap-4 border-t border-slate-100 pt-4">
                            <div>
                                <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1.5 block">ODOMETER Start</label>
                                <div className="relative">
                                    <Hash className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={14} />
                                    <input 
                                        type="number" required placeholder="0"
                                        className="w-full pl-9 pr-3 py-2 bg-white border border-slate-300 rounded-md focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none transition-all text-sm font-bold text-slate-900 shadow-sm"
                                        value={formData.startKm || ''}
                                        onChange={(e) => setFormData({...formData, startKm: Number(e.target.value)})}
                                    />
                                </div>
                            </div>
                            <div>
                                <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1.5 block">Departure Time</label>
                                <input 
                                    type="datetime-local" required
                                    className="w-full px-3 py-2 bg-white border border-slate-300 rounded-md focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none transition-all text-sm font-semibold text-slate-700 shadow-sm"
                                    value={formData.startTime}
                                    onChange={(e) => setFormData({...formData, startTime: e.target.value})}
                                />
                            </div>
                        </div>

                        <div>
                            <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1.5 block">Departure Point</label>
                            <input 
                                type="text" required placeholder="e.g. Office, Airport, Guest House..."
                                className="w-full px-3 py-2 bg-white border border-slate-300 rounded-md focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none transition-all text-sm font-semibold text-slate-700 shadow-sm"
                                value={formData.tripStartLocation}
                                onChange={(e) => setFormData({...formData, tripStartLocation: e.target.value})}
                            />
                        </div>
                    </div>

                    <div className="p-6 bg-slate-50 border-t border-slate-200">
                        <button 
                            type="submit"
                            className="w-full py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded font-bold transition-all shadow-sm flex items-center justify-center gap-2"
                        >
                            <Activity size={18} />
                            Deploy Journey
                        </button>
                    </div>
                </form>
            </div>
        </div>
      )}
    </div>
  );
}

