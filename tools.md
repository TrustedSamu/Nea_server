Tools
Tools let an Agent take actions – fetch data, call external APIs, execute code, or even use a computer. The JavaScript/TypeScript SDK supports four categories:

Hosted tools – run alongside the model on OpenAI servers. (web search, file search, computer use, code interpreter, image generation)
Function tools – wrap any local function with a JSON schema so the LLM can call it.
Agents as tools – expose an entire Agent as a callable tool.
Local MCP servers – attach a Model Context Protocol server running on your machine.
1. Hosted tools
When you use the OpenAIResponsesModel you can add the following built‑in tools:

Tool	Type string	Purpose
Web search	'web_search'	Internet search.
File / retrieval search	'file_search'	Query vector stores hosted on OpenAI.
Computer use	'computer'	Automate GUI interactions.
Code Interpreter	'code_interpreter'	Run code in a sandboxed environment.
Image generation	'image_generation'	Generate images based on text.
Hosted tools
import { Agent, webSearchTool, fileSearchTool } from '@openai/agents';

const agent = new Agent({
  name: 'Travel assistant',
  tools: [webSearchTool(), fileSearchTool('VS_ID')],
});

The exact parameter sets match the OpenAI Responses API – refer to the official documentation for advanced options like rankingOptions or semantic filters.

2. Function tools
You can turn any function into a tool with the tool() helper.

Function tool with Zod parameters
import { tool } from '@openai/agents';
import { z } from 'zod';

const getWeatherTool = tool({
  name: 'get_weather',
  description: 'Get the weather for a given city',
  parameters: z.object({ city: z.string() }),
  async execute({ city }) {
    return `The weather in ${city} is sunny.`;
  },
});

Options reference
Field	Required	Description
name	No	Defaults to the function name (e.g., get_weather).
description	Yes	Clear, human-readable description shown to the LLM.
parameters	Yes	Either a Zod schema or a raw JSON schema object. Zod parameters automatically enable strict mode.
strict	No	When true (default), the SDK returns a model error if the arguments don’t validate. Set to false for fuzzy matching.
execute	Yes	(args, context) => string | Promise<string>– your business logic. The optional second parameter is theRunContext.
errorFunction	No	Custom handler (context, error) => string for transforming internal errors into a user-visible string.
Non‑strict JSON‑schema tools
If you need the model to guess invalid or partial input you can disable strict mode when using raw JSON schema:

Non-strict JSON schema tools
import { tool } from '@openai/agents';

interface LooseToolInput {
  text: string;
}

const looseTool = tool({
  description: 'Echo input; be forgiving about typos',
  strict: false,
  parameters: {
    type: 'object',
    properties: { text: { type: 'string' } },
    required: ['text'],
    additionalProperties: true,
  },
  execute: async (input) => {
    // because strict is false we need to do our own verification
    if (typeof input !== 'object' || input === null || !('text' in input)) {
      return 'Invalid input. Please try again';
    }
    return (input as LooseToolInput).text;
  },
});

3. Agents as tools
Sometimes you want an Agent to assist another Agent without fully handing off the conversation. Use agent.asTool():

Agents as tools
import { Agent } from '@openai/agents';

const summarizer = new Agent({
  name: 'Summarizer',
  instructions: 'Generate a concise summary of the supplied text.',
});

const summarizerTool = summarizer.asTool({
  toolName: 'summarize_text',
  toolDescription: 'Generate a concise summary of the supplied text.',
});

const mainAgent = new Agent({
  name: 'Research assistant',
  tools: [summarizerTool],
});

Under the hood the SDK:

Creates a function tool with a single input parameter.
Runs the sub‑agent with that input when the tool is called.
Returns either the last message or the output extracted by customOutputExtractor.
4. Local MCP servers
You can expose tools via a local Model Context Protocol server and attach them to an agent. Use MCPServerStdio to spawn and connect to the server:

Local MCP server
import { Agent, MCPServerStdio } from '@openai/agents';

const server = new MCPServerStdio({
  fullCommand: 'npx -y @modelcontextprotocol/server-filesystem ./sample_files',
});

await server.connect();

const agent = new Agent({
  name: 'Assistant',
  mcpServers: [server],
});

See filesystem-example.ts for a complete example.

Tool use behaviour
Refer to the Agents guide for controlling when and how a model must use tools (tool_choice, toolUseBehavior, etc.).

Best practices
Short, explicit descriptions – describe what the tool does and when to use it.
Validate inputs – use Zod schemas for strict JSON validation where possible.
Avoid side‑effects in error handlers – errorFunction should return a helpful string, not throw.
One responsibility per tool – small, composable tools lead to better model reasoning.
Next steps
Learn about forcing tool use.
Add guardrails to validate tool inputs or outputs.
Dive into the TypeDoc reference for tool() and the various hosted tool types.