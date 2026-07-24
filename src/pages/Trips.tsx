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
  CheckCircle2,
  Edit,
  Trash2,
  IndianRupee,
  Filter,
  Search,
  Eye
} from 'lucide-react';
import { type AdditionalCost } from '../lib/calculator';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import { tripService, type Trip } from '../services/tripService';
import { masterService, type Driver, type Car, type Customer } from '../services/masterService';
import { Pagination } from '../components/Pagination';

export default function Trips() {
  const navigate = useNavigate();
  const [allTrips, setAllTrips] = useState<Trip[]>([]);
  const [loading, setLoading] = useState(true);
  const [isStartModalOpen, setIsStartModalOpen] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 10;

  // Filter State
  const defaultFilters = {
    dateFilterType: 'this_month' as 'all' | 'this_month' | 'month' | 'custom',
    filterMonth: new Date().toISOString().slice(0, 7),
    startDate: '',
    endDate: '',
    filterCompany: '',
    filterStatus: 'all' as 'all' | 'ongoing' | 'completed_unbilled' | 'billed'
  };
  const [draftFilters, setDraftFilters] = useState(defaultFilters);
  const [appliedFilters, setAppliedFilters] = useState(defaultFilters);
  const [searchTerm, setSearchTerm] = useState('');

  // Filtering Logic
  const filteredTrips = allTrips.filter(trip => {
    // 1. Status Filter
    if (appliedFilters.filterStatus === 'ongoing' && trip.status !== 'ongoing') return false;
    if (appliedFilters.filterStatus === 'completed_unbilled' && (trip.status !== 'completed' || trip.invoiceId)) return false;
    if (appliedFilters.filterStatus === 'billed' && !trip.invoiceId) return false;

    if (appliedFilters.filterCompany && trip.customerId !== appliedFilters.filterCompany) return false;

    const tripDateStr = trip.startTime || trip.createdAt || '';
    let matchesDate = true;
    if (tripDateStr) {
      if (appliedFilters.dateFilterType === 'this_month') {
        const now = new Date();
        const tripDate = new Date(tripDateStr);
        if (tripDate.getMonth() !== now.getMonth() || tripDate.getFullYear() !== now.getFullYear()) matchesDate = false;
      } else if (appliedFilters.dateFilterType === 'month') {
        if (!tripDateStr.startsWith(appliedFilters.filterMonth)) matchesDate = false;
      } else if (appliedFilters.dateFilterType === 'custom') {
        const tTime = new Date(tripDateStr).getTime();
        if (appliedFilters.startDate && tTime < new Date(appliedFilters.startDate).getTime()) matchesDate = false;
        if (appliedFilters.endDate) {
          const end = new Date(appliedFilters.endDate);
          end.setHours(23, 59, 59, 999);
          if (tTime > end.getTime()) matchesDate = false;
        }
      }
    }
    if (!matchesDate) return false;

    if (searchTerm) {
      const searchLower = searchTerm.toLowerCase();
      const matchesSearch =
        (trip.customerName || '').toLowerCase().includes(searchLower) ||
        (trip.driverName || '').toLowerCase().includes(searchLower) ||
        (trip.vehicleNo || '').toLowerCase().includes(searchLower);
      if (!matchesSearch) return false;
    }

    return true;
  });

  const ongoingTrips = filteredTrips.filter(t => t.status === 'ongoing' || (t.status === 'completed' && !t.invoiceId));
  const completedTrips = filteredTrips.filter(t => t.status === 'completed' && !!t.invoiceId);

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
    tripStartLocation: '',
    advanceAmount: 0
  });

  // Outside (unregistered) driver / vehicle toggles
  const [useOutsideDriver, setUseOutsideDriver] = useState(false);
  const [outsideDriverName, setOutsideDriverName] = useState('');
  const [useOutsideVehicle, setUseOutsideVehicle] = useState(false);
  const [outsideVehicleName, setOutsideVehicleName] = useState('');

  // Complete & Edit Modal State
  const [activeTrip, setActiveTrip] = useState<Trip | null>(null);

  const [isCompleteModalOpen, setIsCompleteModalOpen] = useState(false);
  const [completeData, setCompleteData] = useState({
    endTime: new Date().toISOString().slice(0, 16),
    endKm: 0,
    tripEndLocation: '',
    additionalCosts: [] as AdditionalCost[]
  });
  const [newCostLabel, setNewCostLabel] = useState('');
  const [newCostAmount, setNewCostAmount] = useState('');

  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editData, setEditData] = useState<Partial<Trip>>({});

  const [isViewModalOpen, setIsViewModalOpen] = useState(false);

  useEffect(() => {
    fetchTrips();
    fetchMasters();
  }, []);

  async function fetchTrips() {
    try {
      setLoading(true);
      const trips = await tripService.getAllTrips();
      setAllTrips(trips);
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

    // Validate customer always required
    if (!formData.customerId) {
      toast.error('Please select a Customer');
      return;
    }
    // Validate driver
    if (!useOutsideDriver && !formData.driverId) {
      toast.error('Please select a Driver or enable Outside Driver');
      return;
    }
    if (useOutsideDriver && !outsideDriverName.trim()) {
      toast.error('Please enter the outside driver name');
      return;
    }
    // Validate vehicle
    if (!useOutsideVehicle && !formData.carId) {
      toast.error('Please select a Vehicle or enable Outside Vehicle');
      return;
    }
    if (useOutsideVehicle && !outsideVehicleName.trim()) {
      toast.error('Please enter the outside vehicle details');
      return;
    }

    try {
      const customer = customers.find(c => c.id === formData.customerId);
      const driver = useOutsideDriver ? null : drivers.find(d => d.id === formData.driverId);
      const car = useOutsideVehicle ? null : cars.find(c => c.id === formData.carId);

      await tripService.startTrip({
        ...formData,
        driverId: useOutsideDriver ? '' : formData.driverId,
        carId: useOutsideVehicle ? '' : formData.carId,
        customerName: customer?.companyName || '',
        driverName: useOutsideDriver ? outsideDriverName.trim() : (driver?.name || ''),
        vehicleNo: useOutsideVehicle ? outsideVehicleName.trim() : (car?.regNo || '')
      });

      toast.success('Trip dispatched successfully');
      setIsStartModalOpen(false);
      // Reset form
      setFormData({ customerId: '', driverId: '', carId: '', startKm: 0, startTime: new Date().toISOString().slice(0, 16), tripStartLocation: '', advanceAmount: 0 });
      setUseOutsideDriver(false); setOutsideDriverName('');
      setUseOutsideVehicle(false); setOutsideVehicleName('');
      fetchTrips();
    } catch (error) {
      console.error(error);
      toast.error('Failed to start trip');
    }
  };

  const openCompleteModal = (trip: Trip) => {
    setActiveTrip(trip);
    setCompleteData({
      endTime: new Date().toISOString().slice(0, 16),
      endKm: 0,
      tripEndLocation: '',
      additionalCosts: []
    });
    setNewCostLabel('');
    setNewCostAmount('');
    setIsCompleteModalOpen(true);
  };

  const handleCompleteTripSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeTrip?.id) return;
    try {
      await tripService.endTrip(activeTrip.id, { ...completeData });
      toast.success('Trip completed successfully');
      setIsCompleteModalOpen(false);
      fetchTrips();
    } catch (error) {
      console.error(error);
      toast.error('Failed to complete trip');
    }
  };

  const openEditModal = (trip: Trip) => {
    setActiveTrip(trip);
    setEditData({
      startKm: trip.startKm || 0,
      startTime: trip.startTime || '',
      tripStartLocation: trip.tripStartLocation || '',
      endKm: trip.endKm || 0,
      endTime: trip.endTime || '',
      tripEndLocation: trip.tripEndLocation || '',
      additionalCosts: trip.additionalCosts || [],
      customerName: trip.customerName || '',
      driverName: trip.driverName || '',
      vehicleNo: trip.vehicleNo || ''
    });
    setNewCostLabel('');
    setNewCostAmount('');
    setIsEditModalOpen(true);
  };

  const handleEditTripSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeTrip?.id) return;
    try {
      await tripService.updateTrip(activeTrip.id, editData);
      toast.success('Trip updated successfully');
      setIsEditModalOpen(false);
      fetchTrips();
    } catch (error) {
      console.error(error);
      toast.error('Failed to update trip');
    }
  };

  const handleGenerateBill = (trip: Trip) => {
    navigate(`/create?tripId=${trip.id}`);
  };

  const handleDeleteTrip = async (id: string) => {
    if (window.confirm("Are you sure you want to delete this trip? This action cannot be undone.")) {
      try {
        await tripService.deleteTrip(id);
        setAllTrips(prev => prev.filter(t => t.id !== id));
        toast.success("Trip deleted successfully");
      } catch (err) {
        console.error(err);
        toast.error("Failed to delete trip");
      }
    }
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

      {/* Search Bar */}
      <div className="relative w-full">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-300" size={18} />
        <input
          type="text"
          placeholder="Search trips by customer, driver, or vehicle..."
          className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:ring-4 focus:ring-blue-50 focus:bg-white transition-all font-medium text-slate-700"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
        />
      </div>

      {/* Filters */}
      <div className="bg-slate-50 border border-slate-200 p-4 rounded-lg flex flex-col md:flex-row gap-4 items-end">
        <div className="w-full md:w-auto flex-[1.5]">
          <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1.5 flex items-center gap-1"><Filter size={12} /> Date Filter</label>
          <select
            className="w-full px-3 py-2 bg-white border border-slate-300 rounded-md focus:border-blue-500 outline-none text-sm font-semibold text-slate-700 shadow-sm"
            value={draftFilters.dateFilterType}
            onChange={(e) => setDraftFilters({ ...draftFilters, dateFilterType: e.target.value as any })}
          >
            <option value="all">All Time</option>
            <option value="this_month">This Month</option>
            <option value="month">Specific Month</option>
            <option value="custom">Custom Range</option>
          </select>
        </div>

        {draftFilters.dateFilterType === 'month' && (
          <div className="w-full md:w-auto flex-1">
            <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1.5 block">Select Month</label>
            <input
              type="month"
              className="w-full px-3 py-2 bg-white border border-slate-300 rounded-md focus:border-blue-500 outline-none text-sm font-semibold text-slate-700 shadow-sm"
              value={draftFilters.filterMonth}
              onChange={(e) => setDraftFilters({ ...draftFilters, filterMonth: e.target.value })}
            />
          </div>
        )}

        {draftFilters.dateFilterType === 'custom' && (
          <>
            <div className="w-full md:w-auto flex-1">
              <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1.5 block">From Date</label>
              <input
                type="date"
                className="w-full px-3 py-2 bg-white border border-slate-300 rounded-md focus:border-blue-500 outline-none text-sm font-semibold text-slate-700 shadow-sm"
                value={draftFilters.startDate}
                onChange={(e) => setDraftFilters({ ...draftFilters, startDate: e.target.value })}
              />
            </div>
            <div className="w-full md:w-auto flex-1">
              <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1.5 block">To Date</label>
              <input
                type="date"
                className="w-full px-3 py-2 bg-white border border-slate-300 rounded-md focus:border-blue-500 outline-none text-sm font-semibold text-slate-700 shadow-sm"
                value={draftFilters.endDate}
                onChange={(e) => setDraftFilters({ ...draftFilters, endDate: e.target.value })}
              />
            </div>
          </>
        )}

        <div className="w-full md:w-auto flex-[1.5]">
          <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1.5 block">Company</label>
          <select
            className="w-full px-3 py-2 bg-white border border-slate-300 rounded-md focus:border-blue-500 outline-none text-sm font-semibold text-slate-700 shadow-sm"
            value={draftFilters.filterCompany}
            onChange={(e) => setDraftFilters({ ...draftFilters, filterCompany: e.target.value })}
          >
            <option value="">All Companies</option>
            {customers.map(c => <option key={c.id} value={c.id}>{c.companyName}</option>)}
          </select>
        </div>

        <div className="w-full md:w-auto flex-[1.2]">
          <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1.5 block">Status</label>
          <select
            className="w-full px-3 py-2 bg-white border border-slate-300 rounded-md focus:border-blue-500 outline-none text-sm font-semibold text-slate-700 shadow-sm"
            value={draftFilters.filterStatus}
            onChange={(e) => setDraftFilters({ ...draftFilters, filterStatus: e.target.value as any })}
          >
            <option value="all">All Status</option>
            <option value="ongoing">Trip Not Completed</option>
            <option value="completed_unbilled">Bill Not Generated</option>
            <option value="billed">Billed</option>
          </select>
        </div>

        <div className="w-full md:w-auto flex items-center gap-2">
          <button
            onClick={() => setAppliedFilters(draftFilters)}
            className="flex-1 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-md text-xs font-bold transition-colors h-[38px] flex justify-center items-center gap-1.5"
          >
            Apply
          </button>
          <button
            onClick={() => {
              setDraftFilters(defaultFilters);
              setAppliedFilters(defaultFilters);
              setSearchTerm('');
            }}
            className="flex-1 px-4 py-2 bg-slate-200 hover:bg-slate-300 text-slate-700 rounded-md text-xs font-bold transition-colors h-[38px] flex justify-center items-center gap-1.5"
          >
            <X size={14} /> Clear
          </button>
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
                    <div className="flex flex-col items-end gap-1">
                      <div className="flex items-center gap-1.5 px-2 py-1 bg-blue-50 text-blue-600 rounded text-[10px] font-bold uppercase tracking-wider">
                        <CalendarDays size={10} /> {trip.startTime ? new Date(trip.startTime).toLocaleDateString([], { day: 'numeric', month: 'short' }) : ''}
                        <Clock size={10} className="ml-1" /> {trip.startTime ? new Date(trip.startTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : ''}
                      </div>
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

                  {trip.status === 'ongoing' ? (
                    <div className="flex gap-2">
                      <button 
                        onClick={() => openCompleteModal(trip)}
                        className="flex-1 py-2.5 bg-red-600 text-white rounded font-bold text-xs hover:bg-red-700 transition-all flex items-center justify-center gap-2"
                      >
                        Complete Trip
                      </button>
                      <button
                        onClick={() => { setActiveTrip(trip); setIsViewModalOpen(true); }}
                        className="px-3 py-2 bg-blue-50 text-blue-600 rounded hover:bg-blue-100 transition-all"
                        title="View Details"
                      >
                        <Eye size={16} />
                      </button>
                      <button
                        onClick={() => handleDeleteTrip(trip.id!)}
                        className="px-3 py-2 bg-slate-100 text-slate-500 rounded hover:bg-red-50 hover:text-red-600 transition-all"
                        title="Delete Trip"
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  ) : (
                    <div className="flex gap-2">
                      <button
                        onClick={() => { setActiveTrip(trip); setIsViewModalOpen(true); }}
                        className="px-2.5 py-2 bg-blue-50 text-blue-600 rounded hover:bg-blue-100 transition-all flex items-center justify-center"
                        title="View Details"
                      >
                        <Eye size={14} />
                      </button>
                      <button 
                        onClick={() => openEditModal(trip)}
                        className="flex-[0.8] py-2 bg-slate-100 text-slate-700 hover:bg-slate-200 rounded font-black text-[10px] uppercase tracking-widest transition-all flex items-center justify-center gap-1.5"
                      >
                         <Edit size={12} /> Edit
                      </button>
                      <button 
                        onClick={() => handleGenerateBill(trip)}
                        className="flex-1 py-2 bg-slate-900 text-white hover:bg-black rounded font-black text-[10px] uppercase tracking-widest transition-all flex items-center justify-center gap-1.5"
                      >
                        <FileText size={12} /> Generate Bill
                      </button>
                      <button
                        onClick={() => handleDeleteTrip(trip.id!)}
                        className="px-2.5 py-2 bg-slate-100 text-slate-500 rounded hover:bg-red-50 hover:text-red-600 transition-all flex items-center justify-center"
                        title="Delete Trip"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  )}
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
                    onChange={(e) => setFormData({ ...formData, customerId: e.target.value })}
                  >
                    <option value="">Select a customer...</option>
                    {customers.map((c: Customer) => <option key={c.id} value={c.id}>{c.companyName}</option>)}
                  </select>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  {/* Vehicle Field */}
                  <div>
                    <div className="flex items-center justify-between mb-1.5">
                      <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">2. Assign Vehicle</label>
                      <button
                        type="button"
                        onClick={() => { setUseOutsideVehicle(v => !v); setOutsideVehicleName(''); setFormData(f => ({ ...f, carId: '' })); }}
                        className={`text-[9px] font-bold px-2 py-0.5 rounded border transition-colors ${useOutsideVehicle
                          ? 'bg-amber-100 text-amber-700 border-amber-300 hover:bg-amber-200'
                          : 'bg-slate-100 text-slate-500 border-slate-200 hover:bg-slate-200'
                          }`}
                      >
                        {useOutsideVehicle ? '✓ Outside' : 'Outside?'}
                      </button>
                    </div>
                    {useOutsideVehicle ? (
                      <input
                        type="text"
                        placeholder="e.g. TN 01 AB 1234 - Innova"
                        className="w-full px-3 py-2 bg-amber-50 border border-amber-300 rounded-md focus:border-amber-500 focus:ring-1 focus:ring-amber-400 outline-none transition-all text-sm font-semibold text-slate-800 shadow-sm"
                        value={outsideVehicleName}
                        onChange={(e) => setOutsideVehicleName(e.target.value)}
                      />
                    ) : (
                      <select
                        className="w-full px-3 py-2 bg-white border border-slate-300 rounded-md focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none transition-all text-sm font-semibold text-slate-700 shadow-sm"
                        value={formData.carId}
                        onChange={(e) => setFormData({ ...formData, carId: e.target.value })}
                      >
                        <option value="">Select vehicle...</option>
                        {cars.map((c: Car) => <option key={c.id} value={c.id}>{c.regNo} - {c.model}</option>)}
                      </select>
                    )}
                  </div>

                  {/* Driver Field */}
                  <div>
                    <div className="flex items-center justify-between mb-1.5">
                      <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">3. Assign Driver</label>
                      <button
                        type="button"
                        onClick={() => { setUseOutsideDriver(v => !v); setOutsideDriverName(''); setFormData(f => ({ ...f, driverId: '' })); }}
                        className={`text-[9px] font-bold px-2 py-0.5 rounded border transition-colors ${useOutsideDriver
                          ? 'bg-amber-100 text-amber-700 border-amber-300 hover:bg-amber-200'
                          : 'bg-slate-100 text-slate-500 border-slate-200 hover:bg-slate-200'
                          }`}
                      >
                        {useOutsideDriver ? '✓ Outside' : 'Outside?'}
                      </button>
                    </div>
                    {useOutsideDriver ? (
                      <input
                        type="text"
                        placeholder="e.g. Rajan Kumar"
                        className="w-full px-3 py-2 bg-amber-50 border border-amber-300 rounded-md focus:border-amber-500 focus:ring-1 focus:ring-amber-400 outline-none transition-all text-sm font-semibold text-slate-800 shadow-sm"
                        value={outsideDriverName}
                        onChange={(e) => setOutsideDriverName(e.target.value)}
                      />
                    ) : (
                      <select
                        className="w-full px-3 py-2 bg-white border border-slate-300 rounded-md focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none transition-all text-sm font-semibold text-slate-700 shadow-sm"
                        value={formData.driverId}
                        onChange={(e) => setFormData({ ...formData, driverId: e.target.value })}
                      >
                        <option value="">Select driver...</option>
                        {drivers.map((d: Driver) => <option key={d.id} value={d.id}>{d.name}</option>)}
                      </select>
                    )}
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
                        onChange={(e) => setFormData({ ...formData, startKm: Number(e.target.value) })}
                      />
                    </div>
                  </div>
                  <div>
                    <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1.5 block">Departure Time</label>
                    <input
                      type="datetime-local" required
                      className="w-full px-3 py-2 bg-white border border-slate-300 rounded-md focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none transition-all text-sm font-semibold text-slate-700 shadow-sm"
                      value={formData.startTime}
                      onChange={(e) => setFormData({ ...formData, startTime: e.target.value })}
                    />
                  </div>
                </div>

                <div>
                  <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1.5 block">Departure Point</label>
                  <input
                    type="text" required placeholder="e.g. Office, Airport, Guest House..."
                    className="w-full px-3 py-2 bg-white border border-slate-300 rounded-md focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none transition-all text-sm font-semibold text-slate-700 shadow-sm"
                    value={formData.tripStartLocation}
                    onChange={(e) => setFormData({ ...formData, tripStartLocation: e.target.value })}
                  />
                </div>

                <div>
                  <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1.5 block">Advance Amount (Optional)</label>
                  <div className="relative">
                    <IndianRupee size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                    <input
                      type="number" placeholder="0"
                      className="w-full pl-9 pr-3 py-2 bg-white border border-slate-300 rounded-md focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none transition-all text-sm font-bold text-slate-900 shadow-sm"
                      value={formData.advanceAmount || ''}
                      onChange={(e) => setFormData({ ...formData, advanceAmount: Number(e.target.value) })}
                    />
                  </div>
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

      {/* Complete Trip Modal */}
      {isCompleteModalOpen && activeTrip && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-md">
          <div className="bg-white w-full max-w-lg max-h-[90vh] overflow-y-auto rounded-2xl shadow-2xl border border-slate-200 animate-in fade-in zoom-in duration-300">
            <div className="px-6 py-4 border-b border-slate-200 flex justify-between items-center bg-slate-50/50 sticky top-0 z-10">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 bg-red-600 rounded flex items-center justify-center text-white">
                  <CheckCircle2 size={18} />
                </div>
                <div>
                  <h2 className="text-sm font-bold text-slate-800 leading-tight">Complete Trip</h2>
                  <p className="text-[10px] text-slate-500 font-semibold uppercase tracking-wider">{activeTrip.customerName}</p>
                </div>
              </div>
              <button onClick={() => setIsCompleteModalOpen(false)} className="p-1.5 hover:bg-slate-100 rounded text-slate-400 transition-colors border border-transparent hover:border-slate-200">
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleCompleteTripSubmit} className="p-6 space-y-4">
              {/* Trip Dispatch Summary */}
              <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 mb-4 space-y-2">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Driver & Vehicle</p>
                    <p className="text-xs font-semibold text-slate-800">{activeTrip.driverName}</p>
                    <p className="text-xs font-semibold text-slate-800">{activeTrip.vehicleNo}</p>
                  </div>
                  <div>
                    <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Departure</p>
                    <p className="text-xs font-semibold text-slate-800">{activeTrip.tripStartLocation}</p>
                    <p className="text-xs font-semibold text-slate-800">{activeTrip.startTime ? new Date(activeTrip.startTime).toLocaleString([], { dateStyle: 'medium', timeStyle: 'short'}) : ''}</p>
                  </div>
                </div>
                <div className="pt-2 border-t border-slate-200">
                  <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Start Odometer</p>
                  <p className="text-sm font-black text-blue-600">{activeTrip.startKm} KM</p>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1.5 block">ODOMETER End</label>
                  <div className="relative">
                    <Hash className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={14} />
                    <input
                      type="number" required placeholder="0"
                      className="w-full pl-9 pr-3 py-2 bg-white border border-slate-300 rounded-md focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none transition-all text-sm font-bold text-slate-900 shadow-sm"
                      value={completeData.endKm || ''}
                      onChange={(e) => setCompleteData({ ...completeData, endKm: Number(e.target.value) })}
                    />
                  </div>
                </div>
                <div>
                  <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1.5 block">Arrival Time</label>
                  <input
                    type="datetime-local" required
                    className="w-full px-3 py-2 bg-white border border-slate-300 rounded-md focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none transition-all text-sm font-semibold text-slate-700 shadow-sm"
                    value={completeData.endTime}
                    onChange={(e) => setCompleteData({ ...completeData, endTime: e.target.value })}
                  />
                </div>
              </div>

              <div>
                <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1.5 block">Arrival Point</label>
                <input
                  type="text" required placeholder="e.g. Office, Airport, Guest House..."
                  className="w-full px-3 py-2 bg-white border border-slate-300 rounded-md focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none transition-all text-sm font-semibold text-slate-700 shadow-sm"
                  value={completeData.tripEndLocation}
                  onChange={(e) => setCompleteData({ ...completeData, tripEndLocation: e.target.value })}
                />
              </div>

              {/* Sundry Expenses */}
              <div className="pt-4 border-t border-slate-100">
                <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-3 flex items-center gap-2">
                  <IndianRupee size={12} /> Sundry Expenses
                </label>

                <div className="space-y-2 mb-3">
                  {completeData.additionalCosts.map((cost, index) => (
                    <div key={index} className="flex gap-2 items-center bg-slate-50 p-2 rounded-md border border-slate-200">
                      <span className="flex-1 text-xs font-bold text-slate-700">{cost.label}</span>
                      <span className="text-xs font-black text-slate-900">₹{cost.amount}</span>
                      <button
                        type="button"
                        onClick={() => {
                          const newCosts = [...completeData.additionalCosts];
                          newCosts.splice(index, 1);
                          setCompleteData({ ...completeData, additionalCosts: newCosts });
                        }}
                        className="text-red-500 hover:bg-red-50 p-1 rounded transition-colors"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  ))}
                </div>

                <div className="flex gap-2">
                  <input
                    type="text"
                    placeholder="Expense Name (e.g. Toll)"
                    className="flex-[2] px-3 py-2 bg-white border border-slate-300 rounded-md focus:border-blue-500 outline-none text-xs font-semibold"
                    value={newCostLabel}
                    onChange={e => setNewCostLabel(e.target.value)}
                  />
                  <input
                    type="number"
                    placeholder="Amount"
                    className="flex-1 px-3 py-2 bg-white border border-slate-300 rounded-md focus:border-blue-500 outline-none text-xs font-bold"
                    value={newCostAmount}
                    onChange={e => setNewCostAmount(e.target.value)}
                  />
                  <button
                    type="button"
                    onClick={() => {
                      if (newCostLabel && newCostAmount) {
                        setCompleteData({
                          ...completeData,
                          additionalCosts: [...completeData.additionalCosts, { id: crypto.randomUUID(), label: newCostLabel, amount: Number(newCostAmount) }]
                        });
                        setNewCostLabel('');
                        setNewCostAmount('');
                      }
                    }}
                    className="bg-slate-900 text-white px-3 py-2 rounded-md hover:bg-black transition-colors"
                  >
                    <Plus size={16} />
                  </button>
                </div>
              </div>

              <div className="pt-4">
                <button
                  type="submit"
                  className="w-full py-2.5 bg-red-600 hover:bg-red-700 text-white rounded font-bold transition-all shadow-sm flex items-center justify-center gap-2"
                >
                  <CheckCircle2 size={18} />
                  Confirm Completion
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit Trip Modal */}
      {isEditModalOpen && activeTrip && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-md">
          <div className="bg-white w-full max-w-2xl max-h-[90vh] overflow-y-auto rounded-2xl shadow-2xl border border-slate-200 animate-in fade-in zoom-in duration-300">
            <div className="px-6 py-4 border-b border-slate-200 flex justify-between items-center bg-slate-50/50 sticky top-0 z-10">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 bg-slate-900 rounded flex items-center justify-center text-white">
                  <Edit size={18} />
                </div>
                <div>
                  <h2 className="text-sm font-bold text-slate-800 leading-tight">Edit Trip Log</h2>
                  <p className="text-[10px] text-slate-500 font-semibold uppercase tracking-wider">{activeTrip.customerName}</p>
                </div>
              </div>
              <button onClick={() => setIsEditModalOpen(false)} className="p-1.5 hover:bg-slate-100 rounded text-slate-400 transition-colors border border-transparent hover:border-slate-200">
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleEditTripSubmit} className="p-6 space-y-6">
              {/* Start Details */}
              <div className="space-y-4">
                <h3 className="text-xs font-black text-slate-800 border-b border-slate-100 pb-2">DISPATCH DETAILS</h3>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1.5 block">ODOMETER Start</label>
                    <div className="relative">
                      <Hash className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={14} />
                      <input
                        type="number" required
                        className="w-full pl-9 pr-3 py-2 bg-white border border-slate-300 rounded-md focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none transition-all text-sm font-bold text-slate-900 shadow-sm"
                        value={editData.startKm || ''}
                        onChange={(e) => setEditData({ ...editData, startKm: Number(e.target.value) })}
                      />
                    </div>
                  </div>
                  <div>
                    <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1.5 block">Departure Time</label>
                    <input
                      type="datetime-local" required
                      className="w-full px-3 py-2 bg-white border border-slate-300 rounded-md focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none transition-all text-sm font-semibold text-slate-700 shadow-sm"
                      value={editData.startTime || ''}
                      onChange={(e) => setEditData({ ...editData, startTime: e.target.value })}
                    />
                  </div>
                </div>
                <div>
                  <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1.5 block">Departure Point</label>
                  <input
                    type="text" required
                    className="w-full px-3 py-2 bg-white border border-slate-300 rounded-md focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none transition-all text-sm font-semibold text-slate-700 shadow-sm"
                    value={editData.tripStartLocation || ''}
                    onChange={(e) => setEditData({ ...editData, tripStartLocation: e.target.value })}
                  />
                </div>
              </div>

              {/* End Details */}
              <div className="space-y-4">
                <h3 className="text-xs font-black text-slate-800 border-b border-slate-100 pb-2">COMPLETION DETAILS</h3>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1.5 block">ODOMETER End</label>
                    <div className="relative">
                      <Hash className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={14} />
                      <input
                        type="number" required
                        className="w-full pl-9 pr-3 py-2 bg-white border border-slate-300 rounded-md focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none transition-all text-sm font-bold text-slate-900 shadow-sm"
                        value={editData.endKm || ''}
                        onChange={(e) => setEditData({ ...editData, endKm: Number(e.target.value) })}
                      />
                    </div>
                  </div>
                  <div>
                    <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1.5 block">Arrival Time</label>
                    <input
                      type="datetime-local" required
                      className="w-full px-3 py-2 bg-white border border-slate-300 rounded-md focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none transition-all text-sm font-semibold text-slate-700 shadow-sm"
                      value={editData.endTime || ''}
                      onChange={(e) => setEditData({ ...editData, endTime: e.target.value })}
                    />
                  </div>
                </div>
                <div>
                  <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1.5 block">Arrival Point</label>
                  <input
                    type="text" required
                    className="w-full px-3 py-2 bg-white border border-slate-300 rounded-md focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none transition-all text-sm font-semibold text-slate-700 shadow-sm"
                    value={editData.tripEndLocation || ''}
                    onChange={(e) => setEditData({ ...editData, tripEndLocation: e.target.value })}
                  />
                </div>
              </div>

              {/* Sundry Expenses */}
              <div className="space-y-4">
                <h3 className="text-xs font-black text-slate-800 border-b border-slate-100 pb-2 flex items-center gap-2">
                  <IndianRupee size={14} /> SUNDRY EXPENSES
                </h3>

                <div className="space-y-2 mb-3">
                  {editData.additionalCosts?.map((cost, index) => (
                    <div key={index} className="flex gap-2 items-center bg-slate-50 p-2 rounded-md border border-slate-200">
                      <span className="flex-1 text-xs font-bold text-slate-700">{cost.label}</span>
                      <span className="text-xs font-black text-slate-900">₹{cost.amount}</span>
                      <button
                        type="button"
                        onClick={() => {
                          const newCosts = [...(editData.additionalCosts || [])];
                          newCosts.splice(index, 1);
                          setEditData({ ...editData, additionalCosts: newCosts });
                        }}
                        className="text-red-500 hover:bg-red-50 p-1 rounded transition-colors"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  ))}
                  {(!editData.additionalCosts || editData.additionalCosts.length === 0) && (
                    <p className="text-xs text-slate-400 font-medium italic">No sundry expenses logged.</p>
                  )}
                </div>

                <div className="flex gap-2">
                  <input
                    type="text"
                    placeholder="Expense Name"
                    className="flex-[2] px-3 py-2 bg-white border border-slate-300 rounded-md focus:border-blue-500 outline-none text-xs font-semibold"
                    value={newCostLabel}
                    onChange={e => setNewCostLabel(e.target.value)}
                  />
                  <input
                    type="number"
                    placeholder="Amount"
                    className="flex-1 px-3 py-2 bg-white border border-slate-300 rounded-md focus:border-blue-500 outline-none text-xs font-bold"
                    value={newCostAmount}
                    onChange={e => setNewCostAmount(e.target.value)}
                  />
                  <button
                    type="button"
                    onClick={() => {
                      if (newCostLabel && newCostAmount) {
                        setEditData({
                          ...editData,
                          additionalCosts: [...(editData.additionalCosts || []), { id: crypto.randomUUID(), label: newCostLabel, amount: Number(newCostAmount) }]
                        });
                        setNewCostLabel('');
                        setNewCostAmount('');
                      }
                    }}
                    className="bg-slate-900 text-white px-3 py-2 rounded-md hover:bg-black transition-colors"
                  >
                    <Plus size={16} />
                  </button>
                </div>
              </div>

              <div className="pt-4 border-t border-slate-100">
                <button
                  type="submit"
                  className="w-full py-2.5 bg-slate-900 hover:bg-black text-white rounded font-bold transition-all shadow-sm flex items-center justify-center gap-2"
                >
                  Save Changes
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* View Trip Details Modal */}
      {isViewModalOpen && activeTrip && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-md">
          <div className="bg-white w-full max-w-lg max-h-[90vh] overflow-y-auto rounded-2xl shadow-2xl border border-slate-200 animate-in fade-in zoom-in duration-300">
            <div className="px-6 py-4 border-b border-slate-200 flex justify-between items-center bg-slate-50/50 sticky top-0 z-10">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 bg-blue-100 rounded flex items-center justify-center text-blue-600">
                  <Eye size={18} />
                </div>
                <div>
                  <h2 className="text-sm font-bold text-slate-800 leading-tight">Trip Details</h2>
                  <p className="text-[10px] text-slate-500 font-semibold uppercase tracking-wider">{activeTrip.status}</p>
                </div>
              </div>
              <button onClick={() => setIsViewModalOpen(false)} className="p-1.5 hover:bg-slate-100 rounded text-slate-400 transition-colors border border-transparent hover:border-slate-200">
                <X size={18} />
              </button>
            </div>

            <div className="p-6 space-y-6">
              {/* Customer Info */}
              <div>
                <h3 className="text-xs font-black text-slate-900 uppercase tracking-widest mb-3 flex items-center gap-2">
                  <User size={14} className="text-blue-600" /> Customer & Driver
                </h3>
                <div className="grid grid-cols-2 gap-4 bg-slate-50 p-4 rounded-xl border border-slate-100">
                  <div>
                    <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">Customer</p>
                    <p className="text-sm font-bold text-slate-800">{activeTrip.customerName}</p>
                  </div>
                  <div>
                    <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">Driver</p>
                    <p className="text-sm font-bold text-slate-800">{activeTrip.driverName}</p>
                  </div>
                  <div className="col-span-2">
                    <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">Vehicle</p>
                    <p className="text-sm font-bold text-slate-800">{activeTrip.vehicleNo}</p>
                  </div>
                </div>
              </div>

              {/* Journey Info */}
              <div>
                <h3 className="text-xs font-black text-slate-900 uppercase tracking-widest mb-3 flex items-center gap-2">
                  <MapPin size={14} className="text-blue-600" /> Journey
                </h3>
                <div className="space-y-4 bg-slate-50 p-4 rounded-xl border border-slate-100">
                  <div className="flex justify-between items-start">
                    <div>
                      <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">Start Location</p>
                      <p className="text-sm font-bold text-slate-800">{activeTrip.tripStartLocation}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">Start Time</p>
                      <p className="text-sm font-bold text-slate-800">{activeTrip.startTime ? new Date(activeTrip.startTime).toLocaleString([], { dateStyle: 'medium', timeStyle: 'short' }) : '-'}</p>
                    </div>
                  </div>
                  
                  {activeTrip.status === 'completed' && (
                    <div className="flex justify-between items-start pt-4 border-t border-slate-200">
                      <div>
                        <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">End Location</p>
                        <p className="text-sm font-bold text-slate-800">{activeTrip.tripEndLocation || '-'}</p>
                      </div>
                      <div className="text-right">
                        <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">End Time</p>
                        <p className="text-sm font-bold text-slate-800">{activeTrip.endTime ? new Date(activeTrip.endTime).toLocaleString([], { dateStyle: 'medium', timeStyle: 'short' }) : '-'}</p>
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Odometer Info */}
              <div>
                <h3 className="text-xs font-black text-slate-900 uppercase tracking-widest mb-3 flex items-center gap-2">
                  <Activity size={14} className="text-blue-600" /> Odometer
                </h3>
                <div className="flex items-center justify-between bg-blue-50 p-4 rounded-xl border border-blue-100">
                  <div className="text-center flex-1">
                    <p className="text-[10px] font-bold text-blue-600/70 uppercase tracking-wider mb-1">Start</p>
                    <p className="text-lg font-black text-blue-700">{activeTrip.startKm} <span className="text-xs font-bold">KM</span></p>
                  </div>
                  
                  {activeTrip.status === 'completed' && activeTrip.endKm ? (
                    <>
                      <div className="w-8 border-t-2 border-dashed border-blue-300"></div>
                      <div className="text-center flex-1">
                        <p className="text-[10px] font-bold text-blue-600/70 uppercase tracking-wider mb-1">Total</p>
                        <p className="text-lg font-black text-blue-900">{activeTrip.endKm - activeTrip.startKm} <span className="text-xs font-bold">KM</span></p>
                      </div>
                      <div className="w-8 border-t-2 border-dashed border-blue-300"></div>
                      <div className="text-center flex-1">
                        <p className="text-[10px] font-bold text-blue-600/70 uppercase tracking-wider mb-1">End</p>
                        <p className="text-lg font-black text-blue-700">{activeTrip.endKm} <span className="text-xs font-bold">KM</span></p>
                      </div>
                    </>
                  ) : null}
                </div>
              </div>

              {/* Expenses Info */}
              {activeTrip.additionalCosts && activeTrip.additionalCosts.length > 0 && (
                <div>
                  <h3 className="text-xs font-black text-slate-900 uppercase tracking-widest mb-3 flex items-center gap-2">
                    <IndianRupee size={14} className="text-blue-600" /> Sundry Expenses
                  </h3>
                  <div className="bg-slate-50 rounded-xl border border-slate-100 overflow-hidden">
                    {activeTrip.additionalCosts.map((cost, idx) => (
                      <div key={cost.id} className={`flex justify-between items-center p-3 px-4 ${idx !== 0 ? 'border-t border-slate-200' : ''}`}>
                        <p className="text-xs font-bold text-slate-700">{cost.label}</p>
                        <p className="text-xs font-black text-slate-900">₹{cost.amount}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

    </div>
  );
}

