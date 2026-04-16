import { useState, useEffect } from 'react';
import { Link, useNavigate, useParams, useLocation } from 'react-router-dom';
import { 
  ArrowLeft, 
  Plus, 
  Trash2, 
  Printer, 
  Loader2, 
  Eye, 
  Users, 
  Car as CarIcon, 
  IndianRupee 
} from 'lucide-react';
import toast from 'react-hot-toast';
import { type AdditionalCost, type RentType } from '../lib/calculator';
import { useDrive } from '../services/useDrive';
import { generateInvoicePDF } from '../services/pdfGeneration';
import { 
  getFormattedInvoiceNumber, 
  saveInvoiceMetadata,
  getInvoiceMetadata,
  peekNextInvoiceNumber,
  formatInvoiceNumber,
  db
} from '../services/firestore';
import { tripService } from '../services/tripService';
import { doc, getDoc } from 'firebase/firestore';

interface DateTimeInputProps {
  label: string;
  value: string;
  onChange: (value: string) => void;
}

const DateTimeInput = ({ label, value, onChange }: DateTimeInputProps) => {
  const parseValue = (val: string) => {
    if (!val) return { date: '', hours: '12', minutes: '00', period: 'AM' as const };
    const [d, t] = val.split('T');
    if (!t) return { date: d, hours: '12', minutes: '00', period: 'AM' as const };

    const [h, m] = t.split(':');
    let hourInt = parseInt(h);
    const period = hourInt >= 12 ? 'PM' : 'AM';
    if (hourInt > 12) hourInt -= 12;
    if (hourInt === 0) hourInt = 12;

    return { date: d, hours: hourInt.toString(), minutes: m, period };
  };

  const { date, hours, minutes, period } = parseValue(value);

  const update = (newDate: string, newHours: string, newMinutes: string, newPeriod: string) => {
    if (!newDate) { onChange(''); return; }
    let h = parseInt(newHours || '12');
    let m = parseInt(newMinutes || '0');
    if (newPeriod === 'PM' && h < 12) h += 12;
    if (newPeriod === 'AM' && h === 12) h = 0;
    onChange(`${newDate}T${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}`);
  };

  const hourOptions = Array.from({ length: 12 }, (_, i) => i + 1); // 1–12
  const minuteOptions = Array.from({ length: 60 }, (_, i) => i);   // 0–59

  const selectCls = 'px-2 py-1.5 border border-slate-300 rounded text-[11px] bg-white outline-none focus:ring-1 focus:ring-blue-500 font-semibold shadow-sm transition-all';

  return (
    <div>
      <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1.5">{label}</label>
      <div className="flex items-center gap-1.5 flex-nowrap overflow-x-auto">
        <input
          type="date"
          className="flex-1 min-w-0 px-2 py-1.5 border border-slate-300 rounded text-[11px] font-semibold outline-none focus:ring-1 focus:ring-blue-500 shadow-sm transition-all"
          value={date}
          onClick={(e) => (e.target as HTMLInputElement).showPicker()}
          onChange={(e) => update(e.target.value, hours, minutes, period)}
        />
        <select
          className={selectCls}
          value={hours}
          onChange={(e) => update(date || new Date().toISOString().split('T')[0], e.target.value, minutes, period)}
        >
          {hourOptions.map(h => (
            <option key={h} value={h.toString()}>{h.toString().padStart(2, '0')}</option>
          ))}
        </select>
        <span className="text-slate-400 font-bold text-xs">:</span>
        <select
          className={selectCls}
          value={parseInt(minutes).toString()}
          onChange={(e) => update(date || new Date().toISOString().split('T')[0], hours, e.target.value, period)}
        >
          {minuteOptions.map(m => (
            <option key={m} value={m.toString()}>{m.toString().padStart(2, '0')}</option>
          ))}
        </select>
        <select
          className={selectCls}
          value={period}
          onChange={(e) => update(date || new Date().toISOString().split('T')[0], hours, minutes, e.target.value as 'AM' | 'PM')}
        >
          <option value="AM">AM</option>
          <option value="PM">PM</option>
        </select>
      </div>
    </div>
  );
};

