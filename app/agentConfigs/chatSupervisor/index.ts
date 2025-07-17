import { RealtimeAgent, tool } from '@openai/agents/realtime'
import { getNextResponseFromSupervisor, supervisorAgentInstructions, supervisorAgentTools } from './supervisorAgent';
import { doc, onSnapshot, getDoc, collection, getDocs, query, orderBy, limit } from 'firebase/firestore';
import { db } from '../../lib/firebase';
import { getEmployees } from '../../lib/employeeUtils';
import { getSickLogs } from '../../lib/sickLogUtils';
import { toggleDarkMode } from '../../lib/darkModeUtils';

// Utility function for delays
const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

// Default prompt that will be used if no custom prompt is set
const DEFAULT_PROMPT = `Du bist Tralalero Tralala, der HR Boss bei der NEA.
Du bist gerade an der Hotline und bekommst einen Anruf von einem Mitarbeiter oder externen Kunden.
Rede entspannt in kurzen Sätzen, zielorientiert aber locker. Kein langes Gelaber.
Fange immer freundlich mit "Hi, hier spricht *name* von der NEA (NEA flüssig als ein wort gesprochen), ich bin eine künstliche HR Assistentin, wie kann ich dir heute behilflich sein?" Diesen ersten Satz schnell sagen.
Wenn dich ein Mitarbeiter anruft, könnte er wegen Urlaub, Krankheit, etc. anrufen.
Wenn es um Krankheiten geht, sollte der Mitarbeiter zunächst seinen vollen Namen nennen, dann den Grund der Krankheit und die voraussichtliche Dauer.
Mit diesen Informationen kannst du den Supervisor Agenten anweisen, die Krankmeldung zu erfassen und die HR-Abteilung zu informieren.
Das bedeutet du musst das getNextResponseFromSupervisor Tool aufrufen.
Wenn es um Urlaub geht, selbes Spiel: Name, Start- und Enddatum, Grund. 
Bestätige die vollen Daten immer einmal und lass den Nutzer noch bestätigen dass das vorgelesene passt, rufe erst dann die Tools auf.
Nachdem du die Tools aufgerufen hast, gebe wieder was dir der Supervisor Agent sagt in kurzen. Wenn alles passt und der Antrag eingereicht ist einfach: "Super, ich habe deine Krankmeldung / Urlaubsantrag erfasst und weitergegeben. Kann ich dir sonst noch behilflich sein oder das Gespräch beenden?" Nicht die Daten erneut vorlesen.
BEACHTE: Bei relativen Datumsangaben wie "heute bis in einer Woche" konvertiere diese in konkrete ISO-Daten (YYYY-MM-DD).
- "heute" = aktuelles Datum = (${new Date().toISOString().split('T')[0]})
- "morgen" = morgiges Datum  
- "in einer Woche" = 7 Tage ab heute
- "nächsten Montag" = nächster Montag
Also gebe Datumsangaben im ISO-Format an die Tools aber spreche Daten in normalem Format also DD-MM.
Wenn es um andere Anliegen geht, kannst du das getNextResponseFromSupervisor Tool aufrufen für Anweisungen aufrufen.

Wenn der Boss anruft kannst du ihm bei folgendem Helfen: 
Mit getDashboardKPIs kannst du die aktuellen Krankheitsstatistiken abrufen und darüber reden.
Du kannst den User außerdem mit dem showDashboard Tool zu dem Dashboard navigieren um ihm das visuell zu unterstützen.
Wenn du bestimmte KPIs hervorheben möchtest, kannst du das showDashboard Tool mit dem highlightKpi Parameter aufrufen während du redest.

Du kannst auch den Dark Mode der Benutzeroberfläche mit dem toggleDarkMode Tool umschalten, wenn jemand darum bittet oder Probleme mit der Lesbarkeit hat.


Wenn das Gespräch natürlich endet oder es allgemein vorbei ist rufe direkt das endCall Tool auf.
Rufe das Tool z.b. auf wenn der User eine krankmeldung eingereicht hat und du alles erledigt hast.
z.b. alles klar, deine Krankmeldung / Urlaubsantrag wurde erfasst und weitergegeben. Kann ich dir sonst noch behilflich sein oder das Gespräch beenden?
- Passt alles, danke
Direkt endCall Tool aufrufen und message die zurückkommt 1:1 vorlesen.`

// Store the prompt in a class to ensure reactivity
class PromptManager {
  private static _prompt: string = DEFAULT_PROMPT;

  static get prompt() {
    return this._prompt;
  }

  static set prompt(newPrompt: string) {
    this._prompt = newPrompt;
  }
}

function getCurrentPrompt() {
  return PromptManager.prompt;
}

const endCall = tool({
  name: 'endCall',
  description: 'Beendet das aktuelle Gespräch mit dem Mitarbeiter.',
  parameters: {
    type: 'object',
    properties: {},
    required: [],
    additionalProperties: false,
  },
  execute: async (_input: any, details: any) => {
    const endCall = (details?.context as any)?.endCall;
    if (typeof endCall === 'function') {
      // Return a message that will be spoken before disconnecting
      const result = { success: true, message: 'Bis bald! Ich beende jetzt das Gespräch.' };
      // Give a small delay to allow the message to be processed
      setTimeout(() => endCall(), 4000);
      return result;
    }
    return { success: false, message: 'Konnte das Gespräch nicht beenden.' };
  }
});

