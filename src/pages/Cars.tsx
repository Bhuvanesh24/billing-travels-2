import { useState, useEffect } from 'react';
import { 
  Plus, 
  Search, 
  Edit2, 
  Trash2, 
  Car as CarIcon, 
  Loader2, 
  IndianRupee, 
  Wrench, 
  History,
  X,
  CreditCard
} from 'lucide-react';
import toast from 'react-hot-toast';
import { masterService, type Car } from '../services/masterService';
import { carExpenseService, type CarExpense } from '../services/carExpenseService';

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

  const filteredCars = cars.filter(c => 
    c.regNo.toLowerCase().includes(searchTerm.toLowerCase()) ||
    c.model.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="space-y-6">
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

      {/* Cars Grid */}
      {loading ? (
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-20 flex flex-col items-center justify-center">
          <Loader2 className="animate-spin text-blue-600 mb-4" size={40} />
          <p className="text-slate-500 font-medium">Loading fleet...</p>
        </div>
      ) : filteredCars.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredCars.map((car) => (
            <div key={car.id} className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm hover:shadow-md transition-all group overflow-hidden relative">
              <div className="flex justify-between items-start mb-6">
                <div className="w-14 h-14 bg-slate-100 rounded-2xl flex items-center justify-center text-slate-600 group-hover:bg-blue-600 group-hover:text-white transition-all duration-300">
                  <CarIcon size={28} />
                </div>
                <div className="flex gap-1">
                  <button 
                    onClick={() => handleOpenCarModal(car)}
                    className="p-2 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-all"
                  >
                    <Edit2 size={16} />
                  </button>
                  <button 
                    className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-all"
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              </div>
              
              <div className="space-y-4">
                <div>
                    <h3 className="font-extrabold text-slate-900 text-xl tracking-tight uppercase">{car.regNo}</h3>
                    <p className="text-slate-500 text-sm font-medium">{car.model} • {car.type}</p>
                </div>

                <div className="grid grid-cols-2 gap-2 pt-2">
                    <button 
                      onClick={() => handleOpenExpenseModal(car)}
                      className="flex items-center justify-center gap-2 py-2 bg-slate-50 text-slate-700 rounded-xl text-xs font-bold hover:bg-slate-100 transition-colors border border-slate-200"
                    >
                        <IndianRupee size={14} />
                        Add Expense
                    </button>
                    <button 
                      onClick={() => handleOpenHistory(car)}
                      className="flex items-center justify-center gap-2 py-2 bg-slate-50 text-slate-700 rounded-xl text-xs font-bold hover:bg-slate-100 transition-colors border border-slate-200"
                    >
                        <History size={14} />
                        History
                    </button>
                </div>

                <div className="flex items-center justify-between pt-4 border-t border-slate-50">
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest flex items-center gap-1">
                        <Wrench size={10} />
                        Active Service
                    </span>
                    <span className="text-[10px] font-bold text-slate-400">{car.fuelType}</span>
                </div>
              </div>
            </div>
          ))}
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
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm">
          <div className="bg-white w-full max-w-md rounded-2xl shadow-2xl overflow-hidden animate-in fade-in zoom-in duration-200">
            <div className="px-6 py-4 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
              <h2 className="font-bold text-slate-900">{editingCar ? 'Edit Vehicle' : 'Add New Vehicle'}</h2>
              <button onClick={() => setIsCarModalOpen(false)} className="text-slate-500 hover:bg-slate-200 p-1 rounded-lg">
                <X size={18} />
              </button>
            </div>
            <form onSubmit={handleCarSubmit} className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase mb-2">Registration Number</label>
                <input 
                  type="text" required placeholder="e.g. TN-01-AB-1234"
                  className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none uppercase font-bold"
                  value={carForm.regNo}
                  onChange={(e) => setCarForm({...carForm, regNo: e.target.value.toUpperCase()})}
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                    <label className="block text-xs font-bold text-slate-500 uppercase mb-2">Model</label>
                    <input 
                    type="text" required placeholder="e.g. Innova"
                    className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none"
                    value={carForm.model}
                    onChange={(e) => setCarForm({...carForm, model: e.target.value})}
                    />
                </div>
                <div>
                    <label className="block text-xs font-bold text-slate-500 uppercase mb-2">Type</label>
                    <select 
                      className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none"
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
                    <label className="block text-xs font-bold text-slate-500 uppercase mb-2">Fuel Type</label>
                    <select 
                      className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none"
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
                    <label className="block text-xs font-bold text-slate-500 uppercase mb-2">Owner Status</label>
                    <select 
                      className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none"
                      value={carForm.ownerName}
                      onChange={(e) => setCarForm({...carForm, ownerName: e.target.value})}
                    >
                        <option value="">Personal</option>
                        <option value="Attached">Attached</option>
                    </select>
                </div>
              </div>
              <button type="submit" className="w-full py-3.5 bg-slate-900 text-white rounded-xl font-bold shadow-lg mt-4">
                {editingCar ? 'Update Vehicle' : 'Save Vehicle'}
              </button>
            </form>
          </div>
        </div>
      )}

      {/* Expense Modal */}
      {isExpenseModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm">
          <div className="bg-white w-full max-w-sm rounded-2xl shadow-2xl overflow-hidden animate-in slide-in-from-bottom duration-300">
            <div className="p-6 bg-slate-900 text-white relative">
                <button onClick={() => setIsExpenseModalOpen(false)} className="absolute right-4 top-4 text-slate-400 hover:text-white">
                    <X size={20} />
                </button>
                <div className="flex items-center gap-3 mb-2">
                    <IndianRupee size={24} className="text-blue-400" />
                    <h2 className="font-bold text-xl">Add Expense</h2>
                </div>
                <p className="text-slate-400 text-sm">Logging for {selectedCar?.regNo}</p>
            </div>
            
            <form onSubmit={handleExpenseSubmit} className="p-6 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">Date</label>
                    <input 
                        type="date" required
                        className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm"
                        value={expenseForm.date}
                        onChange={(e) => setExpenseForm({...expenseForm, date: e.target.value})}
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">Amount</label>
                    <input 
                        type="number" required placeholder="₹ 0.00"
                        className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm font-bold"
                        value={expenseForm.amount || ''}
                        onChange={(e) => setExpenseForm({...expenseForm, amount: Number(e.target.value)})}
                    />
                  </div>
              </div>

              <div>
                <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">Category</label>
                <select 
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm"
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
                <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">Details</label>
                <input 
                    type="text" required placeholder="e.g. Oil change, New tires..."
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm"
                    value={expenseForm.label}
                    onChange={(e) => setExpenseForm({...expenseForm, label: e.target.value})}
                />
              </div>

              <button type="submit" className="w-full py-3 bg-blue-600 text-white rounded-xl font-bold hover:bg-blue-700 transition-colors flex items-center justify-center gap-2">
                <CreditCard size={18} />
                Confirm Payment
              </button>
            </form>
          </div>
        </div>
      )}

      {/* History Modal */}
      {isHistoryModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm">
          <div className="bg-white w-full max-w-2xl rounded-2xl shadow-2xl h-[80vh] flex flex-col overflow-hidden animate-in zoom-in duration-300">
             <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
                <div className="flex items-center gap-4">
                    <div className="w-10 h-10 bg-slate-900 rounded-xl flex items-center justify-center text-white">
                        <History size={20} />
                    </div>
                    <div>
                        <h2 className="font-bold text-slate-900 tracking-tight">Expense History</h2>
                        <p className="text-xs text-slate-500">{selectedCar?.regNo} • {selectedCar?.model}</p>
                    </div>
                </div>
                <button onClick={() => setIsHistoryModalOpen(false)} className="text-slate-400 hover:bg-slate-200 p-2 rounded-lg">
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

