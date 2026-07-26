import { 
  collection, 
  addDoc, 
  updateDoc, 
  deleteDoc, 
  doc, 
  getDocs,
  query,
  orderBy,
  where
} from 'firebase/firestore';
import { db } from './firestore';

export interface VendorBill {
  id?: string;
  vendorId: string;
  vendorName: string;
  tripId: string;
  invoiceNumber: string; // The vendor's invoice number
  amount: number;
  date: string;
  status: 'pending' | 'paid';
  paymentDate?: string;
  paymentMode?: string;
  notes?: string;
  createdAt?: string;
}

const COLLECTION_NAME = 'vendor_bills';

export const vendorBillService = {
  async getBills() {
    const q = query(collection(db, COLLECTION_NAME), orderBy('date', 'desc'));
    const snapshot = await getDocs(q);
    return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as VendorBill));
  },

  async getBillsByVendor(vendorId: string) {
    const q = query(collection(db, COLLECTION_NAME), where('vendorId', '==', vendorId));
    const snapshot = await getDocs(q);
    return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as VendorBill));
  },

  async addBill(bill: Omit<VendorBill, 'id'>) {
    return await addDoc(collection(db, COLLECTION_NAME), {
      ...bill,
      createdAt: new Date().toISOString()
    });
  },

  async updateBill(id: string, bill: Partial<VendorBill>) {
    const ref = doc(db, COLLECTION_NAME, id);
    return await updateDoc(ref, bill);
  },

  async deleteBill(id: string) {
    const ref = doc(db, COLLECTION_NAME, id);
    return await deleteDoc(ref);
  }
};
