import express from 'express';
import { RealtimeAgent, RealtimeSession } from '@openai/agents/realtime';
import { TwilioRealtimeTransportLayer } from '@openai/agents-extensions';
import twilio from 'twilio';
import { WebSocketServer } from 'ws';
import http from 'http';
import dotenv from 'dotenv';
import { initializeApp } from 'firebase/app';
import { getFirestore } from 'firebase/firestore';

// Initialize dotenv
dotenv.config();

// Initialize Firebase
const firebaseConfig = {
  apiKey: process.env.FIREBASE_API_KEY,
  authDomain: process.env.FIREBASE_AUTH_DOMAIN,
  projectId: process.env.FIREBASE_PROJECT_ID,
  storageBucket: process.env.FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.FIREBASE_APP_ID
};

const firebaseApp = initializeApp(firebaseConfig);
const db = getFirestore(firebaseApp);

// Import utility functions
import { 
  reportSick, 
  calculateSickLeaveStats, 
  parseDateRange, 
  updateChartData,
  getSickLogs 
} from './lib/sickLogUtils.js';

import { 
  getEmployees,
  updateEmployee 
} from './lib/employeeUtils.js';

const VoiceResponse = twilio.twiml.VoiceResponse;
const app = express();
const server = http.createServer(app);

// Configure port
const PORT = process.env.PORT || 5050;

// Sample data (you can replace this with actual database queries)
const examplePolicyDocs = {
  "sick_leave": "Employees must notify their supervisor as soon as possible...",
  "vacation": "Vacation requests must be submitted at least 2 weeks in advance...",
  "benefits": "Full-time employees are eligible for health insurance...",
};

// Tool definitions
const supervisorAgentTools = [
  {
    name: "lookupPolicyDocument",
    description: "Tool zum Nachschlagen interner Dokumente und Richtlinien nach Thema oder Schlüsselwort.",
    parameters: {
      type: "object",
      properties: {
        topic: {
          type: "string",
          description: "Das Thema oder Schlüsselwort, nach dem in Unternehmensrichtlinien oder Dokumenten gesucht werden soll.",
        },
      },
      required: ["topic"],
    },
    needsApproval: () => false,
    execute: async (params) => {
      return examplePolicyDocs[params.topic] || "Keine Richtlinie zu diesem Thema gefunden.";
    }
  },
  {
    name: "updateEmployeeKrankStatus",
    description: "Tool zum Aktualisieren des Krankheitsstatus eines Mitarbeiters mit Grund und Zeitpunkt.",
    parameters: {
      type: "object",
      properties: {
        name: {
          type: "string",
          description: "Der vollständige Name des Mitarbeiters (z.B. 'Julia Schäfer').",
        },
        isKrank: {
          type: "boolean",
          description: "Der neue Krankheitsstatus (true = krank, false = nicht krank).",
        },
        reason: {
          type: "string",
          description: "Der Grund für die Abwesenheit (z.B. 'Grippe', 'Arzttermin').",
        },
        reportedAt: {
          type: "string",
          description: "Der Zeitpunkt der Krankmeldung (ISO-String). Wenn nicht angegeben, wird der aktuelle Zeitpunkt verwendet.",
        },
      },
      required: ["name", "isKrank"],
    },
    needsApproval: () => false,
    execute: async (params) => {
      const updateResult = await updateEmployee(params.name, {
        isKrank: params.isKrank,
        reason: params.reason,
        reportedAt: params.reportedAt || new Date().toISOString()
      });
      console.log('Employee status updated:', updateResult);
      return updateResult;
    }
  },
  {
    name: "reportEmployeeSick",
    description: "Tool zum Melden einer Krankmeldung eines Mitarbeiters.",
    parameters: {
      type: "object",
      properties: {
        name: {
          type: "string",
          description: "Der vollständige Name des Mitarbeiters (z.B. 'Julia Schäfer').",
        },
        reason: {
          type: "string",
          description: "Der Grund für die Abwesenheit (z.B. 'Grippe', 'Arzttermin').",
        }
      },
      required: ["name"],
    },
    needsApproval: () => false,
    execute: async (params) => {
      const sickResult = await reportSick(params.name, params.reason);
      console.log('Sick report created:', sickResult);
      return sickResult;
    }
  },
  {
    name: "reportEmployeeVacation",
    description: "Tool zum Melden eines Urlaubs eines Mitarbeiters.",
    parameters: {
      type: "object",
      properties: {
        name: {
          type: "string",
          description: "Der vollständige Name des Mitarbeiters (z.B. 'Julia Schäfer').",
        },
        reason: {
          type: "string",
          description: "Der Grund für den Urlaub (z.B. 'Erholung', 'Familienfeier').",
        },
        startDate: {
          type: "string",
          description: "Startdatum des Urlaubs (ISO-String).",
        },
        endDate: {
          type: "string",
          description: "Enddatum des Urlaubs (ISO-String).",
        },
        additionalNotes: {
          type: "string",
          description: "Weitere Informationen zum Urlaub (optional).",
        }
      },
      required: ["name", "startDate", "endDate"],
    },
    needsApproval: () => false,
    execute: async (params) => {
      const vacationResult = {
        success: true,
        message: "Urlaub wurde eingetragen.",
        data: {
          name: params.name,
          startDate: params.startDate,
          endDate: params.endDate,
          reason: params.reason,
          additionalNotes: params.additionalNotes
        }
      };
      console.log('Vacation report created:', vacationResult);
      return vacationResult;
    }
  },
  {
    name: "sendEmail",
    description: "Sendet eine Benachrichtigung an HR über Krankheit oder Urlaub.",
    parameters: {
      type: "object",
      properties: {
        type: {
          type: "string",
          enum: ["sick", "vacation"],
          description: "Art der Meldung (Krankheit oder Urlaub)",
        },
        name: {
          type: "string",
          description: "Name des Mitarbeiters",
        },
        reason: {
          type: "string", 
          description: "Grund der Abwesenheit (Krankheit oder Urlaub)",
        },
        expectedDuration: {
          type: "string",
          description: "Voraussichtliche Dauer (nur für Krankheit)",
        },
        startDate: {
          type: "string",
          description: "Startdatum (nur für Urlaub)",
        },
        endDate: {
          type: "string",
          description: "Enddatum (nur für Urlaub)",
        },
        additionalNotes: {
          type: "string",
          description: "Weitere Informationen",
        }
      },
      required: ["type", "name"],
    },
    needsApproval: () => false,
    execute: async (params) => {
      const emailResult = {
        success: true,
        message: "Email wurde gesendet.",
        data: {
          type: params.type,
          name: params.name,
          reason: params.reason,
          ...params
        }
      };
      console.log('Email sent:', emailResult);
      return emailResult;
    }
  },
  {
    name: "getSickLeaveStats",
    description: "Tool zum Abrufen von Krankmeldungsstatistiken für einen bestimmten Zeitraum.",
    parameters: {
      type: "object",
      properties: {
        period: {
          type: "string",
          description: "Der Zeitraum für die Statistik (z.B. 'August 2025')",
        },
        groupBy: {
          type: "string",
          enum: ["day", "week", "month"],
          description: "Wie die Daten gruppiert werden sollen",
        },
      },
      required: ["period", "groupBy"],
    },
    needsApproval: () => false,
    execute: async (params) => {
      const { startDate, endDate } = parseDateRange(params.period);
      const stats = await calculateSickLeaveStats(startDate, endDate, params.groupBy);
      await updateChartData(stats, `Anzahl der Krankmeldungen für ${params.period}`);
      console.log('Stats generated:', stats);
      return {
        message: `Statistik für ${params.period} wurde erstellt.`,
        stats: stats
      };
    }
  }
];

