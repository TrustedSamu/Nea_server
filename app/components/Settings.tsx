import React, { useEffect, useState } from 'react';
import { updateNotificationEmail, updateBotPrompt } from '../lib/firebase';
import { onSnapshot, doc, collection, getDocs, query, orderBy, limit } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { initializeSickLogCollection } from '../lib/sickLogUtils';
import { getEmployees } from '../lib/employeeUtils';
import { getSickLogs } from '../lib/sickLogUtils';
import jsPDF from 'jspdf';

// Import tool descriptions
const AVAILABLE_TOOLS = [
  {
    name: 'getNextResponseFromSupervisor',
    description: 'Ermöglicht es dem Bot, komplexere Fragen an einen erfahreneren Supervisor-Bot weiterzuleiten.',
    parameters: {
      relevantContextFromLastUserMessage: 'Wichtiger Kontext aus der letzten Nachricht des Mitarbeiters'
    }
  },
  {
    name: 'lookupPolicyDocument',
    description: 'Durchsucht interne Dokumente und Richtlinien nach bestimmten Themen.',
    parameters: {
      topic: 'Das zu suchende Thema oder Schlüsselwort'
    }
  },
  {
    name: 'getUserAccountInfo',
    description: 'Ruft Mitarbeiter- und Abrechnungsinformationen ab (nur Lesezugriff).',
    parameters: {
      phone_number: 'Telefonnummer des Mitarbeiters'
    }
  },
  {
    name: 'updateEmployeeKrankStatus',
    description: 'Aktualisiert den Krankheitsstatus eines Mitarbeiters.',
    parameters: {
      name: 'Vollständiger Name des Mitarbeiters',
      isKrank: 'Krankheitsstatus (true/false)',
      reason: 'Grund für die Abwesenheit (optional)',
      reportedAt: 'Zeitpunkt der Krankmeldung (optional)'
    }
  },
  {
    name: 'sendEmail',
    description: 'Sendet eine E-Mail-Benachrichtigung über Krankmeldungen an die HR-Abteilung.',
    parameters: {
      name: 'Name des kranken Mitarbeiters',
      reason: 'Grund der Krankmeldung',
      reportedAt: 'Zeitpunkt der Krankmeldung',
      expectedDuration: 'Voraussichtliche Dauer der Abwesenheit (optional)',
      doctorVisit: 'Ob ein Arztbesuch geplant/erfolgt ist (optional)',
      additionalNotes: 'Zusätzliche relevante Informationen (optional)'
    }
  }
];

interface SettingsProps {
  isDarkMode?: boolean;
}

