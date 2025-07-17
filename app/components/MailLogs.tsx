import React, { useEffect, useState } from 'react';
import { getDocs, collection, query, orderBy, limit } from 'firebase/firestore';
import { db } from '../lib/firebase';

interface MailLog {
  id?: string;
  to: string;
  subject: string;
  body: string;
  sentAt: any; // Can be string or Firebase Timestamp
  status: 'success' | 'failed';
  reason?: string;
}

interface MailLogsProps {
  isDarkMode?: boolean;
}

const MailLogs: React.FC<MailLogsProps> = ({ isDarkMode = false }) => {
  const [mailLogs, setMailLogs] = useState<MailLog[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // Fetch mail logs once without real-time listener to reduce memory usage
    const fetchMailLogs = async () => {
      try {
        const mailLogsRef = collection(db, 'mailLogs');
        const q = query(mailLogsRef, orderBy('sentAt', 'desc'), limit(20)); // Limit to 20 most recent
        
        const snapshot = await getDocs(q);
        const logs = snapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        })) as MailLog[];
        
        setMailLogs(logs);
      } catch (error) {
        // Suppress permission errors during development
        if (error instanceof Error && !error.message.includes('Permission denied')) {
          console.error('Error fetching mail logs:', error);
        }
      } finally {
        setIsLoading(false);
      }
    };

    fetchMailLogs();
  }, []);

  const formatDate = (dateValue: any) => {
    try {
      let date: Date;
      
      // Handle Firebase Timestamp objects
      if (dateValue && typeof dateValue === 'object' && dateValue.seconds) {
        date = new Date(dateValue.seconds * 1000 + dateValue.nanoseconds / 1000000);
      } 
      else if (dateValue && typeof dateValue.toDate === 'function') {
        date = dateValue.toDate();
      }
      else {
        date = new Date(dateValue);
      }
      
      if (isNaN(date.getTime())) {
        return 'Ungültiges Datum';
      }

      return new Intl.DateTimeFormat('de-DE', {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
        hour12: false
      }).format(date);
    } catch (error) {
      return 'Ungültiges Datum';
    }
  };

  const extractReasonFromBody = (body: string): string => {
    if (!body) return 'Keine Angabe';
    
    const reasonMatch = body.match(/<p><strong>Grund:<\/strong>\s*([^<]+)<\/p>/);
    if (reasonMatch && reasonMatch[1]) {
      return reasonMatch[1].trim();
    }
    
    return 'Keine Angabe';
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className={`animate-spin rounded-full h-8 w-8 border-b-2 ${isDarkMode ? 'border-orange-400' : 'border-orange-500'}`}></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen p-8">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className={`text-5xl font-bold font-space mb-2 ${
            isDarkMode ? 'text-light' : 'text-dark'
          }`}>
            <span className="text-accent">E-Mail</span> Protokoll
          </h1>
          <p className={`text-xl font-inter ${
            isDarkMode ? 'text-light-200' : 'text-light-500'
          }`}>
            Übersicht der letzten 20 E-Mails
          </p>
          <div className="h-1 bg-gradient-to-r from-accent via-orange-400 to-orange-500 rounded-full mt-4"></div>
        </div>

        {mailLogs.length === 0 ? (
          <div className={`glass-card p-16 text-center ${
            isDarkMode 
              ? 'bg-dark-200/50 border-dark-300' 
              : 'bg-light/50 border-light-300'
          }`}>
            <div className="mb-4 w-16 h-16 mx-auto rounded-full bg-gradient-to-br from-accent to-orange-400 flex items-center justify-center">
              <span className="text-white text-2xl">📧</span>
            </div>
            <h3 className={`text-xl font-bold mb-2 ${
              isDarkMode ? 'text-light' : 'text-dark'
            }`}>
              Keine E-Mails im Protokoll
            </h3>
            <p className={`${
              isDarkMode ? 'text-light-300' : 'text-light-500'
            }`}>
              Gesendete E-Mails werden hier angezeigt
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {mailLogs.map((log, index) => (
              <div
                key={log.id || index}
                className={`glass-card p-6 transition-all duration-300 hover:scale-105 ${
                  isDarkMode 
                    ? 'bg-dark-200/50 border-dark-300 hover:border-accent/50' 
                    : 'bg-light/50 border-light-300 hover:border-accent/50'
                }`}
              >
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <h3 className={`text-lg font-bold font-space line-clamp-2 ${
                      isDarkMode ? 'text-light' : 'text-dark'
                    }`}>
                      {log.subject}
                    </h3>
                    <span className={`px-3 py-1 rounded-full text-xs font-medium ${
                      log.status === 'success'
                        ? 'bg-green-500/20 text-green-400'
                        : 'bg-red-500/20 text-red-400'
                    }`}>
                      {log.status === 'success' ? 'Gesendet' : 'Fehler'}
                    </span>
                  </div>
                  
                  <div className="space-y-3">
                    <div className={`p-3 rounded-lg ${
                      isDarkMode ? 'bg-dark-300/50' : 'bg-light-100/50'
                    }`}>
                      <p className={`text-xs font-medium mb-1 ${
                        isDarkMode ? 'text-light-300' : 'text-light-500'
                      }`}>
                        Empfänger
                      </p>
                      <p className={`text-sm break-all ${
                        isDarkMode ? 'text-light' : 'text-dark'
                      }`}>
                        {log.to}
                      </p>
                    </div>
                    
                    <div className={`p-3 rounded-lg ${
                      isDarkMode ? 'bg-dark-300/50' : 'bg-light-100/50'
                    }`}>
                      <p className={`text-xs font-medium mb-1 ${
                        isDarkMode ? 'text-light-300' : 'text-light-500'
                      }`}>
                        Zeitstempel
                      </p>
                      <p className={`text-sm font-medium ${
                        isDarkMode ? 'text-accent' : 'text-orange-600'
                      }`}>
                        {formatDate(log.sentAt)}
                      </p>
                    </div>
                    
                    <div className={`p-3 rounded-lg ${
                      isDarkMode ? 'bg-dark-300/50' : 'bg-light-100/50'
                    }`}>
                      <p className={`text-xs font-medium mb-1 ${
                        isDarkMode ? 'text-light-300' : 'text-light-500'
                      }`}>
                        Grund
                      </p>
                      <p className={`text-sm ${
                        isDarkMode ? 'text-light' : 'text-dark'
                      }`}>
                        {extractReasonFromBody(log.body)}
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default MailLogs; 