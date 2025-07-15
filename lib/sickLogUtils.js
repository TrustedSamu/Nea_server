import { collection, addDoc, getDocs, query, where, doc, updateDoc, deleteDoc } from 'firebase/firestore';
import { db } from './firebase.js';
import { sampleEmployees } from './employeeUtils.js';

// Global event emitter for chart data updates
const chartDataListeners = [];

export function subscribeToChartData(listener) {
  chartDataListeners.push(listener);
  return () => {
    const index = chartDataListeners.indexOf(listener);
    if (index > -1) {
      chartDataListeners.splice(index, 1);
    }
  };
}

export function updateChartData(data, title) {
  chartDataListeners.forEach(listener => listener({ data, title }));
}

// Base date for sample data: 29.06.2025
const BASE_DATE = new Date('2025-06-29T10:00:00Z');

// Helper function to check if a date is today
const isToday = (dateStr) => {
  const date = new Date(dateStr);
  const today = new Date();
  return date.getDate() === today.getDate() &&
    date.getMonth() === today.getMonth() &&
    date.getFullYear() === today.getFullYear();
};

// Check if an employee has already reported sick today
export const hasReportedSickToday = async (name) => {
  try {
    const sicklogsRef = collection(db, 'sicklogs');
    const querySnapshot = await getDocs(query(sicklogsRef, where('name', '==', name)));
    
    // Check all sick logs for this employee
    for (const doc of querySnapshot.docs) {
      const data = doc.data();
      if (data.status === 'active' && isToday(data.reportedAt)) {
        return true;
      }
    }
    
    return false;
  } catch (error) {
    console.error('Error checking if employee reported sick today:', error);
    throw error;
  }
};

// Create a new sick log entry
export const reportSick = async (name, reason) => {
  try {
    // First check if already reported today
    const alreadyReported = await hasReportedSickToday(name);
    if (alreadyReported) {
      return {
        success: false,
        message: `${name} hat sich heute bereits krank gemeldet.`
      };
    }

    // Create new sick log
    const newSickLog = {
      name,
      reason: reason || 'Keine Angabe',
      reportedAt: new Date().toISOString(),
      status: 'active'
    };

    await addDoc(collection(db, 'sicklogs'), newSickLog);

    return {
      success: true,
      message: `Krankmeldung für ${name} wurde erfolgreich gespeichert.`
    };
  } catch (error) {
    console.error('Error reporting sick:', error);
    return {
      success: false,
      message: 'Ein Fehler ist aufgetreten bei der Krankmeldung.'
    };
  }
};

export const getSickLogs = async () => {
  try {
    const querySnapshot = await getDocs(collection(db, 'sicklogs'));
    return querySnapshot.docs
      .map(doc => ({
        id: doc.id,
        ...doc.data()
      }))
      .filter(log => log.status === 'active');
  } catch (error) {
    console.error('Error getting sick logs:', error);
    throw error;
  }
};

export async function calculateSickLeaveStats(
  startDate,
  endDate,
  groupBy = 'day'
) {
  const sickLogsRef = collection(db, 'sicklogs');
  const q = query(
    sickLogsRef,
    where('reportedAt', '>=', startDate.toISOString()),
    where('reportedAt', '<=', endDate.toISOString())
  );

  const snapshot = await getDocs(q);
  const logs = snapshot.docs.map(doc => doc.data());

  const grouped = new Map();
  
  logs.forEach(log => {
    const date = new Date(log.reportedAt);
    let groupKey;

    switch (groupBy) {
      case 'month':
        groupKey = new Intl.DateTimeFormat('de-DE', { 
          month: 'long',
          year: 'numeric'
        }).format(date);
        break;
      case 'week':
        const weekNum = getWeekNumber(date);
        groupKey = `KW ${weekNum}, ${date.getFullYear()}`;
        break;
      default: // day
        groupKey = new Intl.DateTimeFormat('de-DE', {
          day: '2-digit',
          month: '2-digit',
          year: 'numeric'
        }).format(date);
    }

    grouped.set(groupKey, (grouped.get(groupKey) || 0) + 1);
  });

  return Array.from(grouped.entries())
    .map(([name, value]) => ({
      name,
      value
    }))
    .sort((a, b) => a.name.localeCompare(b.name));
}

function getWeekNumber(date) {
  const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
  const dayNum = d.getUTCDay() || 7;
  d.setUTCDate(d.getUTCDate() + 4 - dayNum);
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  return Math.ceil((((d.getTime() - yearStart.getTime()) / 86400000) + 1) / 7);
}

