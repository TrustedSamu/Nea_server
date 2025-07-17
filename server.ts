import Fastify from 'fastify';
import dotenv from 'dotenv';
import fastifyFormBody from '@fastify/formbody';
import fastifyWs from '@fastify/websocket';
import { RealtimeAgent, RealtimeSession, tool } from '@openai/agents/realtime';
import { TwilioRealtimeTransportLayer } from '@openai/agents-extensions';
import { z } from 'zod';

// Load environment variables from .env file
dotenv.config();

// Retrieve the OpenAI API key from environment variables
const { OPENAI_API_KEY } = process.env;
if (!OPENAI_API_KEY) {
  console.error('Missing OpenAI API key. Please set it in the .env file.');
  process.exit(1);
}
const PORT = +(process.env.PORT || 5050);

// Initialize Fastify
const fastify = Fastify();
fastify.register(fastifyFormBody);
fastify.register(fastifyWs);

// Sample data (simplified versions for voice agent)
const exampleAccountInfo = {
  name: "Julia Schäfer",
  phone: "(555) 123-4567",
  position: "Verkäuferin",
  department: "Einzelhandel",
  startDate: "2023-01-15",
  status: "aktiv"
};

const examplePolicyDocs = {
  "krankmeldung": "Krankmeldungen müssen bis 9:00 Uhr am ersten Krankheitstag gemeldet werden. Ein ärztliches Attest ist ab dem dritten Tag erforderlich.",
  "urlaub": "Urlaubsanträge sind mindestens 2 Wochen im Voraus zu stellen. Der Antrag muss von der direkten Führungskraft genehmigt werden.",
  "arbeitszeit": "Reguläre Arbeitszeiten sind Montag bis Freitag von 8:00 bis 17:00 Uhr. Flexible Arbeitszeiten nach Absprache möglich."
};

const exampleStoreLocations = [
  { name: "NEA Hauptfiliale", address: "Hauptstraße 123, 68159 Mannheim", distance: "2.3 km" },
  { name: "NEA Süd", address: "Südring 45, 68169 Mannheim", distance: "5.7 km" }
];

// Enhanced tools for HR voice agent
const lookupPolicyTool = tool({
  name: 'lookupPolicyDocument',
  description: 'Nachschlagen von internen Dokumenten und Richtlinien nach Thema',
  parameters: z.object({
    topic: z.string().describe('Das Thema nach dem gesucht werden soll (z.B. krankmeldung, urlaub, arbeitszeit)')
  }),
  execute: async ({ topic }) => {
    const result = examplePolicyDocs[topic.toLowerCase() as keyof typeof examplePolicyDocs];
    if (result) {
      return `Richtlinie für ${topic}: ${result}`;
    }
    return `Keine Richtlinie für das Thema "${topic}" gefunden. Verfügbare Themen: Krankmeldung, Urlaub, Arbeitszeit.`;
  }
});

const getUserAccountTool = tool({
  name: 'getUserAccountInfo',
  description: 'Abrufen von Mitarbeiterinformationen anhand der Telefonnummer',
  parameters: z.object({
    phone_number: z.string().describe('Telefonnummer im Format (xxx) xxx-xxxx')
  }),
  execute: async ({ phone_number }) => {
    // Simplified lookup - in real implementation, this would query a database
    if (phone_number.includes('123-4567')) {
      return `Mitarbeiter gefunden: ${exampleAccountInfo.name}, Position: ${exampleAccountInfo.position}, Abteilung: ${exampleAccountInfo.department}, Status: ${exampleAccountInfo.status}`;
    }
    return `Kein Mitarbeiter mit der Telefonnummer ${phone_number} gefunden.`;
  }
});

const findNearestStoreTool = tool({
  name: 'findNearestStore',
  description: 'Finden des nächstgelegenen Standorts anhand einer Postleitzahl',
  parameters: z.object({
    zip_code: z.string().describe('5-stellige Postleitzahl')
  }),
  execute: async ({ zip_code }) => {
    const stores = exampleStoreLocations.map(store => 
      `${store.name}: ${store.address} (${store.distance} entfernt)`
    ).join('\n');
    return `Nächstgelegene Standorte für PLZ ${zip_code}:\n${stores}`;
  }
});

