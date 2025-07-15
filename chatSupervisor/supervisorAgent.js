import { RealtimeAgent } from '@openai/agents/realtime';

export class SupervisorAgent extends RealtimeAgent {
  constructor(tools) {
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
- "Ich möchte Urlaub" → "Gerne. Ich brauche Ihren Namen und die Urlaubsdaten" (dann reportEmployeeVacation benutzen)`,
      responseFormat: {
        type: 'text',
        schema: {
          type: 'object',
          properties: {
            response: { type: 'string' },
            shouldUseTool: { type: 'boolean' },
            toolName: { type: 'string' },
            toolArgs: { type: 'object' }
          },
          required: ['response', 'shouldUseTool']
        }
      }
    });
  }

  async handleMessage(message, session) {
    console.log('\n### NEW MESSAGE RECEIVED ###');
    console.log('Message:', message);
    
    try {
      console.log('Calling super.handleMessage...');
      const response = await super.handleMessage(message, session);
      console.log('Got response from super.handleMessage');
      console.log('Response:', JSON.stringify(response, null, 2));
      
      // Check if the response indicates a tool should be used
      if (response.shouldUseTool && response.toolName && response.toolArgs) {
        console.log('\n🛠️ TOOL CALL REQUESTED 🛠️');
        console.log('Tool:', response.toolName);
        console.log('Args:', response.toolArgs);
        
        // Find the tool in our tools array
        const tool = this.tools.find(t => t.name === response.toolName);
        if (tool) {
          try {
            const result = await tool.function(response.toolArgs);
            console.log('\n✅ TOOL CALL SUCCESSFUL');
            console.log('Result:', result);
            return {
              content: response.response,
              toolCalls: [{
                name: response.toolName,
                arguments: JSON.stringify(response.toolArgs),
                result: result
              }]
            };
          } catch (error) {
            console.error('\n❌ TOOL CALL FAILED');
            console.error(error);
          }
        }
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