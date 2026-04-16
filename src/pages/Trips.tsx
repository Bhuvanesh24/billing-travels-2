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
  ArrowRight,
  X
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import { tripService, type Trip } from '../services/tripService';
import { masterService, type Driver, type Car, type Customer } from '../services/masterService';

export default function Trips() {
  const navigate = useNavigate();
  const [ongoingTrips, setOngoingTrips] = useState<Trip[]>([]);
  const [loading, setLoading] = useState(true);
  const [isStartModalOpen, setIsStartModalOpen] = useState(false);
  
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
    fetchOngoingTrips();
    fetchMasters();
  }, []);

  async function fetchOngoingTrips() {
    try {
      setLoading(true);
      const data = await tripService.getOngoingTrips();
      setOngoingTrips(data);
    } catch (error) {
      console.error(error);
      toast.error('Failed to load ongoing trips');
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
      fetchOngoingTrips();
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
    <div className="space-y-8">
      {/* Header Row */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-extrabold text-slate-900 tracking-tight">Active Journeys</h1>
          <p className="text-slate-500 font-medium">Monitoring ongoing trips in real-time</p>
        </div>
        <button 
          onClick={() => setIsStartModalOpen(true)}
          className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-2xl font-bold transition-all shadow-xl shadow-blue-100 flex items-center gap-2 group active:scale-95"
        >
          <Plus size={20} className="group-hover:rotate-90 transition-transform duration-300" />
          Dispatch New Trip
        </button>
      </div>

      {/* Analytics Mini-Dashboard */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm flex items-center gap-4">
            <div className="w-12 h-12 bg-blue-50 text-blue-600 rounded-2xl flex items-center justify-center">
                <Activity size={24} />
            </div>
            <div>
                <p className="text-slate-400 text-xs font-bold uppercase tracking-wider transition-colors group-hover:text-blue-600">On Road</p>
                <p className="text-2xl font-black text-slate-900">{ongoingTrips.length}</p>
            </div>
        </div>
        <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm flex items-center gap-4">
            <div className="w-12 h-12 bg-green-50 text-green-600 rounded-2xl flex items-center justify-center">
                <CarIcon size={24} />
            </div>
            <div>
                <p className="text-slate-400 text-xs font-bold uppercase tracking-wider">Available Fleet</p>
                <p className="text-2xl font-black text-slate-900">{cars.length - ongoingTrips.length}</p>
            </div>
        </div>
        <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm flex items-center gap-4">
            <div className="w-12 h-12 bg-amber-50 text-amber-600 rounded-2xl flex items-center justify-center">
                <CalendarDays size={24} />
            </div>
            <div>
                <p className="text-slate-400 text-xs font-bold uppercase tracking-wider">Scheduled Today</p>
                <p className="text-2xl font-black text-slate-900">{ongoingTrips.length}</p>
            </div>
        </div>
      </div>

      {/* Ongoing Trips List */}
      <div className="space-y-4">
        <h2 className="text-lg font-bold text-slate-800 px-1">Live Feed</h2>
        
        {loading ? (
             <div className="flex flex-col items-center justify-center py-20 bg-white rounded-3xl border border-slate-100">
                <Loader2 className="animate-spin text-blue-600 mb-4" size={40} />
                <p className="text-slate-500 font-medium">Syncing live data...</p>
             </div>
        ) : ongoingTrips.length > 0 ? (
            <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
                {ongoingTrips.map((trip) => (
                    <div key={trip.id} className="bg-white rounded-[2rem] border border-slate-100 shadow-sm hover:shadow-xl transition-all duration-500 group overflow-hidden">
                        <div className="p-8">
                            <div className="flex justify-between items-start mb-6">
                                <div className="space-y-1">
                                    <div className="flex items-center gap-2">
                                        <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></span>
                                        <span className="text-[10px] font-black text-green-600 uppercase tracking-widest">Ongoing Journey</span>
                                    </div>
                                    <h3 className="text-xl font-extrabold text-slate-900 leading-tight">
                                        {trip.customerName}
                                    </h3>
                                </div>
                                <div className="bg-slate-900 text-white px-4 py-2 rounded-2xl font-bold text-sm shadow-lg shadow-slate-200">
                                    {trip.vehicleNo}
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-8 mb-8">
                                <div className="space-y-4">
                                    <div className="flex items-start gap-3">
                                        <div className="mt-1 p-1.5 bg-blue-50 text-blue-600 rounded-lg">
                                            <MapPin size={16} />
                                        </div>
                                        <div>
                                            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Dispatch Location</p>
                                            <p className="font-bold text-slate-800 text-sm line-clamp-1">{trip.tripStartLocation}</p>
                                        </div>
                                    </div>
                                    <div className="flex items-start gap-3">
                                        <div className="mt-1 p-1.5 bg-amber-50 text-amber-600 rounded-lg">
                                            <Clock size={16} />
                                        </div>
                                        <div>
                                            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Start Time</p>
                                            <p className="font-bold text-slate-800 text-sm">
                                                {new Date(trip.startTime).toLocaleString([], { hour: '2-digit', minute: '2-digit', day: 'numeric', month: 'short' })}
                                            </p>
                                        </div>
                                    </div>
                                </div>
                                <div className="space-y-4">
                                    <div className="flex items-start gap-3">
                                        <div className="mt-1 p-1.5 bg-emerald-50 text-emerald-600 rounded-lg">
                                            <Hash size={16} />
                                        </div>
                                        <div>
                                            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Opening ODO</p>
                                            <p className="font-extrabold text-emerald-700 text-sm">{trip.startKm} KM</p>
                                        </div>
                                    </div>
                                    <div className="flex items-start gap-3">
                                        <div className="mt-1 p-1.5 bg-indigo-50 text-indigo-600 rounded-lg">
                                            <User size={16} />
                                        </div>
                                        <div>
                                            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Operator</p>
                                            <p className="font-bold text-slate-800 text-sm">{trip.driverName}</p>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            <button 
                                onClick={() => handleEndTrip(trip)}
                                className="w-full flex items-center justify-center gap-3 py-4 bg-slate-900 text-white rounded-2xl font-black text-sm hover:bg-blue-600 transition-all shadow-xl shadow-slate-100 hover:shadow-blue-200 group/btn"
                            >
                                GO TO BILLING
                                <ArrowRight size={18} className="group-hover/btn:translate-x-1 transition-transform" />
                            </button>
                        </div>
                    </div>
                ))}
            </div>
        ) : (
            <div className="bg-white rounded-[2.5rem] border border-slate-100 shadow-sm p-24 text-center">
                <div className="w-24 h-24 bg-slate-50 rounded-[2rem] flex items-center justify-center mx-auto mb-6 text-slate-200 group-hover:scale-110 transition-transform duration-500">
                    <MapPin size={48} />
                </div>
                <h3 className="text-2xl font-black text-slate-900 mb-2">No Passive Journeys</h3>
                <p className="text-slate-500 max-w-sm mx-auto font-medium">Your entire fleet is currently available for dispatch. Start a trip to monitor it here.</p>
            </div>
        )}
      </div>

      {/* Start Trip Modal */}
      {isStartModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-md">
            <div className="bg-white w-full max-w-lg rounded-[2.5rem] shadow-2xl border border-slate-100 overflow-hidden animate-in fade-in zoom-in duration-300">
                <div className="p-8 border-b border-slate-50 flex justify-between items-center bg-slate-50/50">
                    <div className="flex items-center gap-4">
                        <div className="w-12 h-12 bg-blue-600 rounded-2xl flex items-center justify-center text-white shadow-lg shadow-blue-100">
                            <Plus size={24} />
                        </div>
                        <div>
                            <h2 className="text-xl font-black text-slate-900 leading-tight">New Trip Record</h2>
                            <p className="text-xs text-slate-500 font-bold uppercase tracking-widest">Departure Log</p>
                        </div>
                    </div>
                    <button onClick={() => setIsStartModalOpen(false)} className="p-2 hover:bg-white rounded-xl text-slate-400 hover:text-slate-900 transition-all border border-transparent hover:border-slate-100">
                        <X size={24} />
                    </button>
                </div>

                <form onSubmit={handleStartTrip} className="p-8 space-y-6">
                    <div className="space-y-4">
                        <div>
                            <label className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-2 block">1. Select Client</label>
                            <select 
                                required
                                className="w-full px-5 py-4 bg-slate-50 border border-slate-100 rounded-2xl focus:bg-white focus:ring-4 focus:ring-blue-50 outline-none transition-all font-bold text-slate-700"
                                value={formData.customerId}
                                onChange={(e) => setFormData({...formData, customerId: e.target.value})}
                            >
                                <option value="">Select a customer...</option>
                                {customers.map(c => <option key={c.id} value={c.id}>{c.companyName} ({c.name})</option>)}
                            </select>
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-2 block">2. Assign Vehicle</label>
                                <select 
                                    required
                                    className="w-full px-5 py-4 bg-slate-50 border border-slate-100 rounded-2xl focus:bg-white focus:ring-4 focus:ring-blue-50 outline-none transition-all font-bold text-slate-700"
                                    value={formData.carId}
                                    onChange={(e) => setFormData({...formData, carId: e.target.value})}
                                >
                                    <option value="">Select vehicle...</option>
                                    {cars.map(c => <option key={c.id} value={c.id}>{c.regNo} - {c.model}</option>)}
                                </select>
                            </div>
                            <div>
                                <label className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-2 block">3. Professional assigned</label>
                                <select 
                                    required
                                    className="w-full px-5 py-4 bg-slate-50 border border-slate-100 rounded-2xl focus:bg-white focus:ring-4 focus:ring-blue-50 outline-none transition-all font-bold text-slate-700"
                                    value={formData.driverId}
                                    onChange={(e) => setFormData({...formData, driverId: e.target.value})}
                                >
                                    <option value="">Select driver...</option>
                                    {drivers.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
                                </select>
                            </div>
                        </div>

                        <div className="grid grid-cols-2 gap-4 border-t border-slate-50 pt-4">
                            <div>
                                <label className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-2 block">ODOMETER Start</label>
                                <div className="relative">
                                    <Hash className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300" size={18} />
                                    <input 
                                        type="number" required placeholder="0"
                                        className="w-full pl-12 pr-5 py-4 bg-slate-50 border border-slate-100 rounded-2xl focus:bg-white focus:ring-4 focus:ring-blue-50 outline-none transition-all font-black text-slate-900"
                                        value={formData.startKm || ''}
                                        onChange={(e) => setFormData({...formData, startKm: Number(e.target.value)})}
                                    />
                                </div>
                            </div>
                            <div>
                                <label className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-2 block">Departure Date & Time</label>
                                <input 
                                    type="datetime-local" required
                                    className="w-full px-5 py-4 bg-slate-50 border border-slate-100 rounded-2xl focus:bg-white focus:ring-4 focus:ring-blue-50 outline-none transition-all font-bold text-slate-700"
                                    value={formData.startTime}
                                    onChange={(e) => setFormData({...formData, startTime: e.target.value})}
                                />
                            </div>
                        </div>

                        <div>
                            <label className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-2 block">Base/Origin Location</label>
                            <input 
                                type="text" required placeholder="Starting point (e.g. Office, Airport...)"
                                className="w-full px-5 py-4 bg-slate-50 border border-slate-100 rounded-2xl focus:bg-white focus:ring-4 focus:ring-blue-50 outline-none transition-all font-bold"
                                value={formData.tripStartLocation}
                                onChange={(e) => setFormData({...formData, tripStartLocation: e.target.value})}
                            />
                        </div>
                    </div>

                    <button 
                        type="submit"
                        className="w-full py-5 bg-blue-600 hover:bg-blue-700 text-white rounded-2xl font-black text-lg shadow-2xl shadow-blue-200 transition-all transform active:scale-[0.98] mt-4"
                    >
                        START TRIP
                    </button>
                </form>
            </div>
        </div>
      )}
    </div>
  );
}

