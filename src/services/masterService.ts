import { 
  collection, 
  addDoc, 
  updateDoc, 
  deleteDoc, 
  doc, 
  getDocs,
  query,
  orderBy
} from 'firebase/firestore';
import { db } from './firestore';

export interface Driver {
  id?: string;
  name: string;
  phone: string;
  license: string;
  address: string;
  status: 'active' | 'inactive';
  createdAt?: string;
}

export interface Car {
  id?: string;
  regNo: string;
  model: string;
  type: string;
  ownerName?: string;
  fuelType?: string;
  lastServiceDate?: string;
  createdAt?: string;
}

export interface Customer {
  id?: string;
  name: string;
  companyName: string;
  address: string;
  phone: string;
  email: string;
  gstNo: string;
  createdAt?: string;
}

const COLLECTIONS = {
  DRIVERS: 'drivers',
  CARS: 'cars',
  CUSTOMERS: 'customers'
};

// Generic CRUD operations
export const masterService = {
  // --- Drivers ---
  async getDrivers() {
    const q = query(collection(db, COLLECTIONS.DRIVERS), orderBy('name'));
    const snap = await getDocs(q);
    return snap.docs.map(d => ({ id: d.id, ...d.data() } as Driver));
  },
  async addDriver(data: Driver) {
    return await addDoc(collection(db, COLLECTIONS.DRIVERS), {
      ...data,
      createdAt: new Date().toISOString()
    });
  },
  async updateDriver(id: string, data: Partial<Driver>) {
    const ref = doc(db, COLLECTIONS.DRIVERS, id);
    return await updateDoc(ref, data);
  },
  async deleteDriver(id: string) {
    return await deleteDoc(doc(db, COLLECTIONS.DRIVERS, id));
  },

  // --- Cars ---
  async getCars() {
    const q = query(collection(db, COLLECTIONS.CARS), orderBy('regNo'));
    const snap = await getDocs(q);
    return snap.docs.map(d => ({ id: d.id, ...d.data() } as Car));
  },
  async addCar(data: Car) {
    return await addDoc(collection(db, COLLECTIONS.CARS), {
      ...data,
      createdAt: new Date().toISOString()
    });
  },
  async updateCar(id: string, data: Partial<Car>) {
    const ref = doc(db, COLLECTIONS.CARS, id);
    return await updateDoc(ref, data);
  },
  async deleteCar(id: string) {
    return await deleteDoc(doc(db, COLLECTIONS.CARS, id));
  },

  // --- Customers ---
  async getCustomers() {
    const q = query(collection(db, COLLECTIONS.CUSTOMERS), orderBy('name'));
    const snap = await getDocs(q);
    return snap.docs.map(d => ({ id: d.id, ...d.data() } as Customer));
  },
  async addCustomer(data: Customer) {
    return await addDoc(collection(db, COLLECTIONS.CUSTOMERS), {
      ...data,
      createdAt: new Date().toISOString()
    });
  },
  async updateCustomer(id: string, data: Partial<Customer>) {
    const ref = doc(db, COLLECTIONS.CUSTOMERS, id);
    return await updateDoc(ref, data);
  },
  async deleteCustomer(id: string) {
    return await deleteDoc(doc(db, COLLECTIONS.CUSTOMERS, id));
  }
};