const reportEmployeeSickTool = tool({
  name: 'reportEmployeeSick',
  description: 'Melden einer Krankmeldung eines Mitarbeiters',
  parameters: z.object({
    name: z.string().describe('Vollständiger Name des Mitarbeiters'),
    reason: z.string().describe('Grund der Krankheit (z.B. Grippe, Arzttermin)'),
    expectedDuration: z.string().nullable().optional().describe('Voraussichtliche Dauer der Abwesenheit'),
    additionalNotes: z.string().nullable().optional().describe('Weitere Informationen')
  }),
  execute: async ({ name, reason, expectedDuration, additionalNotes }) => {
    const reportedAt = new Date().toISOString();
    console.log(`🏥 Krankmeldung registriert: ${name} - ${reason} (${reportedAt})`);
    
    // In real implementation, this would save to database
    return `Krankmeldung für ${name} wurde erfolgreich registriert. Grund: ${reason}. Gemeldet am: ${new Date().toLocaleString('de-DE')}. ${expectedDuration ? `Voraussichtliche Dauer: ${expectedDuration}.` : ''} Eine E-Mail-Benachrichtigung wurde an die Personalabteilung gesendet.`;
  }
});

const reportEmployeeVacationTool = tool({
  name: 'reportEmployeeVacation',
  description: 'Melden eines Urlaubs eines Mitarbeiters',
  parameters: z.object({
    name: z.string().describe('Vollständiger Name des Mitarbeiters'),
    reason: z.string().describe('Grund für den Urlaub (z.B. Erholung, Familienfeier)'),
    startDate: z.string().describe('Startdatum des Urlaubs im Format YYYY-MM-DD'),
    endDate: z.string().describe('Enddatum des Urlaubs im Format YYYY-MM-DD'),
    additionalNotes: z.string().nullable().optional().describe('Weitere Informationen zum Urlaub')
  }),
  execute: async ({ name, reason, startDate, endDate, additionalNotes }) => {
    const reportedAt = new Date().toISOString();
    console.log(`🏖️ Urlaubsantrag registriert: ${name} - ${startDate} bis ${endDate} (${reason})`);
    
    // In real implementation, this would save to database
    const startDateFormatted = new Date(startDate).toLocaleDateString('de-DE');
    const endDateFormatted = new Date(endDate).toLocaleDateString('de-DE');
    
    return `Urlaubsantrag für ${name} wurde erfolgreich registriert. Zeitraum: ${startDateFormatted} bis ${endDateFormatted}. Grund: ${reason}. ${additionalNotes ? `Weitere Informationen: ${additionalNotes}.` : ''} Eine E-Mail-Benachrichtigung wurde an die Personalabteilung gesendet.`;
  }
});

const sendEmailTool = tool({
  name: 'sendEmail',
  description: 'Sendet eine Benachrichtigung an die Personalabteilung über Krankheit oder Urlaub',
  parameters: z.object({
    type: z.enum(['sick', 'vacation']).describe('Art der Meldung: sick für Krankheit, vacation für Urlaub'),
    name: z.string().describe('Name des Mitarbeiters'),
    reason: z.string().describe('Grund der Abwesenheit'),
    expectedDuration: z.string().nullable().optional().describe('Voraussichtliche Dauer (nur für Krankheit)'),
    startDate: z.string().nullable().optional().describe('Startdatum (nur für Urlaub)'),
    endDate: z.string().nullable().optional().describe('Enddatum (nur für Urlaub)'),
    additionalNotes: z.string().nullable().optional().describe('Weitere Informationen')
  }),
  execute: async ({ type, name, reason, expectedDuration, startDate, endDate, additionalNotes }) => {
    console.log(`📧 E-Mail wird gesendet: ${type} - ${name}`);
    
    // In real implementation, this would send actual email
    const subject = type === 'sick' ? `Krankmeldung: ${name}` : `Urlaubsantrag: ${name}`;
    const timestamp = new Date().toLocaleString('de-DE');
    
    return `E-Mail-Benachrichtigung wurde erfolgreich an die Personalabteilung gesendet. Betreff: "${subject}". Gesendet am: ${timestamp}.`;
  }
});

