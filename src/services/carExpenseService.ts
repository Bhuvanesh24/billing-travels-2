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

export interface CarExpense {
  id?: string;
  carId: string;
  date: string;
  category: 'service' | 'repair' | 'fuel' | 'insurance' | 'tax' | 'other';
  label: string;
  amount: number;
  notes?: string;
  createdAt?: string;
}

const COLLECTION_NAME = 'car_expenses';

export const carExpenseService = {
  async getExpensesByCar(carId: string) {
    const q = query(
      collection(db, COLLECTION_NAME), 
      where('carId', '==', carId)
    );
    const snap = await getDocs(q);
    return snap.docs
      .map(d => ({ id: d.id, ...d.data() } as CarExpense))
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  },

  async getAllExpenses() {
    const q = query(collection(db, COLLECTION_NAME), orderBy('date', 'desc'));
    const snap = await getDocs(q);
    return snap.docs.map(d => ({ id: d.id, ...d.data() } as CarExpense));
  },

  async addExpense(data: CarExpense) {
    return await addDoc(collection(db, COLLECTION_NAME), {
      ...data,
      createdAt: new Date().toISOString()
    });
  },

  async updateExpense(id: string, data: Partial<CarExpense>) {
    const ref = doc(db, COLLECTION_NAME, id);
    return await updateDoc(ref, data);
  },

  async deleteExpense(id: string) {
    return await deleteDoc(doc(db, COLLECTION_NAME, id));
  }
};
