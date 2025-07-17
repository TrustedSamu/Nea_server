Agents
======

Learn how to build agents with the OpenAI API.

Agents represent **systems that intelligently accomplish tasks**, ranging from executing simple workflows to pursuing complex, open-ended objectives.

OpenAI provides a **rich set of composable primitives that enable you to build agents**. This guide walks through those primitives, and how they come together to form a robust agentic platform.

Overview
--------

Building agents involves assembling components across several domains—such as **models, tools, knowledge and memory, audio and speech, guardrails, and orchestration**—and OpenAI provides composable primitives for each.

|Domain|Description|OpenAI Primitives|
|---|---|---|
|Models|Core intelligence capable of reasoning, making decisions, and processing different modalities.|o1, o3-mini, GPT-4.5, GPT-4o, GPT-4o-mini|
|Tools|Interface to the world, interact with environment, function calling, built-in tools, etc.|Function calling, Web search, File search, Computer use|
|Knowledge and memory|Augment agents with external and persistent knowledge.|Vector stores, File search, Embeddings|
|Audio and speech|Create agents that can understand audio and respond back in natural language.|Audio generation, realtime, Audio agents|
|Guardrails|Prevent irrelevant, harmful, or undesirable behavior.|Moderation, Instruction hierarchy (Python), Instruction hierarchy (TypeScript)|
|Orchestration|Develop, deploy, monitor, and improve agents.|Python Agents SDK, TypeScript Agents SDK, Tracing, Evaluations, Fine-tuning|
|Voice agents|Create agents that can understand audio and respond back in natural language.|Realtime API, Voice support in the Python Agents SDK, Voice support in the TypeScript Agents SDK|

Models
------

|Model|Agentic Strengths|
|---|---|
|o3 and o4-mini|Best for long-term planning, hard tasks, and reasoning.|
|GPT-4.1|Best for agentic execution.|
|GPT-4.1-mini|Good balance of agentic capability and latency.|
|GPT-4.1-nano|Best for low-latency.|

Large language models (LLMs) are at the core of many agentic systems, responsible for making decisions and interacting with the world. OpenAI’s models support a wide range of capabilities:

*   **High intelligence:** Capable of [reasoning](/docs/guides/reasoning) and planning to tackle the most difficult tasks.
*   **Tools:** [Call your functions](/docs/guides/function-calling) and leverage OpenAI's [built-in tools](/docs/guides/tools).
*   **Multimodality:** Natively understand text, images, audio, code, and documents.
*   **Low-latency:** Support for [real-time audio](/docs/guides/realtime) conversations and smaller, faster models.

For detailed model comparisons, visit the [models](/docs/models) page.

Tools
-----

Tools enable agents to interact with the world. OpenAI supports [**function calling**](/docs/guides/function-calling) to connect with your code, and [**built-in tools**](/docs/guides/tools) for common tasks like web searches and data retrieval.

|Tool|Description|
|---|---|
|Function calling|Interact with developer-defined code.|
|Web search|Fetch up-to-date information from the web.|
|File search|Perform semantic search across your documents.|
|Computer use|Understand and control a computer or browser.|
|Local shell|Execute commands on a local machine.|

Knowledge and memory
--------------------