// Create a new RealtimeAgent instance with the tools
const agent = new RealtimeAgent({
  name: "HR Assistant",
  tools: supervisorAgentTools,
  instructions: `Du bist der BackOffice Spezialist im HR Bereich der NEA. Du bist im direkten Telefonkontakt mit einem Angestellten.

WICHTIGE DATUMSPARSING-REGELN:
- Wenn jemand "heute" sagt, verwende das aktuelle Datum (${new Date().toISOString().split('T')[0]})
- Wenn jemand "morgen" sagt, verwende das morgige Datum
- Wenn jemand "in einer Woche" oder "nächste Woche" sagt, rechne 7 Tage zum aktuellen Datum
- Wenn jemand "in 2 Wochen" sagt, rechne 14 Tage zum aktuellen Datum
- Wenn jemand "nächsten Montag" sagt, finde den nächsten Montag
- Konvertiere alle relativen Datenangaben in ISO-Format (YYYY-MM-DD)
- Verwende IMMER das aktuelle Jahr, es sei denn, es wird explizit ein anderes Jahr genannt

Wenn der Mitarbeiter eine Krankmeldung einreichen möchte, benötigst du folgende Informationen:
- Voller Name
- Krankheitsgrund
- Voraussichtliche Dauer
- Optional weitere Infos
Sobald alle erforderlichen Daten vorliegen:
1. Rufe reportEmployeeSick auf
2. Rufe sendEmail auf (type="sick")

Wenn der Mitarbeiter Urlaub einreichen möchte, benötigst du folgende Informationen:
- Voller Name
- Urlaubsgrund
- Start- und Enddatum
- Optional weitere Infos
BEACHTE: Bei relativen Datumsangaben wie "heute bis in einer Woche" konvertiere diese in konkrete ISO-Daten.
Sobald alle erforderlichen Daten vorliegen:
1. Rufe reportEmployeeVacation auf
2. Rufe sendEmail auf (type="vacation")

Für Statistiken kannst du das getSickLeaveStats Tool verwenden.

Sprich in kurzen, klaren Sätzen und bestätige immer die eingegebenen Daten bevor du die Tools aufrufst.
Fange das Gespräch immer mit "Hi, hier spricht der HR Assistent der NEA, wie kann ich dir heute helfen?" an.`
});

// WebSocket setup for real-time communication
const wss = new WebSocketServer({ server });

wss.on('connection', (ws) => {
  console.log('New WebSocket connection');
  
  const session = new RealtimeSession(agent);
  
  ws.on('message', async (message) => {
    try {
      const data = JSON.parse(message);
      console.log('Received message:', data);
      
      const response = await session.sendMessage(data.message);
      ws.send(JSON.stringify({ type: 'response', content: response }));
    } catch (error) {
      console.error('Error processing message:', error);
      ws.send(JSON.stringify({ type: 'error', content: error.message }));
    }
  });
  
  ws.on('close', () => {
    console.log('Client disconnected');
    session.cleanup();
  });
});

// Express routes
app.use(express.json());

app.post('/webhook', async (req, res) => {
  const twiml = new VoiceResponse();
  // Handle Twilio webhook
  res.type('text/xml');
  res.send(twiml.toString());
});

// Start the server
server.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
}); 