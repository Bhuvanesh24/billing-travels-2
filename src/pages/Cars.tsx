import { useState, useEffect } from 'react';
import { 
  Plus, 
  Search, 
  Edit2, 
  Trash2, 
  Car as CarIcon, 
  Loader2, 
  IndianRupee, 
  History,
  X,
  Activity
} from 'lucide-react';
import toast from 'react-hot-toast';
import { masterService, type Car } from '../services/masterService';
import { carExpenseService, type CarExpense } from '../services/carExpenseService';
import { Pagination } from '../components/Pagination';

export default function Cars() {
  const [cars, setCars] = useState<Car[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  
  // Modals
  const [isCarModalOpen, setIsCarModalOpen] = useState(false);
  const [isExpenseModalOpen, setIsExpenseModalOpen] = useState(false);
  const [isHistoryModalOpen, setIsHistoryModalOpen] = useState(false);
  
  // Selection
  const [selectedCar, setSelectedCar] = useState<Car | null>(null);
  const [editingCar, setEditingCar] = useState<Car | null>(null);
  const [carExpenses, setCarExpenses] = useState<CarExpense[]>([]);
  const [loadingExpenses, setLoadingExpenses] = useState(false);

  // Form States
  const [carForm, setCarForm] = useState<Omit<Car, 'id' | 'createdAt'>>({
    regNo: '',
    model: '',
    type: 'Sedan',
    ownerName: '',
    fuelType: 'Diesel'
  });

  const [expenseForm, setExpenseForm] = useState<Omit<CarExpense, 'id' | 'createdAt'>>({
    carId: '',
    date: new Date().toISOString().split('T')[0],
    category: 'other',
    label: '',
    amount: 0,
    notes: ''
  });

  useEffect(() => {
    fetchCars();
  }, []);

  async function fetchCars() {
    try {
      setLoading(true);
      const data = await masterService.getCars();
      setCars(data);
    } catch (error) {
      console.error(error);
      toast.error('Failed to fetch cars');
    } finally {
      setLoading(false);
    }
  }

  const handleOpenCarModal = (car?: Car) => {
    if (car) {
      setEditingCar(car);
      setCarForm({
        regNo: car.regNo,
        model: car.model,
        type: car.type,
        ownerName: car.ownerName || '',
        fuelType: car.fuelType || 'Diesel'
      });
    } else {
      setEditingCar(null);
      setCarForm({
        regNo: '',
        model: '',
        type: 'Sedan',
        ownerName: '',
        fuelType: 'Diesel'
      });
    }
    setIsCarModalOpen(true);
  };

  const handleCarSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (editingCar?.id) {
        await masterService.updateCar(editingCar.id, carForm);
        toast.success('Car updated successfully');
      } else {
        await masterService.addCar(carForm as Car);
        toast.success('Car added successfully');
      }
      setIsCarModalOpen(false);
      fetchCars();
    } catch (error) {
      console.error(error);
      toast.error('Error saving car');
    }
  };

  const handleDeleteCar = async (id: string) => {
    if (!window.confirm('Are you sure you want to delete this car? This will NOT delete its expense history.')) return;
    try {
      await masterService.deleteCar(id);
      toast.success('Car removed from fleet');
      fetchCars();
    } catch (error) {
      console.error(error);
      toast.error('Failed to delete car');
    }
  };

  const handleOpenExpenseModal = (car: Car) => {
    setSelectedCar(car);
    setExpenseForm({
      carId: car.id!,
      date: new Date().toISOString().split('T')[0],
      category: 'other',
      label: '',
      amount: 0,
      notes: ''
    });
    setIsExpenseModalOpen(true);
  };

  const handleExpenseSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await carExpenseService.addExpense(expenseForm as CarExpense);
      toast.success('Expense logged successfully');
      setIsExpenseModalOpen(false);
    } catch (error) {
      console.error(error);
      toast.error('Error logging expense');
    }
  };

  const handleOpenHistory = async (car: Car) => {
    setSelectedCar(car);
    setIsHistoryModalOpen(true);
    setLoadingExpenses(true);
    try {
      const expenses = await carExpenseService.getExpensesByCar(car.id!);
      setCarExpenses(expenses);
    } catch (error) {
      console.error(error);
      toast.error('Failed to fetch expenses');
    } finally {
      setLoadingExpenses(false);
    }
  };

  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 10;

  const filteredCars = cars.filter(c => 
    c.regNo.toLowerCase().includes(searchTerm.toLowerCase()) ||
    c.model.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const totalPages = Math.ceil(filteredCars.length / pageSize);
  const paginatedCars = filteredCars.slice(
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
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Cars & Fleet</h1>
          <p className="text-slate-500 text-sm">Manage vehicles and track maintenance expenses</p>
        </div>
        <button 
          onClick={() => handleOpenCarModal()}
          className="bg-slate-900 hover:bg-slate-800 text-white px-5 py-2.5 rounded-xl font-semibold transition-all shadow-md hover:shadow-lg flex items-center gap-2"
        >
          <Plus size={18} />
          Add Vehicle
        </button>
      </div>

      {/* Search */}
      <div className="relative bg-white p-4 rounded-xl border border-slate-200">
        <Search className="absolute left-7 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
        <input 
          type="text"
          placeholder="Search by registration number or model..."
          className="w-full pl-10 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-lg outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white transition-all"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
        />
      </div>

      {/* Cars Table */}
      {loading ? (
        <div className="bg-white rounded-lg border border-slate-200 shadow-sm p-20 flex flex-col items-center justify-center">
          <Loader2 className="animate-spin text-blue-600 mb-4" size={40} />
          <p className="text-slate-500 font-medium">Loading fleet...</p>
        </div>
      ) : filteredCars.length > 0 ? (
        <div className="bg-white border text-sm border-slate-200 rounded-lg shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50 text-slate-500 border-b border-slate-200">
                  <th className="px-4 py-3 font-semibold uppercase text-[10px] tracking-wider">Registration & Details</th>
                  <th className="px-4 py-3 font-semibold uppercase text-[10px] tracking-wider">Specifications</th>
                  <th className="px-4 py-3 font-semibold uppercase text-[10px] tracking-wider">Quick Actions</th>
                  <th className="px-4 py-3 font-semibold uppercase text-[10px] tracking-wider text-right">Manage</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {paginatedCars.map((car) => (
                  <tr key={car.id} className="hover:bg-slate-50 transition-colors group">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded bg-slate-100 flex items-center justify-center text-slate-500">
                          <CarIcon size={16} />
                        </div>
                        <div>
                          <p className="font-semibold text-slate-800 uppercase leading-tight">{car.regNo}</p>
                          <p className="text-xs text-slate-500">{car.model}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex flex-col gap-1">
                        <span className="text-xs text-slate-800 font-bold">{car.model}</span>
                        <span className="text-[10px] text-slate-500 font-medium">{car.type}</span>
                        <div className="flex items-center gap-1.5 mt-0.5">
                          <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[9px] font-bold bg-blue-50 text-blue-700 border border-blue-100 uppercase">
                            {car.fuelType}
                          </span>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <button 
                          onClick={() => handleOpenExpenseModal(car)}
                          className="flex items-center justify-center gap-1.5 px-2 py-1 bg-white text-slate-600 rounded text-[10px] font-semibold hover:bg-slate-100 transition-colors border border-slate-200"
                        >
                          <IndianRupee size={12} /> Add Exp
                        </button>
                        <button 
                          onClick={() => handleOpenHistory(car)}
                          className="flex items-center justify-center gap-1.5 px-2 py-1 bg-white text-slate-600 rounded text-[10px] font-semibold hover:bg-slate-100 transition-colors border border-slate-200"
                        >
                          <History size={12} /> Log
                        </button>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <div className="flex items-center justify-end gap-2 transition-opacity">
                        <button onClick={() => handleOpenCarModal(car)} className="p-1.5 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded transition-colors" title="Edit">
                          <Edit2 size={14} />
                        </button>
                        <button 
                          onClick={() => handleDeleteCar(car.id!)}
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
            totalItems={filteredCars.length}
            pageSize={pageSize}
          />
        </div>
      ) : (
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-16 text-center">
          <div className="w-16 h-16 bg-slate-50 rounded-full flex items-center justify-center mx-auto mb-4 text-slate-300">
             <CarIcon size={32} />
          </div>
          <h3 className="text-lg font-bold text-slate-900 mb-1">No vehicles found</h3>
          <p className="text-slate-500 text-sm">Add your fleet to start tracking profit and expenses.</p>
        </div>
      )}

      {/* Car Modal */}
      {isCarModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm">
          <div className="bg-white w-full max-w-md rounded-lg shadow-xl overflow-hidden border border-slate-200 animate-in fade-in zoom-in duration-200">
            <div className="px-6 py-4 border-b border-slate-200 flex justify-between items-center bg-slate-50/50">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 bg-blue-600 rounded flex items-center justify-center text-white">
                  <CarIcon size={18} />
                </div>
                <div>
                  <h2 className="text-sm font-bold text-slate-800 leading-tight">{editingCar ? 'Edit Vehicle' : 'Add New Vehicle'}</h2>
                  <p className="text-[10px] text-slate-500 font-semibold uppercase tracking-wider">Fleet Registry</p>
                </div>
              </div>
              <button onClick={() => setIsCarModalOpen(false)} className="text-slate-400 hover:bg-slate-100 p-1.5 rounded transition-colors border border-transparent hover:border-slate-200">
                <X size={18} />
              </button>
            </div>
            <form onSubmit={handleCarSubmit} className="p-6 space-y-4">
              <div>
                <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1.5">Registration Number</label>
                <input 
                  type="text" required placeholder="e.g. TN-01-AB-1234"
                  className="w-full px-3 py-2 bg-white border border-slate-300 rounded-md focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none uppercase font-bold text-sm shadow-sm"
                  value={carForm.regNo}
                  onChange={(e) => setCarForm({...carForm, regNo: e.target.value.toUpperCase()})}
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                    <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1.5">Model</label>
                    <input 
                    type="text" required placeholder="e.g. Innova"
                    className="w-full px-3 py-2 bg-white border border-slate-300 rounded-md focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none text-sm shadow-sm"
                    value={carForm.model}
                    onChange={(e) => setCarForm({...carForm, model: e.target.value})}
                    />
                </div>
                <div>
                    <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1.5">Type</label>
                    <select 
                      className="w-full px-3 py-2 bg-white border border-slate-300 rounded-md focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none text-sm font-semibold shadow-sm"
                      value={carForm.type}
                      onChange={(e) => setCarForm({...carForm, type: e.target.value})}
                    >
                        <option>Sedan</option>
                        <option>SUV</option>
                        <option>MUV</option>
                        <option>Hatchback</option>
                        <option>Tempo Traveller</option>
                        <option>Bus</option>
                    </select>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                    <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1.5">Fuel Type</label>
                    <select 
                      className="w-full px-3 py-2 bg-white border border-slate-300 rounded-md focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none text-sm font-semibold shadow-sm"
                      value={carForm.fuelType}
                      onChange={(e) => setCarForm({...carForm, fuelType: e.target.value})}
                    >
                        <option>Diesel</option>
                        <option>Petrol</option>
                        <option>EV</option>
                        <option>CNG</option>
                    </select>
                </div>
                <div>
                    <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1.5">Owner Status</label>
                    <select 
                      className="w-full px-3 py-2 bg-white border border-slate-300 rounded-md focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none text-sm font-semibold shadow-sm"
                      value={carForm.ownerName}
                      onChange={(e) => setCarForm({...carForm, ownerName: e.target.value})}
                    >
                        <option value="">Personal</option>
                        <option value="Attached">Attached</option>
                    </select>
                </div>
              </div>
              <div className="pt-2">
                <button type="submit" className="w-full py-2.5 bg-slate-900 text-white rounded font-bold shadow-sm hover:bg-black transition-all">
                  {editingCar ? 'Update Vehicle' : 'Save Vehicle'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Expense Modal */}
      {isExpenseModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm">
          <div className="bg-white w-full max-w-sm rounded-lg shadow-xl overflow-hidden border border-slate-200 animate-in slide-in-from-bottom duration-300">
            <div className="px-6 py-4 border-b border-slate-200 flex justify-between items-center bg-slate-50/50">
                <div className="flex items-center gap-3">
                    <div className="w-8 h-8 bg-blue-600 rounded flex items-center justify-center text-white">
                        <IndianRupee size={18} />
                    </div>
                    <div>
                        <h2 className="text-sm font-bold text-slate-800 leading-tight">Log Expense</h2>
                        <p className="text-[10px] text-slate-500 font-semibold uppercase tracking-wider">{selectedCar?.regNo}</p>
                    </div>
                </div>
                <button onClick={() => setIsExpenseModalOpen(false)} className="text-slate-400 hover:bg-slate-100 p-1.5 rounded transition-colors border border-transparent hover:border-slate-200">
                    <X size={18} />
                </button>
            </div>
            
            <form onSubmit={handleExpenseSubmit} className="p-6 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1.5">Date</label>
                    <input 
                        type="date" required
                        className="w-full px-3 py-2 bg-white border border-slate-300 rounded-md text-sm outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500 shadow-sm"
                        value={expenseForm.date}
                        onChange={(e) => setExpenseForm({...expenseForm, date: e.target.value})}
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1.5">Amount</label>
                    <input 
                        type="number" required placeholder="0.00"
                        className="w-full px-3 py-2 bg-white border border-slate-300 rounded-md text-sm font-bold outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500 shadow-sm"
                        value={expenseForm.amount || ''}
                        onChange={(e) => setExpenseForm({...expenseForm, amount: Number(e.target.value)})}
                    />
                  </div>
              </div>

              <div>
                <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1.5">Category</label>
                <select 
                    className="w-full px-3 py-2 bg-white border border-slate-300 rounded-md text-sm font-semibold outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500 shadow-sm"
                    value={expenseForm.category}
                    onChange={(e) => setExpenseForm({...expenseForm, category: e.target.value as any})}
                >
                    <option value="service">🔧 General Service</option>
                    <option value="repair">🛠️ Repair</option>
                    <option value="fuel">⛽ Fuel</option>
                    <option value="insurance">🛡️ Insurance</option>
                    <option value="tax">📄 Tax/FC</option>
                    <option value="other">📦 Other</option>
                </select>
              </div>

              <div>
                <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1.5">Details/Notes</label>
                <input 
                    type="text" required placeholder="e.g. Oil change, New tires..."
                    className="w-full px-3 py-2 bg-white border border-slate-300 rounded-md text-sm font-semibold outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500 shadow-sm"
                    value={expenseForm.label}
                    onChange={(e) => setExpenseForm({...expenseForm, label: e.target.value})}
                />
              </div>

              <div className="pt-2">
                <button type="submit" className="w-full py-2 bg-blue-600 text-white rounded font-bold hover:bg-blue-700 transition-colors flex items-center justify-center gap-2 shadow-sm">
                  <Activity size={16} />
                  Record Expense
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* History Modal */}
      {isHistoryModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm">
          <div className="bg-white w-full max-w-2xl rounded-lg shadow-xl h-[80vh] flex flex-col overflow-hidden border border-slate-200 animate-in zoom-in duration-300">
             <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-slate-50">
                <div className="flex items-center gap-4">
                    <div className="w-10 h-10 bg-slate-900 rounded-xl flex items-center justify-center text-white">
                        <History size={20} />
                    </div>
                    <div>
                        <h2 className="font-bold text-slate-900 tracking-tight">Expense History</h2>
                        <p className="text-xs text-slate-500">{selectedCar?.regNo} • {selectedCar?.model}</p>
                    </div>
                </div>
                <button onClick={() => setIsHistoryModalOpen(false)} className="text-slate-500 hover:bg-slate-100 p-2 rounded-lg border border-transparent hover:border-slate-200 transition-colors">
                    <X size={20} />
                </button>
             </div>

             <div className="flex-1 overflow-y-auto p-6">
                {loadingExpenses ? (
                   <div className="flex flex-col items-center justify-center h-full">
                       <Loader2 className="animate-spin text-blue-600 mb-2" size={32} />
                       <p className="text-sm text-slate-500">Retrieving logs...</p>
                   </div>
                ) : carExpenses.length > 0 ? (
                    <div className="space-y-4">
                        {carExpenses.map((exp) => (
                            <div key={exp.id} className="flex items-center justify-between p-4 bg-slate-50 rounded-xl border border-slate-100">
                                <div className="flex items-center gap-4">
                                    <div className="w-10 h-10 bg-white rounded-lg border border-slate-200 flex items-center justify-center text-slate-600">
                                        {exp.category === 'fuel' ? '⛽' : exp.category === 'service' ? '🔧' : '📦'}
                                    </div>
                                    <div>
                                        <p className="font-bold text-slate-900 text-sm">{exp.label}</p>
                                        <p className="text-[10px] text-slate-400 font-medium uppercase">{new Date(exp.date).toLocaleDateString()} • {exp.category}</p>
                                    </div>
                                </div>
                                <div className="text-right">
                                    <p className="font-bold text-red-600">₹ {exp.amount}</p>
                                </div>
                            </div>
                        ))}
                    </div>
                ) : (
                    <div className="h-full flex flex-col items-center justify-center text-slate-400">
                        <History size={48} className="mb-4 opacity-20" />
                        <p className="text-sm">No expenses logged yet.</p>
                    </div>
                )}
             </div>

             <div className="p-6 bg-slate-50 border-t border-slate-100 flex justify-between items-center">
                 <div className="text-sm">
                    <span className="text-slate-500">Total Expenditure:</span>
                    <span className="ml-2 font-bold text-slate-900 text-lg">₹ {carExpenses.reduce((sum, e) => sum + e.amount, 0)}</span>
                 </div>
                 <button onClick={() => setIsHistoryModalOpen(false)} className="px-6 py-2 bg-white border border-slate-200 text-slate-900 rounded-xl font-bold hover:bg-slate-50">
                    Close
                 </button>
             </div>
          </div>
        </div>
      )}
    </div>
  );
}