Knowledge and memory help agents store, retrieve, and utilize information beyond their initial training data. **Vector stores** enable agents to search your documents semantically and retrieve relevant information at runtime. Meanwhile, **embeddings** represent data efficiently for quick retrieval, powering dynamic knowledge solutions and long-term agent memory. You can integrate your data using OpenAI’s [vector stores](/docs/guides/retrieval#vector-stores) and [Embeddings API](/docs/guides/embeddings).

Guardrails
----------

Guardrails ensure your agents behave safely, consistently, and within your intended boundaries—critical for production deployments. Use OpenAI’s free [Moderation API](/docs/guides/moderation) to automatically filter unsafe content. Further control your agent’s behavior by leveraging the [instruction hierarchy](https://openai.github.io/openai-agents-python/guardrails/), which prioritizes developer-defined prompts and mitigates unwanted agent behaviors.

Orchestration
-------------

Building agents is a process. OpenAI provides tools to effectively build, deploy, monitor, evaluate, and improve agentic systems.

![Agent Traces UI in OpenAI Dashboard](https://cdn.openai.com/API/docs/images/orchestration.png)

|Phase|Description|OpenAI Primitives|
|---|---|---|
|Build and deploy|Rapidly build agents, enforce guardrails, and handle conversational flows using the Agents SDK.|Agents SDK Python, Agents SDK TypeScript|
|Monitor|Observe agent behavior in real-time, debug issues, and gain insights through tracing.|Tracing|
|Evaluate and improve|Measure agent performance, identify areas for improvement, and refine your agents.|EvaluationsFine-tuning|

Get started
-----------

Python

```bash
pip install openai-agents
```

[

View the documentation

Check out our documentation for more information on how to get started with the Agents SDK for Python.

](https://openai.github.io/openai-agents-python/)[

View the Python repository

The OpenAI Agents SDK for Python is open source. Check out our repository for implementation details and a collection of examples.

](https://github.com/openai/openai-agents-python)

TypeScript/JavaScript

```bash
npm install @openai/agents
```

[

View the documentation

Check out our documentation for more information on how to get started with the Agents SDK for TypeScript.

](https://openai.github.io/openai-agents-js/)[

Check out the code

The OpenAI Agents SDK for TypeScript is open source. Check out our repository for implementation details and a collection of examples.

](https://github.com/openai/openai-agents-js)


Overview
The OpenAI Agents SDK for TypeScript enables you to build agentic AI apps in a lightweight, easy-to-use package with very few abstractions. It’s a production-ready upgrade of our previous experimentation for agents, Swarm that’s also available in Python. The Agents SDK has a very small set of primitives:

Agents, which are LLMs equipped with instructions and tools
Handoffs, which allow agents to delegate to other agents for specific tasks
Guardrails, which enable the inputs to agents to be validated
In combination with TypeScript, these primitives are powerful enough to express complex relationships between tools and agents, and allow you to build real-world applications without a steep learning curve. In addition, the SDK comes with built-in tracing that lets you visualize and debug your agentic flows, as well as evaluate them and even fine-tune models for your application.

Why use the Agents SDK
The SDK has two driving design principles:

Enough features to be worth using, but few enough primitives to make it quick to learn.
Works great out of the box, but you can customize exactly what happens.
Here are the main features of the SDK:

Agent loop: Built-in agent loop that handles calling tools, sending results to the LLM, and looping until the LLM is done.
TypeScript-first: Use built-in language features to orchestrate and chain agents, rather than needing to learn new abstractions.
Handoffs: A powerful feature to coordinate and delegate between multiple agents.
Guardrails: Run input validations and checks in parallel to your agents, breaking early if the checks fail.
Function tools: Turn any TypeScript function into a tool, with automatic schema generation and Zod-powered validation.
Tracing: Built-in tracing that lets you visualize, debug and monitor your workflows, as well as use the OpenAI suite of evaluation, fine-tuning and distillation tools.
Realtime Agents: Build powerful voice agents including automatic interruption detection, context management, guardrails, and more.
Installation
This SDK currently does not work with zod@3.25.68 and above. Please install zod@3.25.67 (or any older version) explicitly. We will resolve this dependency issue soon. Please check this issue for updates.

Terminal window
npm install @openai/agents 'zod@<=3.25.67'

Hello world example
Hello World
import { Agent, run } from '@openai/agents';

const agent = new Agent({
  name: 'Assistant',
  instructions: 'You are a helpful assistant',
});

const result = await run(
  agent,
  'Write a haiku about recursion in programming.',
);
console.log(result.finalOutput);

// Code within the code,
// Functions calling themselves,
// Infinite loop's dance.

(If running this, ensure you set the OPENAI_API_KEY environment variable)

Terminal window
export OPENAI_API_KEY=sk-...