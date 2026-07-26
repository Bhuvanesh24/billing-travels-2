import { 
  collection, 
  addDoc, 
  updateDoc, 
  deleteDoc, 
  doc, 
  getDocs, 
  getDoc,
  query,
  where,
  limit
} from 'firebase/firestore';
import { db } from './firestore';

export interface Trip {
  id?: string;
  customerId: string;
  driverId: string;
  carId: string;
  vendorId?: string;
  vendorName?: string;
  startKm: number;
  startTime: string;
  tripStartLocation: string;
  status: 'ongoing' | 'completed';
  advanceAmount?: number;
  
  // These are filled when ending the trip
  endKm?: number;
  endTime?: string;
  tripEndLocation?: string;
  additionalCosts?: { id: string; label: string; amount: number }[];
  invoiceId?: string;
  totalBill?: number;
  
  // Snapshot of Master data at start time (to prevent issues if master is edited later)
  customerName?: string;
  driverName?: string;
  vehicleNo?: string;
  
  createdAt?: string;
  completedAt?: string;
}

const COLLECTION_NAME = 'trips';

export const tripService = {
  async getOngoingTrips() {
    const q = query(
      collection(db, COLLECTION_NAME), 
      where('status', '==', 'ongoing')
    );
    const snap = await getDocs(q);
    return snap.docs
      .map(d => ({ id: d.id, ...d.data() } as Trip))
      .sort((a, b) => new Date(a.startTime).getTime() - new Date(b.startTime).getTime());
  },

  async getAllTrips() {
    const q = query(collection(db, COLLECTION_NAME));
    const snap = await getDocs(q);
    return snap.docs
      .map(d => ({ id: d.id, ...d.data() } as Trip))
      .sort((a, b) => new Date(a.startTime).getTime() - new Date(b.startTime).getTime());
  },

  async getTripHistory(limitCount: number = 20) {
    const q = query(
      collection(db, COLLECTION_NAME),
      limit(limitCount * 2) // Fetch a bit more to ensure we have enough after possible filtering
    );
    const snap = await getDocs(q);
    return snap.docs
      .map(d => ({ id: d.id, ...d.data() } as Trip))
      .sort((a, b) => new Date(a.startTime).getTime() - new Date(b.startTime).getTime())
      .slice(0, limitCount);
  },

  async startTrip(data: Omit<Trip, 'status'>) {
    return await addDoc(collection(db, COLLECTION_NAME), {
      ...data,
      status: 'ongoing',
      createdAt: new Date().toISOString()
    });
  },

  async endTrip(id: string, updateData: Partial<Trip>) {
    const ref = doc(db, COLLECTION_NAME, id);
    return await updateDoc(ref, {
      ...updateData,
      status: 'completed',
      completedAt: new Date().toISOString()
    });
  },

  async updateTrip(id: string, updateData: Partial<Trip>) {
    const ref = doc(db, COLLECTION_NAME, id);
    return await updateDoc(ref, updateData);
  },

  async deleteTrip(id: string) {
    return await deleteDoc(doc(db, COLLECTION_NAME, id));
  },

  async getTripById(id: string) {
    const ref = doc(db, COLLECTION_NAME, id);
    const snap = await getDoc(ref);
    return snap.exists() ? ({ id: snap.id, ...snap.data() } as Trip) : null;
  },

  async getCompletedTripsWithoutInvoice() {
    const q = query(
      collection(db, COLLECTION_NAME),
      where('status', '==', 'completed')
    );
    const snap = await getDocs(q);
    // Client-side filter for those without invoiceId
    return snap.docs
      .map(d => ({ id: d.id, ...d.data() } as Trip))
      .filter(t => !t.invoiceId)
      .sort((a, b) => new Date(a.startTime).getTime() - new Date(b.startTime).getTime());
  }
};