const getSickLeaveStatsTool = tool({
  name: 'getSickLeaveStats',
  description: 'Abrufen von Krankmeldungsstatistiken für einen bestimmten Zeitraum',
  parameters: z.object({
    period: z.string().describe('Zeitraum für die Statistik (z.B. "Januar 2025", "letzte Woche")'),
    groupBy: z.enum(['day', 'week', 'month']).describe('Gruppierung der Daten: day, week oder month')
  }),
  execute: async ({ period, groupBy }) => {
    console.log(`📊 Statistik angefordert: ${period} gruppiert nach ${groupBy}`);
    
    // In real implementation, this would query database for actual stats
    const mockStats = [
      { name: 'Montag', value: 2 },
      { name: 'Dienstag', value: 1 },
      { name: 'Mittwoch', value: 3 },
      { name: 'Donnerstag', value: 0 },
      { name: 'Freitag', value: 1 }
    ];
    
    const statsDetails = mockStats.map(stat => `${stat.name}: ${stat.value} Krankmeldungen`).join(', ');
    
    return `Krankmeldungsstatistik für ${period}: ${statsDetails}. Insgesamt ${mockStats.reduce((sum, stat) => sum + stat.value, 0)} Krankmeldungen in diesem Zeitraum.`;
  }
});

// Create the enhanced RealtimeAgent with German HR instructions
const agent = new RealtimeAgent({
  name: 'NEA HR Front-Desk Agent',
  voice: 'coral', // Warm, professional female voice
  instructions: `Du bist der Front-Desk Agent der NEA Personalabteilung. Du sprichst direkt mit Angestellten am Telefon und hilfst ihnen bei HR-Angelegenheiten.

WICHTIGE REGELN FÜR TELEFONATE:
- Sprich klar und deutlich, da dies ein Telefonat ist
- Bestätige IMMER Namen und wichtige Informationen durch Buchstabieren
- Sei geduldig und freundlich
- Stelle nur eine Frage zur Zeit
- Warte auf die Antwort bevor du fortfährst

DEINE HAUPTAUFGABEN:
1. KRANKMELDUNGEN: Sammle vollständigen Namen, Krankheitsgrund, voraussichtliche Dauer und rufe dann reportEmployeeSick und sendEmail auf
2. URLAUBSANTRÄGE: Sammle vollständigen Namen, Urlaubsgrund, Start- und Enddatum und rufe dann reportEmployeeVacation und sendEmail auf  
3. RICHTLINIEN: Beantworte Fragen zu Unternehmensrichtlinien mit lookupPolicyDocument
4. MITARBEITERSUCHE: Finde Mitarbeiterinformationen mit getUserAccountInfo
5. STANDORTSUCHE: Finde nächste Standorte mit findNearestStore

DATUMS-PARSING FÜR TELEFONATE:
- "heute" = ${new Date().toISOString().split('T')[0]}
- "morgen" = berechne morgiges Datum
- "nächste Woche" = +7 Tage
- "in zwei Wochen" = +14 Tage
- Bestätige IMMER das geparste Datum mit dem Anrufer

GESPRÄCHSABLAUF FÜR KRANKMELDUNGEN:
1. "Guten Tag, hier ist die NEA Personalabteilung. Ich verstehe, Sie möchten sich krankmelden?"
2. "Können Sie mir bitte Ihren vollständigen Namen nennen? Buchstabieren Sie den Nachnamen bitte."
3. "Was ist der Grund für Ihre Erkrankung?"
4. "Wie lange werden Sie voraussichtlich ausfallen?"
5. Rufe reportEmployeeSick und sendEmail auf
6. "Ihre Krankmeldung wurde registriert. Gute Besserung!"

GESPRÄCHSABLAUF FÜR URLAUB:
1. "Guten Tag, hier ist die NEA Personalabteilung. Sie möchten einen Urlaubsantrag stellen?"
2. "Können Sie mir bitte Ihren vollständigen Namen nennen?"
3. "Was ist der Grund für Ihren Urlaub?"
4. "An welchem Datum beginnt Ihr Urlaub?" (bestätige Datum)
5. "An welchem Datum endet Ihr Urlaub?" (bestätige Datum)
6. Rufe reportEmployeeVacation und sendEmail auf
7. "Ihr Urlaubsantrag wurde eingereicht und wird bearbeitet."

Sei immer höflich, professionell und hilfsbereit. Dies ist ein wichtiger Service für unsere Mitarbeiter.`,
  
  tools: [
    lookupPolicyTool,
    getUserAccountTool,
    findNearestStoreTool,
    reportEmployeeSickTool,
    reportEmployeeVacationTool,
    sendEmailTool,
    getSickLeaveStatsTool
  ]
});

