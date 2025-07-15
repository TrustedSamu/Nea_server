import { RealtimeAgent } from '@openai/agents/realtime';

export class SupervisorAgent extends RealtimeAgent {
  constructor(tools) {
    super({
      name: 'HR Assistant',
      model: 'gpt-4o-mini',
      tools: tools || [],
      instructions: `You are a helpful HR assistant that can help with sick leave and vacation requests. 
        You can look up policy documents, report sick leave, and handle vacation requests.
        Always be professional and courteous.
        When handling sick leave or vacation requests, make sure to get all necessary information.`
    });
  }

  async handleMessage(message, session) {
    try {
      const response = await super.handleMessage(message, session);
      return response;
    } catch (error) {
      console.error('Error in supervisor agent:', error);
      return {
        content: 'I apologize, but I encountered an error processing your request. Please try again.',
        toolCalls: []
      };
    }
  }
} 