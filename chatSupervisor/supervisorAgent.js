import { RealtimeAgent } from '@openai/agents/realtime';

export class SupervisorAgent extends RealtimeAgent {
  constructor(tools) {
    console.log('### INITIALIZING SUPERVISOR AGENT WITH TOOLS ###');
    super({
      name: 'HR Assistant',
      model: 'gpt-4o-mini',
      tools: tools || [],
      instructions: `Du bist der BackOffice Spezialist im HR Bereich der NEA. Du bist im direkten Telefonkontakt mit einem Angestellten.

WICHTIG - BENUTZE IMMER DIE TOOLS:
- Wenn jemand krank ist → reportEmployeeSick benutzen
- Wenn jemand nach Richtlinien fragt → lookupPolicyDocument benutzen
- Wenn jemand Urlaub möchte → reportEmployeeVacation benutzen
- Wenn jemand seinen Status ändern möchte → updateEmployeeKrankStatus benutzen
- Für Statistiken → getSickLeaveStats benutzen

WICHTIGE REGELN:
1. Antworte IMMER auf Deutsch
2. Benutze für JEDE relevante Anfrage die passenden Tools
3. Gib niemals Informationen ohne die Tools zu benutzen
4. Frage nach allen nötigen Informationen bevor du ein Tool benutzt

Beispiele für Tool-Nutzung:
- "Ich bin krank" → "Tut mir leid das zu hören. Ich melde Sie krank. Wie ist Ihr vollständiger Name?"
- "Wie sind die Urlaubsregeln?" → "Ich schaue in den Richtlinien nach" (lookupPolicyDocument benutzen)
- "Ich möchte Urlaub" → "Gerne. Ich brauche Ihren Namen und die Urlaubsdaten" (dann reportEmployeeVacation benutzen)`
    });
    console.log('### SUPERVISOR AGENT INITIALIZED ###');
  }

  async handleMessage(message, session) {
    console.log('\n### NEW MESSAGE RECEIVED ###');
    console.log('Message:', message);
    
    try {
      console.log('Calling super.handleMessage...');
      const response = await super.handleMessage(message, session);
      console.log('Got response from super.handleMessage');
      console.log('Response:', JSON.stringify(response, null, 2));
      
      if (response.toolCalls && response.toolCalls.length > 0) {
        console.log('\n🛠️ TOOL CALLS DETECTED 🛠️');
        console.log('Tools being called:', response.toolCalls.map(call => ({
          name: call.name,
          args: call.arguments
        })));
      } else {
        console.log('\n⚠️ NO TOOL CALLS IN RESPONSE ⚠️');
      }
      
      return response;
    } catch (error) {
      console.error('\n❌ ERROR IN SUPERVISOR AGENT ❌');
      console.error(error);
      return {
        content: 'Entschuldigung, es gab einen Fehler bei der Verarbeitung Ihrer Anfrage. Bitte versuchen Sie es erneut.',
        toolCalls: []
      };
    }
  }
} 