import express from 'express';
import { RealtimeSession } from '@openai/agents/realtime';
import { TwilioRealtimeTransportLayer } from '@openai/agents-extensions';
import twilio from 'twilio';
import { WebSocketServer } from 'ws';
import http from 'http';
import dotenv from 'dotenv';
import { initializeApp } from 'firebase/app';
import { getFirestore } from 'firebase/firestore';
import { createSupervisorAgent } from './chatSupervisor/index.js';

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

// Parse JSON bodies
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Handle incoming calls
app.post('/incoming-call', (req, res) => {
  const twiml = new VoiceResponse();
  twiml.say('Willkommen bei der NEA HR Hotline.');
  twiml.connect()
    .stream({
      url: `wss://${req.headers.host}/media-stream`
    });

  res.type('text/xml');
  res.send(twiml.toString());
});

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
    function: async (params) => {
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
    function: async (params) => {
      return await updateEmployee(params.name, {
        isKrank: params.isKrank,
        reason: params.reason,
        reportedAt: params.reportedAt || new Date().toISOString()
      });
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
    function: async (params) => {
      return await reportSick(params.name, params.reason);
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
    function: async (params) => {
      return { success: true, message: "Urlaub wurde eingetragen." };
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
    function: async (params) => {
      return { success: true, message: "Email wurde gesendet." };
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
    function: async (params) => {
      const { startDate, endDate } = parseDateRange(params.period);
      const stats = await calculateSickLeaveStats(startDate, endDate, params.groupBy);
      updateChartData(stats, `Anzahl der Krankmeldungen für ${params.period}`);
      return {
        message: `Statistik für ${params.period} wurde erstellt.`,
        stats: stats
      };
    }
  }
];

// Create supervisor agent instance
const supervisorAgent = createSupervisorAgent(supervisorAgentTools);

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
    const session = new RealtimeSession(supervisorAgent, {
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

    // Track when agent starts/stops speaking
    session.on('response.started', () => {
      console.log('\n### AGENT STARTED SPEAKING ###');
      isAgentSpeaking = true;
    });

    session.on('response.finished', () => {
      console.log('\n### AGENT FINISHED SPEAKING ###');
      isAgentSpeaking = false;
    });

    // Handle user turns
    session.on('turn_start', () => {
      console.log('\n### USER TURN STARTED ###');
      if (isAgentSpeaking) {
        try {
          session.stopResponse();
        } catch (error) {
          console.error('\n### ERROR STOPPING RESPONSE ###');
          console.error(error);
        }
      }
    });

    session.on('turn_end', () => {
      console.log('\n### USER TURN ENDED ###');
    });

    // Connect to OpenAI
    await session.connect({
      apiKey: process.env.OPENAI_API_KEY
    });
    
    console.log('Connected to OpenAI Realtime API');

    // Handle WebSocket messages
    ws.on('message', async (data) => {
      try {
        const message = JSON.parse(data);
        console.log('\n### RECEIVED WEBSOCKET MESSAGE ###');
        console.log('Message:', message);

        if (message.type === 'text') {
          const response = await supervisorAgent.handleMessage(message.content, session);
          console.log('\n### AGENT RESPONSE ###');
          console.log('Response:', response);

          twilioTransport.sendMessage({
            type: 'text',
            content: response.content,
            toolCalls: response.toolCalls || []
          });
        }
      } catch (error) {
        console.error('\n### ERROR PROCESSING MESSAGE ###');
        console.error(error);
        twilioTransport.sendMessage({
          type: 'text',
          content: 'Entschuldigung, es gab einen Fehler bei der Verarbeitung Ihrer Anfrage. Bitte versuchen Sie es erneut.',
          toolCalls: []
        });
      }
    });

    // Handle session close
    session.on('close', () => {
      console.log('\n### SESSION CLOSED ###');
      ws.close();
    });

    // Handle errors
    session.on('error', (error) => {
      console.error('\n### SESSION ERROR ###');
      console.error(error);
    });

  } catch (error) {
    console.error('\n### ERROR SETTING UP SESSION ###');
    console.error(error);
    ws.close();
  }
});

// Start the server
server.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
}); 