export default function CreateInvoice() {
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  const location = useLocation();
  const driveFileId = (location.state as any)?.driveFileId;
  const isEditing = !!id;

  const { isSignedIn, signIn, uploadFile, updateFile, loading: driveLoading } = useDrive();

  // Next number preview
  const [nextPlannedNumber, setNextPlannedNumber] = useState<string>('');
  const [loadingMetadata, setLoadingMetadata] = useState(isEditing);

  // Customer & Trip Details
  const [customerTitle, setCustomerTitle] = useState('Mr');
  const [customerName, setCustomerName] = useState('');
  const [customerCompanyName, setCustomerCompanyName] = useState('M/S ');
  const [customerAddress, setCustomerAddress] = useState('');
  const [customerGstNo, setCustomerGstNo] = useState('');
  const [driverName, setDriverName] = useState('');
  const [vehicleNo, setVehicleNo] = useState('');
  const [vehicleType, setVehicleType] = useState('');
  const [tripStartLocation, setTripStartLocation] = useState('');
  const [tripEndLocation, setTripEndLocation] = useState('');
  const [startKm, setStartKm] = useState(0);
  const [endKm, setEndKm] = useState(0);
  const [startTime, setStartTime] = useState('');
  const [endTime, setEndTime] = useState('');

  // Rent Calculation
  const [rentType, setRentType] = useState<RentType>('fixed');
  const [fixedAmount, setFixedAmount] = useState(0);
  const [hours, setHours] = useState(0);
  const [ratePerHour, setRatePerHour] = useState(0);
  const [days, setDays] = useState(0);
  const [ratePerDay, setRatePerDay] = useState(0);
  const [fuelChargePerKm, setFuelChargePerKm] = useState(0);
  const [freeKm, setFreeKm] = useState(0);
  const [ratePerKm, setRatePerKm] = useState(0);
  const [chargePerKmFixed, setChargePerKmFixed] = useState(0);
  const [chargePerKmHour, setChargePerKmHour] = useState(0);

  // Additional Costs
  const [additionalCosts, setAdditionalCosts] = useState<AdditionalCost[]>([]);
  const [newCostLabel, setNewCostLabel] = useState('');
  const [newCostAmount, setNewCostAmount] = useState('');

  // Driver Beta & Night Halt
  const [enableDriverBeta, setEnableDriverBeta] = useState(false);
  const [driverBetaDays, setDriverBetaDays] = useState(0);
  const [driverBetaAmountPerDay, setDriverBetaAmountPerDay] = useState(0);
  const [enableNightHalt, setEnableNightHalt] = useState(false);
  const [nightHaltDays, setNightHaltDays] = useState(0);
  const [nightHaltAmountPerDay, setNightHaltAmountPerDay] = useState(0);

  // Upload State
  const [uploading, setUploading] = useState(false);

  // Load existing metadata if editing OR if ending a trip
  useEffect(() => {
    async function load() {
      const searchParams = new URLSearchParams(location.search);
      const tripId = searchParams.get('tripId');

      if (isEditing && id) {
        try {
          const data = await getInvoiceMetadata(decodeURIComponent(id));
          if (data) {
            setCustomerTitle(data.customerTitle || 'Mr');
            setCustomerName(data.customerName || '');
            setCustomerCompanyName(data.customerCompanyName || 'M/S ');
            setCustomerAddress(data.customerAddress || '');
            setCustomerGstNo(data.customerGstNo || '');
            setDriverName(data.driverName || '');
            setVehicleNo(data.vehicleNo || '');
            setVehicleType(data.vehicleType || '');
            setTripStartLocation(data.tripStartLocation || '');
            setTripEndLocation(data.tripEndLocation || '');
            setStartKm(data.startKm || 0);
            setEndKm(data.endKm || 0);
            setStartTime(data.startTime || '');
            setEndTime(data.endTime || '');
            setRentType(data.rentType || 'fixed');
            setFixedAmount(data.fixedAmount || 0);
            setHours(data.hours || 0);
            setRatePerHour(data.ratePerHour || 0);
            setDays(data.days || 0);
            setRatePerDay(data.ratePerDay || 0);
            setFuelChargePerKm(data.fuelChargePerKm || 0);
            setFreeKm(data.freeKm || 0);
            setRatePerKm(data.ratePerKm || 0);
            setChargePerKmFixed(data.chargePerKmFixed || 0);
            setChargePerKmHour(data.chargePerKmHour || 0);
            setAdditionalCosts(data.additionalCosts || []);
            setEnableDriverBeta(data.enableDriverBeta || false);
            setDriverBetaDays(data.driverBetaDays || 0);
            setDriverBetaAmountPerDay(data.driverBetaAmountPerDay || 0);
            setEnableNightHalt(data.enableNightHalt || false);
            setNightHaltDays(data.nightHaltDays || 0);
            setNightHaltAmountPerDay(data.nightHaltAmountPerDay || 0);
            setEnableDiscount(data.enableDiscount || false);
            setDiscountAmount(data.discountAmount || 0);
            setEnableGst(data.enableGst || false);
            setGstPercentage(data.gstPercentage || 5);
            setEnableIgst(data.enableIgst || false);
            setIgstPercentage(data.igstPercentage || 5);
            setAdvance(data.advance || 0);
            setNextPlannedNumber(data.invoiceNumber);
          } else {
            toast.error('Invoice data not found.');
            setNextPlannedNumber(decodeURIComponent(id));
          }
        } catch (err) {
          console.error(err);
          toast.error('Failed to load invoice details');
        } finally {
          setLoadingMetadata(false);
        }
      } else if (tripId) {
        try {
          setLoadingMetadata(true);
          const trip = await tripService.getTripById(tripId);
          if (trip) {
            // Pre-fill from trip
            setCustomerName(trip.customerName || '');
            setDriverName(trip.driverName || '');
            setVehicleNo(trip.vehicleNo || '');
            setTripStartLocation(trip.tripStartLocation || '');
            setStartKm(trip.startKm || 0);
            setStartTime(trip.startTime || '');
            
            // Try to fetch detailed customer/car info from masters
            if (trip.customerId) {
                const custRef = doc(db, 'customers', trip.customerId);
                const custSnap = await getDoc(custRef);
                if (custSnap.exists()) {
                    setCustomerCompanyName(custSnap.data().companyName || 'M/S ');
                    setCustomerAddress(custSnap.data().address || '');
                    setCustomerGstNo(custSnap.data().gstNo || '');
                }
            }

            if (trip.carId) {
                const carRef = doc(db, 'cars', trip.carId);
                const carSnap = await getDoc(carRef);
                if (carSnap.exists()) {
                    setVehicleType(carSnap.data().type || '');
                }
            }
            
            // Set end time to now
            setEndTime(new Date().toISOString().slice(0, 16));
            
            toast.success('Trip data loaded');
          }
        } catch (err) {
          console.error('Error pre-filling from trip:', err);
          toast.error('Failed to load trip details');
        } finally {
          setLoadingMetadata(false);
          peekNextInvoiceNumber().then(num => setNextPlannedNumber(formatInvoiceNumber(num)));
        }
      } else {
        // Fetch next number for display
        peekNextInvoiceNumber().then(num => setNextPlannedNumber(formatInvoiceNumber(num)));
      }
    }
    load();
  }, [isEditing, id, location.search]);


  // Totals
  const [enableDiscount, setEnableDiscount] = useState(false);
  const [discountAmount, setDiscountAmount] = useState(0);
  const [enableGst, setEnableGst] = useState(false);
  const [gstPercentage, setGstPercentage] = useState(5);
  const [enableIgst, setEnableIgst] = useState(false);
  const [igstPercentage, setIgstPercentage] = useState(5);
  const [advance, setAdvance] = useState(0);

  // Computed Values - Auto-calculate from Start/End KM
  const totalKm = Math.max(0, endKm - startKm);
  const chargeableKm = Math.max(0, totalKm - freeKm);

  const rentTotal = (() => {
    switch (rentType) {
      case 'fixed':
        return fixedAmount + (chargeableKm * chargePerKmFixed);
      case 'hour':
        return (hours * ratePerHour) + (chargeableKm * chargePerKmHour);
      case 'day':
        return (days * ratePerDay) + (chargeableKm * fuelChargePerKm);
      case 'km':
        return chargeableKm * ratePerKm;
      default:
        return 0;
    }
  })();

  // Calculate Driver Beta and Night Halt totals
  const driverBetaTotal = enableDriverBeta ? driverBetaDays * driverBetaAmountPerDay : 0;
  const nightHaltTotal = enableNightHalt ? nightHaltDays * nightHaltAmountPerDay : 0;

  // Non-taxable total (additional costs + driver beta + night halt)
  const additionalCostsTotal = additionalCosts.reduce((sum, item) => sum + item.amount, 0);
  const nonTaxableTotal = additionalCostsTotal + driverBetaTotal + nightHaltTotal;

  // Full subtotal for display (rent + all other costs)
  const subtotal = rentTotal + nonTaxableTotal;

  // Calculate GST or IGST on VEHICLE RENT ONLY (mutually exclusive)
  let gstAmount = 0;
  let igstAmount = 0;
  let taxableAmount = rentTotal;

  // Apply discount to taxable amount first
  if (enableDiscount) {
    taxableAmount = Math.max(0, taxableAmount - discountAmount);
  }

  // Apply GST or IGST only on vehicle rent
  if (enableGst) {
    gstAmount = taxableAmount * (gstPercentage / 100);
  } else if (enableIgst) {
    igstAmount = taxableAmount * (igstPercentage / 100);
  }

  // Grand total = taxable amount + GST/IGST + non-taxable
  const grandTotal = taxableAmount + gstAmount + igstAmount + nonTaxableTotal;
  const totalBill = Math.round(grandTotal - advance);

  const addCost = () => {
    if (!newCostLabel || !newCostAmount) return;
    setAdditionalCosts([
      ...additionalCosts,
      { id: crypto.randomUUID(), label: newCostLabel, amount: Number(newCostAmount) }
    ]);
    setNewCostLabel('');
    setNewCostAmount('');
  };

  const removeCost = (id: string) => {
    setAdditionalCosts(additionalCosts.filter(c => c.id !== id));
  };

  const handlePreviewInvoice = async () => {
    // Same validation as generate
    if (!customerName.trim()) {
      toast.error('Please enter customer name');
      return;
    }
    if (startKm < 0 || endKm < 0) {
      toast.error('KM readings cannot be negative');
      return;
    }
    if (endKm < startKm) {
      toast.error('End KM cannot be less than Start KM');
      return;
    }
    if (startTime && endTime) {
      if (new Date(endTime) < new Date(startTime)) {
        toast.error('End Time cannot be before Start Time');
        return;
      }
    }

    try {
      const invoiceData = {
        invoiceNumber: '#PREVIEW',
        customerTitle,
        customerName,
        customerCompanyName,
        customerAddress,
        customerGstNo,
        driverName,
        vehicleNo,
        vehicleType,
        tripStartLocation,
        tripEndLocation,
        startKm,
        endKm,
        startTime,
        endTime,
        rentType,
        fixedAmount,
        hours,
        ratePerHour,
        days,
        ratePerDay,
        fuelChargePerKm,
        totalKm,
        freeKm,
        chargeableKm,
        ratePerKm,
        chargePerKmFixed,
        chargePerKmHour,
        additionalCosts,
        enableDriverBeta,
        driverBetaDays,
        driverBetaAmountPerDay,
        enableNightHalt,
        nightHaltDays,
        nightHaltAmountPerDay,
        enableDiscount,
        discountAmount,
        enableGst,
        gstPercentage,
        gstAmount,
        enableIgst,
        igstPercentage,
        igstAmount,
        advance,
        grandTotal,
        totalBill
      };

      const { blob } = await generateInvoicePDF(invoiceData);
      const url = URL.createObjectURL(blob);
      window.open(url, '_blank');
      // Clean up object URL after a delay so the tab can load it
      setTimeout(() => URL.revokeObjectURL(url), 10000);
    } catch (error) {
      console.error('Preview error:', error);
      toast.error('Failed to generate preview');
    }
  };

  const handleGenerateInvoice = async () => {
    try {
      // Validation
      if (!customerName.trim()) {
        toast.error('Please enter customer name');
        return;
      }
      if (startKm < 0 || endKm < 0) {
        toast.error('KM readings cannot be negative');
        return;
      }
      if (endKm < startKm) {
        toast.error('End KM cannot be less than Start KM');
        return;
      }
      if (startTime && endTime) {
        if (new Date(endTime) < new Date(startTime)) {
          toast.error('End Time cannot be before Start Time');
          return;
        }
      }

      setUploading(true);

      let invoiceNumber = nextPlannedNumber;
      const loadingToast = toast.loading(isEditing ? 'Updating invoice...' : 'Generating invoice...');

      try {
        // 1. Lock in the official invoice number (atomic)
        if (!isEditing) {
          invoiceNumber = await getFormattedInvoiceNumber();
        }

        // 2. Build full invoice data with ALL amount fields for compatibility
        const invoiceData: any = {
          invoiceNumber,
          customerTitle,
          customerName,
          customerCompanyName,
          customerAddress,
          customerGstNo,
          driverName,
          vehicleNo,
          vehicleType,
          tripStartLocation,
          tripEndLocation,
          startKm,
          endKm,
          startTime,
          endTime,
          rentType,
          fixedAmount,
          hours,
          ratePerHour,
          days,
          ratePerDay,
          fuelChargePerKm,
          totalKm,
          freeKm,
          chargeableKm,
          ratePerKm,
          chargePerKmFixed,
          chargePerKmHour,
          additionalCosts,
          enableDriverBeta,
          driverBetaDays,
          driverBetaAmountPerDay,
          enableNightHalt,
          nightHaltDays,
          nightHaltAmountPerDay,
          enableDiscount,
          discountAmount,
          enableGst,
          gstPercentage,
          gstAmount,
          enableIgst,
          igstPercentage,
          igstAmount,
          advance,
          grandTotal,
          totalAmount: grandTotal,  // always save both for compatibility
          totalBill,
        };

        // 3. Generate PDF Blob
        const { blob, fileName } = await generateInvoicePDF(invoiceData);
        const pdfFile = new File([blob], fileName, { type: 'application/pdf' });

        // 4. ALWAYS save to Firestore first — this is the source of truth
        //    Use a stable UUID as the doc ID (not the Drive file ID)
        const firestoreDocId = isEditing
          ? (id ? decodeURIComponent(id) : crypto.randomUUID())
          : crypto.randomUUID();

        const tripId = new URLSearchParams(location.search).get('tripId');

        await saveInvoiceMetadata(firestoreDocId, {
          ...invoiceData,
          ...(isEditing ? {} : { paymentStatus: 'pending' }),
          tripId: tripId || null,
          driveFileId: null,  // updated after Drive upload succeeds
        });

        // 5. Attempt Drive upload (optional — won't block if it fails)
        try {
          let driveResult: any;
          if (isEditing && driveFileId) {
            driveResult = await updateFile(driveFileId, pdfFile);
          } else {
            if (!isSignedIn) {
              await signIn();
            }
            driveResult = await uploadFile(pdfFile, fileName);
          }
          // Update the Firestore doc with the Drive file ID
          if (driveResult?.id) {
            const { doc: firestoreDoc, updateDoc: firestoreUpdate } = await import('firebase/firestore');
            await firestoreUpdate(firestoreDoc(db, 'invoices', firestoreDocId), {
              driveFileId: driveResult.id
            });
          }
        } catch (driveError) {
          console.warn('Drive upload failed (invoice still saved locally):', driveError);
          toast('Invoice saved. Drive upload failed — connect Google Drive to upload.', { icon: '⚠️' });
        }

        // 6. If from a trip, close the trip
        if (tripId) {
          await tripService.endTrip(tripId, {
            invoiceId: firestoreDocId,
            endKm,
            endTime,
            tripEndLocation,
            totalBill
          });
        }

        toast.success(isEditing ? 'Invoice updated!' : 'Invoice created!', {
          id: loadingToast,
          duration: 4000
        });

        navigate('/invoices');
      } catch (error) {
        console.error('Invoice generation error:', error);
        toast.error(isEditing ? 'Failed to update invoice' : 'Failed to create invoice', { id: loadingToast });
      } finally {
        setUploading(false);
      }
    } catch (error) {
      console.error(error);
      setUploading(false);
    }
  };


  return (
    <div className="bg-white border border-slate-200 rounded-2xl shadow-sm p-6 space-y-6">
      <div className="max-w-4xl mx-auto">
        <div className="mb-6 flex flex-wrap items-center gap-3">
          <Link
            to="/"
            className="flex items-center gap-2 text-slate-500 hover:text-slate-900 transition-colors text-sm"
          >
            <ArrowLeft size={18} />
            Back
          </Link>
          <h1 className="text-xl font-bold text-slate-900">
            {isEditing ? `Edit Invoice ${id}` : 'Create New Invoice'}
          </h1>
          {nextPlannedNumber && (
            <span className="bg-blue-100 text-blue-700 px-3 py-1 rounded-full text-xs font-bold">
              #{nextPlannedNumber.replace('#', '')}
            </span>
          )}
        </div>

        {loadingMetadata ? (
          <div className="flex flex-col items-center justify-center p-12 bg-white rounded-lg border border-slate-200 shadow-sm animate-pulse">
            <Loader2 className="animate-spin text-blue-600 mb-4" size={32} />
            <p className="text-xs font-bold text-slate-500 uppercase tracking-widest">Hydrating Form Data...</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Form Area */}
          <div className="lg:col-span-2 space-y-5">

            {/* 1. Trip Details */}
            <div className="bg-white p-6 rounded-lg border border-slate-200 shadow-sm">
              <div className="flex items-center gap-2 mb-6 border-b border-slate-100 pb-3">
                <div className="w-6 h-6 bg-slate-900 rounded flex items-center justify-center text-white">
                    <Users size={14} />
                </div>
                <h2 className="text-sm font-bold text-slate-800 uppercase tracking-tight">Customer Information</h2>
              </div>
              
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                <div className="sm:col-span-2">
                  <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1.5">Full Name & Title</label>
                  <div className="flex gap-2">
                    <select
                      className="w-24 px-3 py-2 border border-slate-300 rounded-md focus:ring-1 focus:ring-blue-500 focus:border-blue-500 outline-none bg-white text-sm font-semibold shadow-sm"
                      value={customerTitle}
                      onChange={e => setCustomerTitle(e.target.value)}
                    >
                      <option value="Mr">Mr.</option>
                      <option value="Mrs">Mrs.</option>
                      <option value="Ms">Ms.</option>
                      <option value="Dr">Dr.</option>
                      <option value="M/S">M/S</option>
                    </select>
                    <input
                      type="text"
                      className="flex-1 px-3 py-2 border border-slate-300 rounded-md focus:ring-1 focus:ring-blue-500 focus:border-blue-500 outline-none text-sm font-semibold shadow-sm"
                      placeholder="e.g. Rahul Sharma"
                      value={customerName}
                      onChange={e => setCustomerName(e.target.value)}
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1.5">Trade Name / Company</label>
                  <div className="flex items-center border border-slate-300 rounded-md shadow-sm focus-within:ring-1 focus-within:ring-blue-500 focus-within:border-blue-500">
                    <span className="px-3 py-2 bg-slate-50 text-slate-500 font-bold border-r border-slate-300 text-[10px] uppercase">M/S</span>
                    <input
                      type="text"
                      className="flex-1 min-w-0 px-3 py-2 outline-none rounded-r-md text-sm font-semibold"
                      placeholder="ABC Enterprise"
                      value={customerCompanyName.replace(/^M\/S\s*/, '')}
                      onChange={e => setCustomerCompanyName('M/S ' + e.target.value)}
                    />
                  </div>
                </div>
                <div className="sm:col-span-2">
                  <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1.5">Billing Address</label>
                  <textarea
                    className="w-full px-3 py-2 border border-slate-300 rounded-md focus:ring-1 focus:ring-blue-500 focus:border-blue-500 outline-none text-sm font-medium shadow-sm resize-none"
                    placeholder="Provide detailed address for invoice footer"
                    rows={2}
                    value={customerAddress}
                    onChange={e => setCustomerAddress(e.target.value)}
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1.5">GST Identification No.</label>
                  <input
                    type="text"
                    className="w-full px-3 py-2 border border-slate-300 rounded-md focus:ring-1 focus:ring-blue-500 focus:border-blue-500 outline-none text-sm font-bold shadow-sm"
                    placeholder="e.g. 22AAAAA0000A1Z5"
                    value={customerGstNo}
                    onChange={e => setCustomerGstNo(e.target.value)}
                  />
                </div>
              </div>

              <div className="flex items-center gap-2 mt-10 mb-6 border-b border-slate-100 pb-3">
                <div className="w-6 h-6 bg-slate-900 rounded flex items-center justify-center text-white">
                    <CarIcon size={14} />
                </div>
                <h2 className="text-sm font-bold text-slate-800 uppercase tracking-tight">Mission & Fleet Details</h2>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                <div>
                  <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1.5">Operator / Driver</label>
                  <input
                    type="text"
                    className="w-full px-3 py-2 border border-slate-300 rounded-md focus:ring-1 focus:ring-blue-500 focus:border-blue-500 outline-none text-sm font-semibold shadow-sm"
                    placeholder="Assigned driver"
                    value={driverName}
                    onChange={e => setDriverName(e.target.value)}
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1.5">Vehicle Plate No.</label>
                  <input
                    type="text"
                    className="w-full px-3 py-2 border border-slate-300 rounded-md focus:ring-1 focus:ring-blue-500 focus:border-blue-500 outline-none text-sm font-bold shadow-sm"
                    placeholder="TN 01 AB 1234"
                    value={vehicleNo}
                    onChange={e => setVehicleNo(e.target.value)}
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1.5">Vehicle Model / Class</label>
                  <input
                    type="text"
                    className="w-full px-3 py-2 border border-slate-300 rounded-md focus:ring-1 focus:ring-blue-500 focus:border-blue-500 outline-none text-sm font-semibold shadow-sm"
                    placeholder="e.g. Swift Dzire, Innova"
                    value={vehicleType}
                    onChange={e => setVehicleType(e.target.value)}
                  />
                </div>
                <div>
                    <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1.5">Route Start Point</label>
                    <input
                        type="text"
                        className="w-full px-3 py-2 border border-slate-300 rounded-md focus:ring-1 focus:ring-blue-500 focus:border-blue-500 outline-none text-sm font-semibold shadow-sm"
                        placeholder="Pick-up point"
                        value={tripStartLocation}
                        onChange={e => setTripStartLocation(e.target.value)}
                    />
                </div>
                <div>
                    <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1.5">Final Destination</label>
                    <input
                        type="text"
                        className="w-full px-3 py-2 border border-slate-300 rounded-md focus:ring-1 focus:ring-blue-500 focus:border-blue-500 outline-none text-sm font-semibold shadow-sm"
                        placeholder="Drop point"
                        value={tripEndLocation}
                        onChange={e => setTripEndLocation(e.target.value)}
                    />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-5 mt-8 border-t pt-8 border-slate-100">
                <div>
                  <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1.5">Opening Odometer</label>
                  <input
                    type="text"
                    inputMode="numeric"
                    className="w-full px-3 py-2 border border-slate-300 rounded-md focus:ring-1 focus:ring-blue-500 focus:border-blue-500 outline-none text-sm font-bold shadow-sm"
                    placeholder="0"
                    value={startKm || ''}
                    onChange={e => setStartKm(Number(e.target.value))}
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1.5">Closing Odometer</label>
                  <input
                    type="text"
                    inputMode="numeric"
                    className="w-full px-3 py-2 border border-slate-300 rounded-md focus:ring-1 focus:ring-blue-500 focus:border-blue-500 outline-none text-sm font-bold shadow-sm"
                    placeholder="0"
                    value={endKm || ''}
                    onChange={e => setEndKm(Number(e.target.value))}
                  />
                </div>
                <div className="col-span-2">
                  <DateTimeInput
                    label="Departure Timestamp"
                    value={startTime}
                    onChange={setStartTime}
                  />
                </div>
                <div className="col-span-2">
                  <DateTimeInput
                    label="Arrival Timestamp"
                    value={endTime}
                    onChange={setEndTime}
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1.5">Complimentary KM</label>
                  <input
                    type="text"
                    inputMode="numeric"
                    className="w-full px-3 py-2 border border-slate-300 rounded-md focus:ring-1 focus:ring-blue-500 focus:border-blue-500 outline-none text-sm font-bold shadow-sm"
                    placeholder="0"
                    value={freeKm || ''}
                    onChange={e => setFreeKm(Number(e.target.value))}
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1.5">Chargeable Mileage</label>
                  <input
                    type="number"
                    className="w-full px-3 py-2 border border-slate-200 rounded-md text-sm bg-slate-50 text-slate-600 font-bold outline-none"
                    value={chargeableKm}
                    disabled
                  />
                </div>
              </div>
            </div>

            {/* 2. Rent Calculation */}
            <div className="bg-white p-4 sm:p-6 rounded-xl border border-slate-200 shadow-sm">
              <h2 className="text-lg font-semibold mb-4 text-slate-800">Rent Calculation</h2>
              <div className="flex bg-slate-100 rounded-lg p-1 mb-4 flex-wrap gap-1">
                <button
                  className={`flex-1 sm:flex-none px-4 py-1.5 rounded-md text-sm font-medium transition-all ${rentType === 'fixed' ? 'bg-white shadow text-slate-900' : 'text-slate-500 hover:text-slate-700'}`}
                  onClick={() => setRentType('fixed')}
                >
                  Fixed
                </button>
                <button
                  className={`flex-1 sm:flex-none px-4 py-1.5 rounded-md text-sm font-medium transition-all ${rentType === 'hour' ? 'bg-white shadow text-slate-900' : 'text-slate-500 hover:text-slate-700'}`}
                  onClick={() => setRentType('hour')}
                >
                  Hour
                </button>
                <button
                  className={`flex-1 sm:flex-none px-4 py-1.5 rounded-md text-sm font-medium transition-all ${rentType === 'day' ? 'bg-white shadow text-slate-900' : 'text-slate-500 hover:text-slate-700'}`}
                  onClick={() => setRentType('day')}
                >
                  Day Rent
                </button>
                <button
                  className={`flex-1 sm:flex-none px-4 py-1.5 rounded-md text-sm font-medium transition-all ${rentType === 'km' ? 'bg-white shadow text-slate-900' : 'text-slate-500 hover:text-slate-700'}`}
                  onClick={() => setRentType('km')}
                >
                  KM
                </button>
              </div>

              {rentType === 'fixed' && (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Total Fixed Amount (₹)</label>
                    <input
                      type="text"
                      inputMode="numeric"
                      className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none text-lg font-medium"
                      placeholder="0.00"
                      value={fixedAmount || ''}
                      onChange={e => setFixedAmount(Number(e.target.value))}
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Charge per KM (₹)</label>
                    <input
                      type="text"
                      inputMode="numeric"
                      className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                      placeholder="0.00"
                      value={chargePerKmFixed || ''}
                      onChange={e => setChargePerKmFixed(Number(e.target.value))}
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Chargeable KM</label>
                    <input
                      type="text"
                      className="w-full px-3 py-2 border border-slate-300 rounded-lg bg-slate-100"
                      value={chargeableKm}
                      disabled
                    />
                  </div>
                </div>
              )}

              {rentType === 'hour' && (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Total Hours</label>
                    <input
                      type="text"
                      inputMode="numeric"
                      className="w-full px-3 py-2 border border-slate-300 rounded-lg"
                      placeholder="e.g. 8"
                      value={hours || ''}
                      onChange={e => setHours(Number(e.target.value))}
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Rate per Hour (₹)</label>
                    <input
                      type="text"
                      inputMode="numeric"
                      className="w-full px-3 py-2 border border-slate-300 rounded-lg"
                      placeholder="0.00"
                      value={ratePerHour || ''}
                      onChange={e => setRatePerHour(Number(e.target.value))}
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Charge per KM (₹)</label>
                    <input
                      type="text"
                      inputMode="numeric"
                      className="w-full px-3 py-2 border border-slate-300 rounded-lg"
                      placeholder="0.00"
                      value={chargePerKmHour || ''}
                      onChange={e => setChargePerKmHour(Number(e.target.value))}
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Chargeable KM</label>
                    <input
                      type="text"
                      className="w-full px-3 py-2 border border-slate-300 rounded-lg bg-slate-100"
                      value={chargeableKm}
                      disabled
                    />
                  </div>
                </div>
              )}

              {rentType === 'day' && (
                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-1">No of Days</label>
                      <input
                        type="text"
                        inputMode="numeric"
                        className="w-full px-3 py-2 border border-slate-300 rounded-lg"
                        placeholder="e.g. 3"
                        value={days || ''}
                        onChange={e => setDays(Number(e.target.value))}
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-1">Amount per Day (₹)</label>
                      <input
                        type="text"
                        inputMode="numeric"
                        className="w-full px-3 py-2 border border-slate-300 rounded-lg"
                        placeholder="0.00"
                        value={ratePerDay || ''}
                        onChange={e => setRatePerDay(Number(e.target.value))}
                      />
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-1">Chargeable KM</label>
                      <input
                        type="text"
                        className="w-full px-3 py-2 border border-slate-300 rounded-lg bg-slate-100"
                        value={chargeableKm}
                        disabled
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-1">Fuel Charge per KM (₹)</label>
                      <input
                        type="text"
                        inputMode="numeric"
                        className="w-full px-3 py-2 border border-slate-300 rounded-lg"
                        placeholder="0.00"
                        value={fuelChargePerKm || ''}
                        onChange={e => setFuelChargePerKm(Number(e.target.value))}
                      />
                    </div>
                  </div>
                </div>
              )}

              {rentType === 'km' && (
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Chargeable KM</label>
                    <input
                      type="text"
                      className="w-full px-3 py-2 border border-slate-300 rounded-lg bg-slate-100"
                      value={chargeableKm}
                      disabled
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Amount per KM (₹)</label>
                    <input
                      type="text"
                      inputMode="numeric"
                      className="w-full px-3 py-2 border border-slate-300 rounded-lg"
                      placeholder="0.00"
                      value={ratePerKm || ''}
                      onChange={e => setRatePerKm(Number(e.target.value))}
                    />
                  </div>
                </div>
              )}
            </div>

            {/* 3. Operational Overheads */}
            <div className="bg-white p-6 rounded-lg border border-slate-200 shadow-sm space-y-4">
              <div className="flex items-center gap-2 mb-2 border-b border-slate-100 pb-3">
                <div className="w-6 h-6 bg-slate-900 rounded flex items-center justify-center text-white">
                    <IndianRupee size={14} />
                </div>
                <h2 className="text-sm font-bold text-slate-800 uppercase tracking-tight">Overheads & Allowances</h2>
              </div>

              <div className="flex flex-wrap items-center justify-between gap-3 p-3 bg-slate-50 rounded border border-slate-100">
                <div className="flex items-center gap-3">
                  <div className={`w-8 h-4 flex items-center bg-slate-300 rounded-full p-0.5 cursor-pointer transition-colors shadow-inner ${enableDriverBeta ? 'bg-blue-600' : ''}`} onClick={() => setEnableDriverBeta(!enableDriverBeta)}>
                    <div className={`bg-white w-3 h-3 rounded-full shadow transform transition-transform ${enableDriverBeta ? 'translate-x-4' : ''}`}></div>
                  </div>
                  <span className="text-xs font-bold text-slate-700 uppercase tracking-tight">Driver Beta</span>
                </div>
                {enableDriverBeta && (
                  <div className="flex gap-2 w-full sm:w-auto">
                    <input
                      type="text"
                      inputMode="numeric"
                      placeholder="Days"
                      className="flex-1 sm:w-20 px-3 py-1.5 border border-slate-300 rounded text-xs font-bold shadow-sm"
                      value={driverBetaDays || ''}
                      onChange={e => setDriverBetaDays(Number(e.target.value))}
                    />
                    <input
                      type="text"
                      inputMode="numeric"
                      placeholder="₹/day"
                      className="flex-1 sm:w-24 px-3 py-1.5 border border-slate-300 rounded text-xs font-bold shadow-sm"
                      value={driverBetaAmountPerDay || ''}
                      onChange={e => setDriverBetaAmountPerDay(Number(e.target.value))}
                    />
                  </div>
                )}
              </div>

              <div className="flex flex-wrap items-center justify-between gap-3 p-3 bg-slate-50 rounded border border-slate-100">
                <div className="flex items-center gap-3">
                  <div className={`w-8 h-4 flex items-center bg-slate-300 rounded-full p-0.5 cursor-pointer transition-colors shadow-inner ${enableNightHalt ? 'bg-blue-600' : ''}`} onClick={() => setEnableNightHalt(!enableNightHalt)}>
                    <div className={`bg-white w-3 h-3 rounded-full shadow transform transition-transform ${enableNightHalt ? 'translate-x-4' : ''}`}></div>
                  </div>
                  <span className="text-xs font-bold text-slate-700 uppercase tracking-tight">Night Halt / Outstation</span>
                </div>
                {enableNightHalt && (
                  <div className="flex gap-2 w-full sm:w-auto">
                    <input
                      type="text"
                      inputMode="numeric"
                      placeholder="Days"
                      className="flex-1 sm:w-20 px-3 py-1.5 border border-slate-300 rounded text-xs font-bold shadow-sm"
                      value={nightHaltDays || ''}
                      onChange={e => setNightHaltDays(Number(e.target.value))}
                    />
                    <input
                      type="text"
                      inputMode="numeric"
                      placeholder="₹/day"
                      className="flex-1 sm:w-24 px-3 py-1.5 border border-slate-300 rounded text-xs font-bold shadow-sm"
                      value={nightHaltAmountPerDay || ''}
                      onChange={e => setNightHaltAmountPerDay(Number(e.target.value))}
                    />
                  </div>
                )}
              </div>
            </div>

            {/* 4. Miscellaneous Costs */}
            <div className="bg-white p-6 rounded-lg border border-slate-200 shadow-sm">
              <div className="flex justify-between items-center mb-6 border-b border-slate-100 pb-3">
                <div className="flex items-center gap-2">
                    <div className="w-6 h-6 bg-slate-900 rounded flex items-center justify-center text-white">
                        <Plus size={14} />
                    </div>
                    <h2 className="text-sm font-bold text-slate-800 uppercase tracking-tight">Sundry Expenses</h2>
                </div>
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Toll, Parking, Permit</span>
              </div>

              <div className="flex gap-2 mb-6">
                <input
                  type="text"
                  placeholder="e.g. Toll Charges"
                  className="flex-1 min-w-0 px-3 py-2 border border-slate-300 rounded text-sm font-semibold shadow-sm outline-none focus:ring-1 focus:ring-blue-500"
                  value={newCostLabel}
                  onChange={e => setNewCostLabel(e.target.value)}
                />
                <input
                  type="text"
                  inputMode="numeric"
                  placeholder="₹ 0.00"
                  className="w-24 sm:w-32 px-3 py-2 border border-slate-300 rounded text-sm font-bold shadow-sm outline-none focus:ring-1 focus:ring-blue-500"
                  value={newCostAmount}
                  onChange={e => setNewCostAmount(e.target.value)}
                />
                <button
                  onClick={addCost}
                  className="bg-slate-900 hover:bg-black text-white px-4 rounded font-bold shadow-sm transition-all"
                >
                  Add
                </button>
              </div>

              {additionalCosts.length > 0 ? (
                <ul className="space-y-2">
                  {additionalCosts.map(cost => (
                    <li key={cost.id} className="flex justify-between items-center bg-slate-50 px-4 py-2.5 rounded border border-slate-200">
                      <span className="text-xs font-bold text-slate-700 uppercase tracking-tight">{cost.label}</span>
                      <div className="flex items-center gap-4">
                        <span className="font-bold text-slate-900">₹ {cost.amount.toLocaleString()}</span>
                        <button onClick={() => removeCost(cost.id)} className="text-slate-300 hover:text-red-500 transition-colors">
                          <Trash2 size={16} />
                        </button>
                      </div>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="text-sm text-slate-400 italic">No additional costs added.</p>
              )}
            </div>

            {/* 4. Financial Adjustments */}
            <div className="bg-white p-6 rounded-lg border border-slate-200 shadow-sm space-y-4">
               <div className="flex items-center gap-2 mb-2 border-b border-slate-100 pb-3">
                <div className="w-6 h-6 bg-slate-900 rounded flex items-center justify-center text-white">
                    <IndianRupee size={14} />
                </div>
                <h2 className="text-sm font-bold text-slate-800 uppercase tracking-tight">Taxes & Adjustments</h2>
              </div>

              <div className="flex flex-wrap items-center justify-between gap-3 p-3 bg-slate-50 rounded border border-slate-100">
                <div className="flex items-center gap-3">
                  <div className={`w-8 h-4 flex items-center bg-slate-300 rounded-full p-0.5 cursor-pointer transition-colors shadow-inner ${enableDiscount ? 'bg-blue-600' : ''}`} onClick={() => setEnableDiscount(!enableDiscount)}>
                    <div className={`bg-white w-3 h-3 rounded-full shadow transform transition-transform ${enableDiscount ? 'translate-x-4' : ''}`}></div>
                  </div>
                  <span className="text-xs font-bold text-slate-700 uppercase tracking-tight">Cash Discount</span>
                </div>
                {enableDiscount && (
                  <input
                    type="text"
                    inputMode="numeric"
                    placeholder="₹ 0.00"
                    className="w-32 px-3 py-1.5 border border-slate-300 rounded text-xs font-bold shadow-sm outline-none focus:ring-1 focus:ring-blue-500"
                    value={discountAmount || ''}
                    onChange={e => setDiscountAmount(Number(e.target.value))}
                  />
                )}
              </div>

              <div className="flex flex-wrap items-center justify-between gap-3 p-3 bg-slate-50 rounded border border-slate-100">
                <div className="flex items-center gap-3">
                  <div className={`w-8 h-4 flex items-center bg-slate-300 rounded-full p-0.5 cursor-pointer transition-colors shadow-inner ${enableGst ? 'bg-blue-600' : ''}`} onClick={() => { setEnableGst(!enableGst); if (!enableGst) setEnableIgst(false); }}>
                    <div className={`bg-white w-3 h-3 rounded-full shadow transform transition-transform ${enableGst ? 'translate-x-4' : ''}`}></div>
                  </div>
                  <span className="text-xs font-bold text-slate-700 uppercase tracking-tight">GST (CGST/SGST)</span>
                </div>
                {enableGst && (
                  <div className="flex items-center gap-2">
                    <input
                      type="text"
                      inputMode="numeric"
                      placeholder="%"
                      className="w-20 px-3 py-1.5 border border-slate-300 rounded text-xs font-bold shadow-sm outline-none focus:ring-1 focus:ring-blue-500"
                      value={gstPercentage || ''}
                      onChange={e => setGstPercentage(Number(e.target.value))}
                    />
                    <span className="text-sm text-slate-500">%</span>
                  </div>
                )}
              </div>

              <div className="flex flex-wrap items-center justify-between gap-3 p-3 bg-slate-50 rounded border border-slate-100">
                <div className="flex items-center gap-3">
                  <div className={`w-8 h-4 flex items-center bg-slate-300 rounded-full p-0.5 cursor-pointer transition-colors shadow-inner ${enableIgst ? 'bg-blue-600' : ''}`} onClick={() => { setEnableIgst(!enableIgst); if (!enableIgst) setEnableGst(false); }}>
                    <div className={`bg-white w-3 h-3 rounded-full shadow transform transition-transform ${enableIgst ? 'translate-x-4' : ''}`}></div>
                  </div>
                  <span className="text-xs font-bold text-slate-700 uppercase tracking-tight">IGST (Inter-state)</span>
                </div>
                {enableIgst && (
                  <div className="flex items-center gap-2">
                    <input
                      type="text"
                      inputMode="numeric"
                      placeholder="%"
                      className="w-20 px-3 py-1.5 border border-slate-300 rounded text-xs font-bold shadow-sm outline-none focus:ring-1 focus:ring-blue-500"
                      value={igstPercentage || ''}
                      onChange={e => setIgstPercentage(Number(e.target.value))}
                    />
                    <span className="text-sm text-slate-500">%</span>
                  </div>
                )}
              </div>

              <div className="flex flex-wrap items-center justify-between gap-3 p-4 bg-blue-50/50 rounded-lg border border-blue-100">
                <label className="text-xs font-bold text-blue-900 uppercase tracking-tight">Token / Advance (₹)</label>
                <input
                  type="text"
                  inputMode="numeric"
                  placeholder="₹ 0.00"
                  className="w-32 px-3 py-1.5 border border-blue-200 rounded text-xs font-bold shadow-sm outline-none focus:ring-1 focus:ring-blue-600 bg-white"
                  value={advance || ''}
                  onChange={e => setAdvance(Number(e.target.value))}
                />
              </div>
            </div>

          </div>

          {/* Bill Summary Sidebar */}
          <div className="lg:col-span-1">
            <div className="bg-slate-900 text-white rounded-lg shadow-xl lg:sticky lg:top-6 overflow-hidden border border-slate-800">
               <div className="p-6 border-b border-slate-800 bg-slate-800/50">
                <h3 className="text-xs font-bold uppercase tracking-widest text-slate-400">Financial Abstract</h3>
               </div>

              <div className="p-6 space-y-4">
                <div className="space-y-3 text-xs font-semibold border-b border-slate-800 pb-4">
                    <div className="flex justify-between text-slate-400">
                      <span className="uppercase tracking-tight">Main Rent</span>
                      <span>₹ {rentTotal.toLocaleString()}</span>
                    </div>
                    {additionalCosts.map(cost => (
                    <div key={cost.id} className="flex justify-between text-slate-400">
                        <span className="uppercase tracking-tight">{cost.label}</span>
                        <span>₹ {cost.amount.toLocaleString()}</span>
                    </div>
                    ))}
                    {(enableDriverBeta || enableNightHalt) && (
                        <div className="space-y-2 pt-1">
                            {enableDriverBeta && (
                                <div className="flex justify-between text-slate-400 italic">
                                    <span>Driver Allowance ({driverBetaDays}d)</span>
                                    <span>₹ {driverBetaTotal.toLocaleString()}</span>
                                </div>
                            )}
                            {enableNightHalt && (
                                <div className="flex justify-between text-slate-400 italic">
                                    <span>Halt Charges ({nightHaltDays}d)</span>
                                    <span>₹ {nightHaltTotal.toLocaleString()}</span>
                                </div>
                            )}
                        </div>
                    )}
                </div>

                <div className="space-y-3 py-2">
                    <div className="flex justify-between text-sm font-bold text-white">
                        <span className="uppercase tracking-tight">Subtotal</span>
                        <span>₹ {subtotal.toLocaleString()}</span>
                    </div>

                    {enableDiscount && (
                        <div className="flex justify-between text-emerald-400 text-xs font-bold">
                            <span className="uppercase tracking-tight">Cash Discount</span>
                            <span>- ₹ {discountAmount.toLocaleString()}</span>
                        </div>
                    )}
                    
                    {enableGst && (
                        <div className="flex justify-between text-slate-400 text-xs font-bold">
                            <span className="uppercase tracking-tight">GST ({gstPercentage}%)</span>
                            <span>₹ {gstAmount.toLocaleString()}</span>
                        </div>
                    )}
                    {enableIgst && (
                        <div className="flex justify-between text-slate-400 text-xs font-bold">
                            <span className="uppercase tracking-tight">IGST ({igstPercentage}%)</span>
                            <span>₹ {igstAmount.toLocaleString()}</span>
                        </div>
                    )}
                    {advance > 0 && (
                        <div className="flex justify-between text-orange-400 text-xs font-bold">
                            <span className="uppercase tracking-tight">Token Advance</span>
                            <span>- ₹ {advance.toLocaleString()}</span>
                        </div>
                    )}
                </div>

                <div className="pt-6 border-t border-slate-800">
                    <div className="bg-slate-800/50 p-4 rounded border border-slate-700">
                        <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1">Total Receivable</p>
                        <p className="text-3xl font-bold tracking-tight">₹ {totalBill.toLocaleString()}</p>
                    </div>
                </div>

                <div className="pt-6 space-y-3">
                    <button
                        onClick={handlePreviewInvoice}
                        disabled={uploading || driveLoading}
                        className="w-full py-3 bg-white text-slate-900 rounded font-bold text-xs uppercase tracking-widest hover:bg-slate-100 transition-all flex items-center justify-center gap-2 shadow-sm disabled:opacity-50"
                    >
                        <Eye size={16} />
                        Preview Bill
                    </button>
                    <button
                        onClick={handleGenerateInvoice}
                        disabled={uploading || driveLoading}
                        className="w-full py-4 bg-blue-600 hover:bg-blue-700 text-white rounded font-bold text-sm uppercase tracking-widest transition-all flex items-center justify-center gap-2 shadow-lg shadow-blue-900/40 disabled:opacity-50"
                    >
                        {uploading || driveLoading ? (
                            <>
                                <Loader2 size={18} className="animate-spin" />
                                {isSignedIn ? 'Processing...' : 'Syncing...'}
                            </>
                        ) : (
                            <>
                                <Printer size={18} />
                                Generate & Sync
                            </>
                        )}
                    </button>
                </div>
              </div>
            </div>
          </div>
        </div>
        )}
      </div>
    </div>
  );
}