export default function Settings({ isDarkMode = false }: SettingsProps) {
  const [email, setEmail] = useState('');
  const [isEditing, setIsEditing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [saveStatus, setSaveStatus] = useState<'success' | 'error' | null>(null);
  
  // Bot prompt state
  const [botPrompt, setBotPrompt] = useState('');
  const [isEditingPrompt, setIsEditingPrompt] = useState(false);
  const [isSavingPrompt, setIsSavingPrompt] = useState(false);
  const [promptSaveStatus, setPromptSaveStatus] = useState<'success' | 'error' | null>(null);

  // Tool display state
  const [expandedTool, setExpandedTool] = useState<string | null>(null);

  // Sicklog initialization state
  const [isInitializingSickLog, setIsInitializingSickLog] = useState(false);
  const [initializeError, setInitializeError] = useState<string | null>(null);
  const [initializeSuccess, setInitializeSuccess] = useState<string | null>(null);

  // PDF export state
  const [isExportingPDF, setIsExportingPDF] = useState(false);
  const [exportError, setExportError] = useState<string | null>(null);
  const [exportSuccess, setExportSuccess] = useState<string | null>(null);

  useEffect(() => {
    // Set up real-time listener for settings
    const settingsRef = doc(db, 'settings', 'notifications');
    const botSettingsRef = doc(db, 'settings', 'bot');
    
    const unsubscribe1 = onSnapshot(settingsRef, (doc) => {
      if (doc.exists()) {
        setEmail(doc.data().notificationEmail);
      } else {
        setEmail(''); // Default email
      }
    }, (error) => {
      console.error('Error listening to settings:', error);
    });

    const unsubscribe2 = onSnapshot(botSettingsRef, (doc) => {
      if (doc.exists() && doc.data().systemPrompt) {
        setBotPrompt(doc.data().systemPrompt);
      } else {
        // Default prompt from chatSupervisor/index.ts
        setBotPrompt(`Sie sind Frau Schmidt, die erfahrene HR-Managerin bei NEA GmbH. Ihre Aufgabe ist es, einen natürlichen Gesprächsfluss mit den Mitarbeitern aufrechtzuerhalten, ihnen bei der Lösung ihrer Anliegen auf hilfreiche, effiziente und korrekte Weise zu helfen und sich bei komplexeren Fragen stark auf die Unterstützung einer erfahreneren Supervisor-KI zu verlassen.`);
      }
    }, (error) => {
      console.error('Error listening to bot settings:', error);
    });

    // Cleanup subscriptions
    return () => {
      unsubscribe1();
      unsubscribe2();
    };
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    setSaveStatus(null);

    try {
      const success = await updateNotificationEmail(email);
      if (success) {
        setSaveStatus('success');
        setIsEditing(false);
      } else {
        setSaveStatus('error');
      }
    } catch (error) {
      setSaveStatus('error');
    } finally {
      setIsSaving(false);
      // Clear status after 3 seconds
      setTimeout(() => setSaveStatus(null), 3000);
    }
  };

  const handlePromptSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSavingPrompt(true);
    setPromptSaveStatus(null);

    try {
      const success = await updateBotPrompt(botPrompt);
      if (success) {
        setPromptSaveStatus('success');
        setIsEditingPrompt(false);
      } else {
        setPromptSaveStatus('error');
      }
    } catch (error) {
      setPromptSaveStatus('error');
    } finally {
      setIsSavingPrompt(false);
      // Clear status after 3 seconds
      setTimeout(() => setPromptSaveStatus(null), 3000);
    }
  };

  const handleInitializeSickLog = async () => {
    setIsInitializingSickLog(true);
    setInitializeError(null);
    try {
      await initializeSickLogCollection();
      // Add success message
      setInitializeSuccess('Krankmeldungen-Sammlung erfolgreich initialisiert');
      setTimeout(() => setInitializeSuccess(null), 3000);
    } catch (error) {
      console.error('Error initializing sicklog collection:', error);
      setInitializeError('Fehler beim Initialisieren der Krankmeldungen-Sammlung');
    } finally {
      setIsInitializingSickLog(false);
    }
  };

  const handleExportKPIToPDF = async () => {
    setIsExportingPDF(true);
    setExportError(null);
    setExportSuccess(null);

    try {
      // Fetch KPI data
      const employees = await getEmployees();
      const totalEmployees = employees.length;
      
      const sickLogs = await getSickLogs();
      const activeSickLeave = sickLogs.length;
      
      // Calculate sick leave this month
      const currentMonth = new Date().getMonth();
      const currentYear = new Date().getFullYear();
      const thisMonthSickLogs = sickLogs.filter(log => {
        const logDate = new Date(log.reportedAt);
        return logDate.getMonth() === currentMonth && logDate.getFullYear() === currentYear;
      });
      
      // Calculate sickness rate
      const sicknessRate = totalEmployees > 0 ? (activeSickLeave / totalEmployees) * 100 : 0;
      
      // Fetch mail logs
      const mailLogsSnapshot = await getDocs(
        query(collection(db, 'mailLogs'), orderBy('sentAt', 'desc'), limit(5))
      );
      const failedMails = mailLogsSnapshot.docs.filter(doc => doc.data().status === 'failed').length;

      // Create PDF
      const doc = new jsPDF();
      
      // Add title
      doc.setFontSize(20);
      doc.setFont('helvetica', 'bold');
      doc.text('NEA GmbH - KPI Report', 20, 30);
      
      // Add date
      doc.setFontSize(12);
      doc.setFont('helvetica', 'normal');
      const currentDate = new Date().toLocaleDateString('de-DE', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      });
      doc.text(`Erstellt am: ${currentDate}`, 20, 45);
      
      // Add KPI data
      doc.setFontSize(14);
      doc.setFont('helvetica', 'bold');
      doc.text('Aktuelle KPI-Daten:', 20, 65);
      
      doc.setFontSize(12);
      doc.setFont('helvetica', 'normal');
      let yPosition = 80;
      
      const kpiData = [
        { label: 'Gesamte Mitarbeiter', value: totalEmployees.toString() },
        { label: 'Aktuelle Krankmeldungen', value: activeSickLeave.toString() },
        { label: 'Krankmeldungen diesen Monat', value: thisMonthSickLogs.length.toString() },
        { label: 'Krankheitsrate', value: `${Math.round(sicknessRate * 10) / 10}%` },
        { label: 'E-Mail Fehler', value: failedMails.toString() },
        { label: 'Gesamte Krankheitstage', value: sickLogs.length.toString() }
      ];
      
      kpiData.forEach(kpi => {
        doc.text(`${kpi.label}: ${kpi.value}`, 20, yPosition);
        yPosition += 10;
      });
      
      // Add recent sick logs if any
      if (sickLogs.length > 0) {
        yPosition += 10;
        doc.setFontSize(14);
        doc.setFont('helvetica', 'bold');
        doc.text('Aktuelle Krankmeldungen:', 20, yPosition);
        
        doc.setFontSize(10);
        doc.setFont('helvetica', 'normal');
        yPosition += 10;
        
        // Show last 5 sick logs
        const recentSickLogs = sickLogs.slice(0, 5);
        recentSickLogs.forEach(log => {
          const logDate = new Date(log.reportedAt).toLocaleDateString('de-DE');
          const text = `${log.name} - ${log.reason} (${logDate})`;
          
          // Check if text fits on current page
          if (yPosition > 250) {
            doc.addPage();
            yPosition = 20;
          }
          
          doc.text(text, 25, yPosition);
          yPosition += 8;
        });
      }
      
      // Save PDF
      const fileName = `NEA_KPI_Report_${new Date().toISOString().split('T')[0]}.pdf`;
      doc.save(fileName);
      
      setExportSuccess('KPI-Daten erfolgreich als PDF exportiert');
      setTimeout(() => setExportSuccess(null), 3000);
    } catch (error) {
      console.error('Error exporting KPI data:', error);
      setExportError('Fehler beim Exportieren der KPI-Daten');
    } finally {
      setIsExportingPDF(false);
    }
  };

  return (
    <div className="min-h-screen p-8">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-5xl font-bold font-space mb-2 text-accent">
            Einstellungen
          </h1>
          <p className={`text-xl font-inter ${
            isDarkMode ? 'text-light-200' : 'text-light-500'
          }`}>
            System- und Bot-Konfiguration verwalten
          </p>
          <div className="h-1 bg-gradient-to-r from-accent via-orange-400 to-orange-500 rounded-full mt-4"></div>
        </div>

        <div className="space-y-8">
          {/* Email Settings */}
          <div className={`glass-card p-8 ${
            isDarkMode 
              ? 'bg-dark-200/50 border-dark-300' 
              : 'bg-white/80 border-orange-200'
          }`}>
            <h3 className={`text-2xl font-bold font-space mb-6 ${
              isDarkMode ? 'text-light' : 'text-dark'
            }`}>
              Benachrichtigungs-E-Mail
            </h3>
            
            {isEditing ? (
              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className={`w-full px-4 py-2 rounded-lg border focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent transition-colors duration-300 ${
                      isDarkMode 
                        ? 'bg-[#1a1a1a] border-[#333333] text-orange-300' 
                        : 'border-orange-200'
                    }`}
                    placeholder="E-Mail-Adresse eingeben"
                    required
                  />
                </div>
                <div className="flex gap-3">
                  <button
                    type="submit"
                    disabled={isSaving}
                    className={`px-4 py-2 rounded-lg text-white transition-colors duration-300 ${
                      isSaving
                        ? 'bg-orange-400 cursor-wait'
                        : 'bg-orange-500 hover:bg-orange-600'
                    }`}
                  >
                    {isSaving ? 'Wird gespeichert...' : 'Speichern'}
                  </button>
                  <button
                    type="button"
                    onClick={() => setIsEditing(false)}
                    className={`px-4 py-2 rounded-lg border transition-colors duration-300 ${
                      isDarkMode 
                        ? 'border-[#333333] hover:bg-[#333333] text-orange-400' 
                        : 'border-orange-200 hover:bg-orange-50'
                    }`}
                  >
                    Abbrechen
                  </button>
                </div>
              </form>
            ) : (
              <div className="flex items-center justify-between">
                <p className={`transition-colors duration-300 ${
                  isDarkMode ? 'text-orange-400' : 'text-orange-900'
                }`} style={{ fontFamily: 'Kalam, cursive' }}>
                  {email}
                </p>
                <button
                  onClick={() => setIsEditing(true)}
                  className={`px-4 py-2 rounded-lg border transition-colors duration-300 ${
                    isDarkMode 
                      ? 'border-[#333333] hover:bg-[#333333] text-orange-400' 
                      : 'border-orange-200 hover:bg-orange-50'
                  }`}
                >
                  Bearbeiten
                </button>
              </div>
            )}

            {saveStatus && (
              <div className="mt-4">
                {saveStatus === 'success' && (
                  <p className="text-green-600" style={{ fontFamily: 'Kalam, cursive' }}>
                    ✓ E-Mail-Adresse erfolgreich aktualisiert
                  </p>
                )}
                {saveStatus === 'error' && (
                  <p className="text-red-600" style={{ fontFamily: 'Kalam, cursive' }}>
                    ✗ Fehler beim Aktualisieren der E-Mail-Adresse
                  </p>
                )}
              </div>
            )}
          </div>

          {/* Bot Prompt Settings */}
          <div className={`glass-card p-8 ${
            isDarkMode 
              ? 'bg-dark-200/50 border-dark-300' 
              : 'bg-white/80 border-orange-200'
          }`}>
            <h3 className={`text-2xl font-bold font-space mb-6 ${
              isDarkMode ? 'text-light' : 'text-dark'
            }`}>
              Bot-Anweisungen
            </h3>
            
            {isEditingPrompt ? (
              <form onSubmit={handlePromptSubmit} className="space-y-4">
                <div>
                  <textarea
                    value={botPrompt}
                    onChange={(e) => setBotPrompt(e.target.value)}
                    className={`w-full h-48 px-4 py-2 rounded-lg border focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent transition-colors duration-300 ${
                      isDarkMode 
                        ? 'bg-[#1a1a1a] border-[#333333] text-orange-300' 
                        : 'border-orange-200'
                    }`}
                    placeholder="Bot-Anweisungen eingeben"
                    required
                  />
                </div>
                <div className="flex gap-3">
                  <button
                    type="submit"
                    disabled={isSavingPrompt}
                    className={`px-4 py-2 rounded-lg text-white transition-colors duration-300 ${
                      isSavingPrompt
                        ? 'bg-orange-400 cursor-wait'
                        : 'bg-orange-500 hover:bg-orange-600'
                    }`}
                  >
                    {isSavingPrompt ? 'Wird gespeichert...' : 'Speichern'}
                  </button>
                  <button
                    type="button"
                    onClick={() => setIsEditingPrompt(false)}
                    className={`px-4 py-2 rounded-lg border transition-colors duration-300 ${
                      isDarkMode 
                        ? 'border-[#333333] hover:bg-[#333333] text-orange-400' 
                        : 'border-orange-200 hover:bg-orange-50'
                    }`}
                  >
                    Abbrechen
                  </button>
                </div>
              </form>
            ) : (
              <div className="space-y-4">
                <div className={`rounded-lg p-4 border transition-colors duration-300 ${
                  isDarkMode 
                    ? 'bg-[#1a1a1a] border-[#333333]' 
                    : 'bg-orange-50 border-orange-100'
                }`}>
                  <p className={`whitespace-pre-wrap transition-colors duration-300 ${
                    isDarkMode ? 'text-orange-400' : 'text-orange-900'
                  }`} style={{ fontFamily: 'Kalam, cursive' }}>
                    {botPrompt}
                  </p>
                </div>
                <div className="flex justify-end">
                  <button
                    onClick={() => setIsEditingPrompt(true)}
                    className={`px-4 py-2 rounded-lg border transition-colors duration-300 ${
                      isDarkMode 
                        ? 'border-[#333333] hover:bg-[#333333] text-orange-400' 
                        : 'border-orange-200 hover:bg-orange-50'
                    }`}
                  >
                    Bearbeiten
                  </button>
                </div>
              </div>
            )}

            {promptSaveStatus && (
              <div className="mt-4">
                {promptSaveStatus === 'success' && (
                  <p className="text-green-600" style={{ fontFamily: 'Kalam, cursive' }}>
                    ✓ Bot-Anweisungen erfolgreich aktualisiert
                  </p>
                )}
                {promptSaveStatus === 'error' && (
                  <p className="text-red-600" style={{ fontFamily: 'Kalam, cursive' }}>
                    ✗ Fehler beim Aktualisieren der Bot-Anweisungen
                  </p>
                )}
              </div>
            )}
          </div>

          {/* Bot Tools Section */}
          <div className={`glass-card p-8 ${
            isDarkMode 
              ? 'bg-dark-200/50 border-dark-300' 
              : 'bg-white/80 border-orange-200'
          }`}>
            <h3 className={`text-2xl font-bold font-space mb-6 ${
              isDarkMode ? 'text-light' : 'text-dark'
            }`}>
              Verfügbare Bot-Funktionen
            </h3>
            
            <div className="space-y-4">
              {AVAILABLE_TOOLS.map((tool) => (
                <div 
                  key={tool.name}
                  className={`rounded-lg border overflow-hidden transition-all duration-300 ${
                    isDarkMode 
                      ? 'bg-[#1a1a1a] border-[#333333]' 
                      : 'bg-orange-50 border-orange-100'
                  }`}
                >
                  <button
                    onClick={() => setExpandedTool(expandedTool === tool.name ? null : tool.name)}
                    className={`w-full text-left p-4 flex items-center justify-between transition-colors duration-300 ${
                      isDarkMode 
                        ? 'hover:bg-[#333333]' 
                        : 'hover:bg-orange-100/50'
                    }`}
                  >
                    <span className={`font-medium transition-colors duration-300 ${
                      isDarkMode ? 'text-orange-400' : 'text-orange-900'
                    }`} style={{ fontFamily: 'Kalam, cursive' }}>
                      {tool.name}
                    </span>
                    <span className={`transform transition-transform duration-300 ${expandedTool === tool.name ? 'rotate-180' : ''}`}>
                      ▼
                    </span>
                  </button>
                  
                  {expandedTool === tool.name && (
                    <div className="p-4 pt-0 space-y-3 animate-fadeIn">
                      <p className={`transition-colors duration-300 ${
                        isDarkMode ? 'text-orange-400' : 'text-orange-800'
                      }`} style={{ fontFamily: 'Kalam, cursive' }}>
                        {tool.description}
                      </p>
                      <div className="space-y-2">
                        <p className={`text-sm font-medium transition-colors duration-300 ${
                          isDarkMode ? 'text-orange-500' : 'text-orange-600'
                        }`} style={{ fontFamily: 'Kalam, cursive' }}>
                          Parameter:
                        </p>
                        {Object.entries(tool.parameters).map(([param, desc]) => (
                          <div key={param} className="pl-4 text-sm">
                            <span className={`font-medium transition-colors duration-300 ${
                              isDarkMode ? 'text-orange-400' : 'text-orange-800'
                            }`} style={{ fontFamily: 'Kalam, cursive' }}>
                              {param}:
                            </span>
                            <span className={`ml-2 transition-colors duration-300 ${
                              isDarkMode ? 'text-orange-300' : 'text-orange-700'
                            }`} style={{ fontFamily: 'Kalam, cursive' }}>
                              {desc}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Sicklog Initialization */}
          <div className={`glass-card p-8 ${
            isDarkMode 
              ? 'bg-dark-200/50 border-dark-300' 
              : 'bg-white/80 border-orange-200'
          }`}>
            <h3 className={`text-2xl font-bold font-space mb-6 ${
              isDarkMode ? 'text-light' : 'text-dark'
            }`}>
              Krankmeldungen-Sammlung
            </h3>
            
            <div className="space-y-4">
              <button
                onClick={handleInitializeSickLog}
                disabled={isInitializingSickLog}
                className={`px-4 py-2 rounded-lg text-white transition-colors duration-300 ${
                  isInitializingSickLog
                    ? 'bg-orange-400 cursor-wait'
                    : 'bg-orange-500 hover:bg-orange-600'
                }`}
              >
                {isInitializingSickLog ? 'Wird initialisiert...' : 'Krankmeldungen-Sammlung initialisieren'}
              </button>

              {initializeError && (
                <p className="text-red-600" style={{ fontFamily: 'Kalam, cursive' }}>
                  ✗ {initializeError}
                </p>
              )}
              
              {initializeSuccess && (
                <p className="text-green-600" style={{ fontFamily: 'Kalam, cursive' }}>
                  ✓ {initializeSuccess}
                </p>
              )}
            </div>
          </div>

          {/* KPI Export Section */}
          <div className={`glass-card p-8 ${
            isDarkMode 
              ? 'bg-dark-200/50 border-dark-300' 
              : 'bg-white/80 border-orange-200'
          }`}>
            <h3 className={`text-2xl font-bold font-space mb-6 ${
              isDarkMode ? 'text-light' : 'text-dark'
            }`}>
              KPI-Daten Export
            </h3>
            
            <div className="space-y-4">
              <button
                onClick={handleExportKPIToPDF}
                disabled={isExportingPDF}
                className={`px-4 py-2 rounded-lg text-white transition-colors duration-300 ${
                  isExportingPDF
                    ? 'bg-orange-400 cursor-wait'
                    : 'bg-orange-500 hover:bg-orange-600'
                }`}
              >
                {isExportingPDF ? 'Wird exportiert...' : 'KPI-Daten als PDF exportieren'}
              </button>

              {exportError && (
                <p className="text-red-600" style={{ fontFamily: 'Kalam, cursive' }}>
                  ✗ {exportError}
                </p>
              )}
              
              {exportSuccess && (
                <p className="text-green-600" style={{ fontFamily: 'Kalam, cursive' }}>
                  ✓ {exportSuccess}
                </p>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
} 