// Root Route
fastify.get('/', async (request, reply) => {
  reply.send({ message: 'Twilio Media Stream Server is running!' });
});

// Route for Twilio to handle incoming and outgoing calls
// <Say> punctuation to improve text-to-speech translation
fastify.all('/incoming-call', async (request, reply) => {
  console.log('📞 Incoming call webhook triggered!');
  console.log('📋 Request headers:', JSON.stringify(request.headers, null, 2));
  console.log('📋 Request body:', request.body);
  
  const host = request.headers.host;
  const websocketUrl = `wss://${host}/media-stream`;
  
  console.log('🔗 WebSocket URL for Twilio:', websocketUrl);
  
  const twimlResponse = `
<?xml version="1.0" encoding="UTF-8"?>
<Response>
    <Say>O.K. you can start talking!</Say>
    <Connect>
        <Stream url="${websocketUrl}" />
    </Connect>
</Response>`.trim();

  console.log('📜 TwiML Response:', twimlResponse);
  reply.type('text/xml').send(twimlResponse);
});

// WebSocket route for media-stream
fastify.register(async (fastify) => {
  fastify.get('/media-stream', { websocket: true }, async (connection) => {
    console.log('🌐 New WebSocket connection established');
    
    let mediaCount = 0;
    
    const twilioTransportLayer = new TwilioRealtimeTransportLayer({
      twilioWebSocket: connection.socket,
    });

    const session = new RealtimeSession(agent, {
      transport: twilioTransportLayer,
    });

    // Listen to raw Twilio events for debugging
    session.on('transport_event', (event) => {
      if (event.type === 'twilio_message') {
        const msg = event.message;
        
        if (msg.event === 'start') {
          console.log('🚀 Call started - audio stream beginning');
        } else if (msg.event === 'connected') {
          console.log('🔗 Twilio stream connected to our WebSocket');
        } else if (msg.event === 'media') {
          // Just count media, don't log each one
          mediaCount++;
          if (mediaCount % 50 === 0) {
            console.log(`🎵 Audio flowing - ${mediaCount} chunks received`);
          }
        } else if (msg.event === 'stop') {
          console.log('🛑 Call ended');
        }
      }
    });

    // Listen to all session events
    session.on('response.audio_transcript.delta', (event) => {
      console.log('🤖 AI Response:', event.delta);
    });

    session.on('input_audio_buffer.speech_started', () => {
      console.log('🎤 User started speaking');
    });

    session.on('input_audio_buffer.speech_stopped', () => {
      console.log('🎤 User stopped speaking');
    });

    session.on('response.created', () => {
      console.log('💭 AI is generating response...');
    });

    session.on('error', (error) => {
      console.error('❌ Session error:', error);
    });

    // Add additional logging for session state changes
    console.log('🎯 Creating session with transport layer...');

    try {
      // Connect immediately after creating the transport layer
      await session.connect({
        apiKey: OPENAI_API_KEY,
      });
      console.log('✅ Successfully connected to OpenAI Realtime API!');
    } catch (error) {
      console.error('❌ Failed to connect to OpenAI:', error);
    }
  });
});

fastify.listen({ port: PORT }, (err) => {
  if (err) {
    console.error(err);
    process.exit(1);
  }
  console.log(`Server is listening on port ${PORT}`);
});

process.on('SIGINT', () => {
  fastify.close();
  process.exit(0);
}); 