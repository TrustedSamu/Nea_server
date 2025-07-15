import { collection, addDoc, getDocs, query, where, doc, updateDoc, deleteDoc } from 'firebase/firestore';
import { db } from './firebase.js';

export const addEmployee = async (employee) => {
  try {
    const docRef = await addDoc(collection(db, 'employees'), {
      ...employee,
      isActive: true,
    });
    return docRef.id;
  } catch (error) {
    console.error('Error adding employee:', error);
    throw error;
  }
};

export const getEmployees = async () => {
  try {
    const querySnapshot = await getDocs(collection(db, 'employees'));
    return querySnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));
  } catch (error) {
    console.error('Error getting employees:', error);
    throw error;
  }
};

export const updateEmployee = async (id, updates) => {
  try {
    const employeeRef = doc(db, 'employees', id);
    await updateDoc(employeeRef, updates);
  } catch (error) {
    console.error('Error updating employee:', error);
    throw error;
  }
};

export const deleteEmployee = async (id) => {
  try {
    const employeeRef = doc(db, 'employees', id);
    await deleteDoc(employeeRef);
  } catch (error) {
    console.error('Error deleting employee:', error);
    throw error;
  }
};

// Sample employee data for initial population
export const sampleEmployees = [
  {
    name: "Anna Schmidt",
    position: "HR Manager",
    department: "Human Resources",
    email: "a.schmidt@nea-gmbh.de",
    phoneNumber: "+49 176 1234 5671",
    startDate: "2020-01-15",
    isActive: true
  },
  {
    name: "Thomas Müller",
    position: "Senior Developer",
    department: "IT",
    email: "t.mueller@nea-gmbh.de",
    phoneNumber: "+49 176 1234 5672",
    startDate: "2019-03-20",
    isActive: true
  },
  {
    name: "Maria Weber",
    position: "Marketing Specialist",
    department: "Marketing",
    email: "m.weber@nea-gmbh.de",
    phoneNumber: "+49 176 1234 5673",
    startDate: "2021-06-10",
    isActive: true
  },
  {
    name: "Lars Fischer",
    position: "Sales Manager",
    department: "Sales",
    email: "l.fischer@nea-gmbh.de",
    phoneNumber: "+49 176 1234 5674",
    startDate: "2018-09-01",
    isActive: true
  },
  {
    name: "Sophie Wagner",
    position: "Product Manager",
    department: "Product",
    email: "s.wagner@nea-gmbh.de",
    phoneNumber: "+49 176 1234 5675",
    startDate: "2020-11-15",
    isActive: true
  }
]; 