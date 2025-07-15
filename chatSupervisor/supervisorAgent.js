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
        When handling sick leave or vacation requests, make sure to get all necessary information.
        
        IMPORTANT: Always use tools when appropriate. For example:
        - When someone mentions being sick, use reportEmployeeSick
        - When someone asks about policies, use lookupPolicyDocument
        - When someone requests vacation, use reportEmployeeVacation`
    });
  }

  async handleMessage(message, session) {
    try {
      console.log('SupervisorAgent received message:', message);
      const response = await super.handleMessage(message, session);
      console.log('SupervisorAgent response:', JSON.stringify(response, null, 2));
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