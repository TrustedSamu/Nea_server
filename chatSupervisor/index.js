import { SupervisorAgent } from './supervisorAgent.js';

export function createSupervisorAgent(tools) {
  return new SupervisorAgent(tools);
}

export { SupervisorAgent }; 