import { initializeApp } from 'firebase/app';
import {
  getFirestore,
  doc,
  updateDoc,
  collection,
  getDocs,
  query,
  where,
  addDoc,
  orderBy,
  getDoc,
  setDoc,
  onSnapshot
} from 'firebase/firestore';

const firebaseConfig = {
  apiKey: "AIzaSyCYxOCWe7KDnf8nyWnhQjepxF1bPQ7Resc",
  authDomain: "nea-gourmet.firebaseapp.com",
  projectId: "nea-gourmet",
  storageBucket: "nea-gourmet.firebasestorage.app",
  messagingSenderId: "797866243337",
  appId: "1:797866243337:web:f8e2b862b6f6fe2ae34fd8"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

interface AbsenceInfo {
  isKrank: boolean;
  reason?: string;
  reportedAt?: string;
}

interface MailLog {
  to: string;
  subject: string;
  body: string;
  sentAt: string;
  status: 'success' | 'failed';
}

interface NotificationSettings {
  notificationEmail: string;
}

export async function updateEmployeeStatus(employeeName: string, absenceInfo: AbsenceInfo) {
  try {
    const employeesRef = collection(db, 'employees');
    const querySnapshot = await getDocs(employeesRef);
    
    let targetDoc = null;
    let employeeData = null;
    for (const doc of querySnapshot.docs) {
      const data = doc.data();
      if (data.name === employeeName) {
        targetDoc = doc;
        employeeData = data;
        break;
      }
    }

    if (!targetDoc) {
      console.error('Employee not found:', employeeName);
      return false;
    }

    // If marking as present (not krank), remove absence info
    if (!absenceInfo.isKrank) {
      await updateDoc(targetDoc.ref, {
        'krank': false,
        'absenceReason': '',
        'reportedAt': ''
      });
    } else {
      const reportedAt = absenceInfo.reportedAt || new Date().toISOString();
      await updateDoc(targetDoc.ref, {
        'krank': absenceInfo.isKrank,
        'absenceReason': absenceInfo.reason || '',
        'reportedAt': reportedAt
      });
    }
    
    return true;
  } catch (error) {
    console.error('Error updating employee status:', error);
    return false;
  }
}

export async function markEmployeeAsPresent(employeeName: string) {
  return updateEmployeeStatus(employeeName, { isKrank: false });
}

export async function getAbsentEmployees() {
  try {
    const employeesRef = collection(db, 'employees');
    const querySnapshot = await getDocs(employeesRef);
    
    const absentEmployees = [];
    for (const doc of querySnapshot.docs) {
      const data = doc.data();
      if (data.krank) {
        absentEmployees.push({
          name: data.name,
          position: data.position || 'Mitarbeiter',
          reason: data.absenceReason || 'Keine Angabe',
          reportedAt: data.reportedAt || 'Keine Angabe',
        });
      }
    }
    
    return absentEmployees;
  } catch (error) {
    console.error('Error fetching absent employees:', error);
    return [];
  }
}

export const updateNotificationEmail = async (email: string) => {
  try {
    const settingsRef = doc(db, 'settings', 'notifications');
    await setDoc(settingsRef, { notificationEmail: email }, { merge: true });
    return true;
  } catch (error) {
    console.error('Error updating notification email:', error);
    return false;
  }
};

export const updateBotPrompt = async (prompt: string) => {
  try {
    const settingsRef = doc(db, 'settings', 'bot');
    await setDoc(settingsRef, { systemPrompt: prompt }, { merge: true });
    return true;
  } catch (error) {
    console.error('Error updating bot prompt:', error);
    return false;
  }
};

export const getNotificationSettings = async () => {
  try {
    const settingsRef = doc(db, 'settings', 'notifications');
    const settingsSnap = await getDoc(settingsRef);
    return settingsSnap.data() || { notificationEmail: '' };
  } catch (error) {
    console.error('Error getting notification settings:', error);
    return { notificationEmail: '' };
  }
};

export const logEmail = async (emailData: {
  to: string;
  subject: string;
  body: string;
  sentAt: string;
  status: 'success' | 'failed';
}) => {
  try {
    await addDoc(collection(db, 'mailLogs'), emailData);
    return true;
  } catch (error) {
    console.error('Error logging email:', error);
    return false;
  }
};

export { db }; 