export function parseDateRange(input) {
  console.log('Attempting to parse date input:', input);

  // Try to match "Monat Jahr" format first (e.g., "August 2025")
  const monthYearRegex = /^([A-Za-zä]+)\s+(\d{4})$/;
  const monthYearMatch = input.match(monthYearRegex);
  if (monthYearMatch) {
    console.log('Matched month-year format:', monthYearMatch[1], monthYearMatch[2]);
    return parseGermanMonth(input);
  }

  // Try to match date range (e.g., "28.06.2025 - 30.06.2025" or "28-30.06.2025")
  const dateRangeRegex = /^(\d{1,2}\.?\d{1,2}\.?\d{4})\s*-\s*(\d{1,2}\.?\d{1,2}\.?\d{4})$/;
  const shortRangeRegex = /^(\d{1,2})\s*-\s*(\d{1,2})\.(\d{1,2})\.(\d{4})$/;
  
  const dateRangeMatch = input.match(dateRangeRegex);
  const shortRangeMatch = input.match(shortRangeRegex);

  if (dateRangeMatch) {
    const [_, startDateStr, endDateStr] = dateRangeMatch;
    const startDate = parseGermanDate(startDateStr);
    const endDate = parseGermanDate(endDateStr);
    endDate.setHours(23, 59, 59, 999);
    return { startDate, endDate };
  }

  if (shortRangeMatch) {
    const [_, startDay, endDay, month, year] = shortRangeMatch;
    const startDate = new Date(parseInt(year), parseInt(month) - 1, parseInt(startDay));
    const endDate = new Date(parseInt(year), parseInt(month) - 1, parseInt(endDay), 23, 59, 59, 999);
    return { startDate, endDate };
  }

  // Try single date (e.g., "29.06.2025" or "2025-06-29")
  try {
    const date = parseGermanDate(input);
    const startDate = new Date(date);
    startDate.setHours(0, 0, 0, 0);
    const endDate = new Date(date);
    endDate.setHours(23, 59, 59, 999);
    return { startDate, endDate };
  } catch (error) {
    throw new Error(
      'Ungültiges Datumsformat. Bitte verwenden Sie eines der folgenden Formate:\n' +
      '- Monat und Jahr (z.B. "August 2025")\n' +
      '- Einzelnes Datum (z.B. "29.06.2025" oder "2025-06-29")\n' +
      '- Datumsbereich (z.B. "28.06.2025 - 30.06.2025" oder "28-30.06.2025")'
    );
  }
}

function parseGermanMonth(monthYear) {
  const [month, year] = monthYear.split(' ');
  const monthMap = {
    'Januar': 0, 'Februar': 1, 'März': 2, 'April': 3, 'Mai': 4, 'Juni': 5,
    'Juli': 6, 'August': 7, 'September': 8, 'Oktober': 9, 'November': 10, 'Dezember': 11
  };

  if (!month || !year) {
    throw new Error('Ungültiges Datumsformat. Bitte geben Sie Monat und Jahr an (z.B. "August 2025").');
  }

  const monthIndex = monthMap[month];
  if (monthIndex === undefined) {
    throw new Error(`Ungültiger Monatsname "${month}". Gültige Monate sind: ${Object.keys(monthMap).join(', ')}`);
  }

  const yearNum = parseInt(year);
  if (isNaN(yearNum)) {
    throw new Error(`Ungültiges Jahr "${year}". Bitte geben Sie eine gültige Jahreszahl an.`);
  }

  const startDate = new Date(yearNum, monthIndex, 1);
  const endDate = new Date(yearNum, monthIndex + 1, 0, 23, 59, 59, 999);

  if (isNaN(startDate.getTime()) || isNaN(endDate.getTime())) {
    throw new Error('Ungültiges Datum. Bitte überprüfen Sie Monat und Jahr.');
  }

  return { startDate, endDate };
}

function parseGermanDate(dateStr) {
  // Try ISO format (YYYY-MM-DD)
  const isoMatch = dateStr.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (isoMatch) {
    const [_, year, month, day] = isoMatch;
    const date = new Date(parseInt(year), parseInt(month) - 1, parseInt(day));
    if (isValidDate(date)) {
      return date;
    }
  }

  // Try DD.MM.YYYY format
  const ddmmyyyyMatch = dateStr.match(/^(\d{1,2})\.(\d{1,2})\.(\d{4})$/);
  if (ddmmyyyyMatch) {
    const [_, day, month, year] = ddmmyyyyMatch;
    const date = new Date(parseInt(year), parseInt(month) - 1, parseInt(day));
    if (isValidDate(date)) {
      return date;
    }
  }
  
  throw new Error('Ungültiges Datumsformat. Bitte verwenden Sie das Format "TT.MM.YYYY" (z.B. "29.06.2025") oder "YYYY-MM-DD" (z.B. "2025-06-29")');
}

function isValidDate(date) {
  return date instanceof Date && !isNaN(date.getTime());
} 