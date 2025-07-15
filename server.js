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
    type: "function",
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
  },
  {
    type: "function",
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
  },
  {
    type: "function",
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
  },
  {
    type: "function",
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
  },
  {
    type: "function",
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
  },
  {
    type: "function",
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
  }
];

// Tool implementations
async function handleToolCall(toolName, params) {
  try {
    switch (toolName) {
      case "lookupPolicyDocument":
        return examplePolicyDocs[params.topic] || "Keine Richtlinie zu diesem Thema gefunden.";
      
      case "updateEmployeeKrankStatus":
        return await updateEmployee(params.name, {
          isKrank: params.isKrank,
          reason: params.reason,
          reportedAt: params.reportedAt || new Date().toISOString()
        });
      
      case "reportEmployeeSick":
        return await reportSick(params.name, params.reason);
      
      case "reportEmployeeVacation":
        // You need to implement the vacation reporting functionality
        return { success: true, message: "Urlaub wurde eingetragen." };
      
      case "sendEmail":
        // Implement email sending functionality
        return { success: true, message: "Email wurde gesendet." };
      
      case "getSickLeaveStats":
        const { startDate, endDate } = parseDateRange(params.period);
        const stats = await calculateSickLeaveStats(startDate, endDate, params.groupBy);
        updateChartData(stats, `Anzahl der Krankmeldungen für ${params.period}`);
        return {
          message: `Statistik für ${params.period} wurde erstellt.`,
          stats: stats
        };
      
      default:
        throw new Error(`Unknown tool: ${toolName}`);
    }
  } catch (error) {
    console.error(`Error executing tool ${toolName}:`, error);
    throw error;
  }
}

// Create the agent with supervisor capabilities
const agent = new RealtimeAgent({
  name: 'HR Assistant',
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
Fange das Gespräch immer mit "Hi, hier spricht der HR Assistent der NEA, wie kann ich dir heute helfen?" an.`,
  tools: supervisorAgentTools
});

// WebSocket server for media streams
const wss = new WebSocketServer({ 
  server,
  path: '/media-stream'
});

wss.on('connection', async (ws) => {
  console.log('New Twilio connection');
  let isAgentSpeaking = false;
  
  try {
    // Create Twilio transport layer with turn detection
    const twilioTransport = new TwilioRealtimeTransportLayer({
      twilioWebSocket: ws,
      turnConfig: {
        mode: 'server_vad',
        vadLevel: 2,
        vadTimeoutMs: 1500,
        interruptible: true,
        interruptionThresholdMs: 800
      }
    });

    // Create and connect session
    const session = new RealtimeSession(agent, {
      transport: twilioTransport,
      sessionOptions: {
        responseFormat: {
          type: 'text',
          voice: 'alloy'
        },
        temperature: 0.7,
        maxTokens: 100
      }
    });

    // Handle tool calls
    session.on('tool_call', async (toolCall) => {
      try {
        const result = await handleToolCall(toolCall.name, JSON.parse(toolCall.arguments));
        session.sendToolResponse(toolCall.id, result);
      } catch (error) {
        console.error('Tool call error:', error);
        session.sendToolResponse(toolCall.id, { error: error.message });
      }
    });

    // Track when agent starts/stops speaking
    session.on('response.started', () => {
      console.log('Agent started speaking');
      isAgentSpeaking = true;
    });

    session.on('response.finished', () => {
      console.log('Agent finished speaking');
      isAgentSpeaking = false;
    });

    // Handle user turns
    session.on('turn_start', () => {
      console.log('Turn started - User is speaking');
      if (isAgentSpeaking) {
        try {
          session.stopResponse();
          console.log('Stopped agent response due to user turn');
        } catch (error) {
          if (!error.message?.includes('response_cancel_not_active')) {
            console.error('Error stopping response:', error);
          }
        }
      }
    });

    session.on('turn_end', () => {
      console.log('Turn ended - User finished speaking');
    });

    await session.connect({
      apiKey: process.env.OPENAI_API_KEY
    });
    
    console.log('Connected to OpenAI Realtime API');
    
    // Handle session close
    session.on('close', () => {
      console.log('Session closed');
      ws.close();
    });

    // Handle errors
    session.on('error', (error) => {
      if (!error?.error?.error?.code?.includes('response_cancel_not_active')) {
        console.error('Session error:', error);
      }
    });

  } catch (error) {
    console.error('Error setting up session:', error);
    ws.close();
  }
});

// Root route
app.get('/', (req, res) => {
  res.send({ message: 'Twilio Media Stream Server is running!' });
});

// Twilio incoming call route
app.post('/incoming-call', (req, res) => {
  const response = new VoiceResponse();
  response.say('Willkommen bei der NEA HR Hotline.');
  const connect = response.connect();
  connect.stream({
    url: `wss://${req.headers.host}/media-stream`
  });
  
  res.type('text/xml');
  res.send(response.toString());
});

// Start server
server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
}); 