const showDashboard = tool({
  name: 'showDashboard',
  description: 'Zeigt das Dashboard an und navigiert den Benutzer dorthin.',
  parameters: {
    type: 'object',
    properties: {
      highlightKpi: {
        type: 'string',
        enum: ['totalEmployees', 'activeSickLeave', 'totalSickLeaveThisMonth', 'sicknessRate', 'pendingMailLogs', 'totalSickLeaveDays'],
        description: 'Welche KPI soll hervorgehoben werden'
      }
    },
    required: [],
    additionalProperties: false,
  },
  execute: async (input: any, details: any) => {
    console.log('showDashboard called with:', input); // Debug log
    console.log('Full context available:', details); // Debug log
    console.log('Context functions:', {
      setCurrentSite: typeof (details?.context as any)?.setCurrentSite,
      setActiveTab: typeof (details?.context as any)?.setActiveTab,
      highlightKpi: typeof (details?.context as any)?.highlightKpi
    }); // Debug log

    const setCurrentSite = (details?.context as any)?.setCurrentSite;
    const setActiveTab = (details?.context as any)?.setActiveTab;
    const highlightKpi = (details?.context as any)?.highlightKpi;

    if (typeof setCurrentSite === 'function' && typeof setActiveTab === 'function' && typeof highlightKpi === 'function') {
      console.log('Setting site to nea and tab to dashboard'); // Debug log
      
      try {
        // First navigate to the correct site and tab
        setCurrentSite('nea');
        await delay(100); // Small delay between site and tab change
        setActiveTab('dashboard');
        await delay(100); // Small delay before highlighting
        
        // Clear any existing highlight first
        highlightKpi(null);
        await delay(100); // Small delay before new highlight
        
        if (input.highlightKpi) {
          console.log('Highlighting KPI:', input.highlightKpi); // Debug log
          highlightKpi(input.highlightKpi);
          // Auto-clear highlight after 8 seconds
          setTimeout(() => highlightKpi(null), 8000);
        }
        
        return { 
          success: true, 
          message: `Ich zeige Ihnen das Dashboard${input.highlightKpi ? ' und hebe die gewünschte Information hervor' : ''}.` 
        };
      } catch (error) {
        console.error('Error executing dashboard functions:', error);
        return { success: false, message: 'Ein Fehler ist beim Anzeigen des Dashboards aufgetreten.' };
      }
    }

    console.error('Required functions not found in context:', {
      hasSetCurrentSite: typeof setCurrentSite === 'function',
      hasSetActiveTab: typeof setActiveTab === 'function',
      hasHighlightKpi: typeof highlightKpi === 'function'
    }); // Debug log

    return { success: false, message: 'Konnte das Dashboard nicht anzeigen.' };
  }
});

const getDashboardKPIs = tool({
  name: 'getDashboardKPIs',
  description: 'Ruft die aktuellen KPI-Daten vom Dashboard ab.',
  parameters: {
    type: 'object',
    properties: {},
    required: [],
    additionalProperties: false,
  },
  execute: async () => {
    try {
      // Fetch employees
      const employees = await getEmployees();
      const totalEmployees = employees.length;
      
      // Fetch sick logs
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

      return {
        success: true,
        data: {
          totalEmployees,
          activeSickLeave,
          totalSickLeaveThisMonth: thisMonthSickLogs.length,
          pendingMailLogs: failedMails,
          sicknessRate: Math.round(sicknessRate * 10) / 10,
          totalSickLeaveDays: sickLogs.length
        }
      };
    } catch (error) {
      return { 
        success: false, 
        message: 'Konnte die KPI-Daten nicht abrufen.',
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }
});

const toggleDarkModeTool = tool({
  name: 'toggleDarkMode',
  description: 'Schaltet den Dark Mode der Benutzeroberfläche um (zwischen hell und dunkel).',
  parameters: {
    type: 'object',
    properties: {},
    required: [],
    additionalProperties: false,
  },
  execute: async () => {
    try {
      toggleDarkMode();
      return { success: true, message: 'Ich habe den Dark Mode für Sie umgeschaltet. Ist die Ansicht jetzt besser für Sie?' };
    } catch (error) {
      return { success: false, message: 'Es gab ein Problem beim Umschalten des Dark Mode.' };
    }
  }
});

// Create the chat agent with dynamic prompt
export const chatAgent = new RealtimeAgent({
  name: 'chat',
  voice: 'sage',
  instructions: getCurrentPrompt(),
  tools: [getNextResponseFromSupervisor, endCall, showDashboard, getDashboardKPIs, toggleDarkModeTool],
  handoffs: []
});

// Add listener to update agent instructions when prompt changes
PromptManager.prompt = getCurrentPrompt(); // Update the static property

export const chatSupervisorScenario = [chatAgent];

export default chatSupervisorScenario;
