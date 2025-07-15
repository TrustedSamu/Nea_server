
Using Realtime Agents with Twilio

Twilio offers a Media Streams API that sends the raw audio from a phone call to a WebSocket server. This set up can be used to connect your voice agents to Twilio. You can use the default Realtime Session transport in websocket mode to connect the events coming from Twilio to your Realtime Session. However, this requires you to set the right audio format and adjust your own interruption timing as phone calls will naturally introduce more latency than a web-based converstaion.

To improve the set up experience, we’ve created a dedicated transport layer that handles the connection to Twilio for you, including handling interruptions and audio forwarding for you.

Caution

This adapter is still in beta. You may run into edge case issues or bugs. Please report any issues via GitHub issues and we’ll fix quickly.
Setup

Make sure you have a Twilio account and a Twilio phone number.

Set up a WebSocket server that can receive events from Twilio.

If you are developing locally, this will require you to configure a local tunnel like this will require you to configure a local tunnel like ngrok or Cloudflare Tunnel to make your local server accessible to Twilio. You can use the TwilioRealtimeTransportLayer to connect to Twilio.

Install the Twilio adapter by installing the extensions package:
Terminal window

npm install @openai/agents-extensions

Import the adapter and model to connect to your RealtimeSession:

import { TwilioRealtimeTransportLayer } from '@openai/agents-extensions';
import { RealtimeAgent, RealtimeSession } from '@openai/agents/realtime';

const agent = new RealtimeAgent({
  name: 'My Agent',
});

// Create a new transport mechanism that will bridge the connection between Twilio and
// the OpenAI Realtime API.
const twilioTransport = new TwilioRealtimeTransportLayer({
  twilioWebSocket: websocketConnection,
});

const session = new RealtimeSession(agent, {
  // set your own transport
  transport: twilioTransport,
});

Connect your RealtimeSession to Twilio:

session.connect({ apiKey: 'your-openai-api-key' });

Any event and behavior that you would expect from a RealtimeSession will work as expected including tool calls, guardrails, and more. Read the voice agents guide for more information on how to use the RealtimeSession with voice agents.
Tips and Considerations

    Speed is the name of the game.

    In order to receive all the necessary events and audio from Twilio, you should create your TwilioRealtimeTransportLayer instance as soon as you have a reference to the WebSocket connetion and immediately call session.connect() afterwards.

    Access the raw Twilio events.

    If you want to access the raw events that are being sent by Twilio, you can listen to the transport_event event on your RealtimeSession instance. Every event from Twilio will have a type of twilio_message and a message property that contains the raw event data.

    Watch debug logs.

    Sometimes you may run into issues where you want more information on what’s going on. Using a DEBUG=openai-agents* environment variable will show all the debug logs from the Agents SDK. Alternatively, you can enable just debug logs for the Twilio adapter using DEBUG=openai-agents:extensions:twilio*.

Full example server

Below is an example of a full end-to-end example of a WebSocket server that receives requests from Twilio and forwards them to a RealtimeSession.
Example server using Fastify

import Fastify from 'fastify';
import dotenv from 'dotenv';
import fastifyFormBody from '@fastify/formbody';
import fastifyWs from '@fastify/websocket';
import { RealtimeAgent, RealtimeSession } from '@openai/agents/realtime';
import { TwilioRealtimeTransportLayer } from '@openai/agents-extensions';

// Load environment variables from .env file
dotenv.config();

// Retrieve the OpenAI API key from environment variables. You must have OpenAI Realtime API access.
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

const agent = new RealtimeAgent({
  name: 'Triage Agent',
  instructions:
    'You are a helpful assistant that starts every conversation with a creative greeting.',
});

// Root Route
fastify.get('/', async (request, reply) => {
  reply.send({ message: 'Twilio Media Stream Server is running!' });
});

// Route for Twilio to handle incoming and outgoing calls
// <Say> punctuation to improve text-to-speech translation
fastify.all('/incoming-call', async (request, reply) => {
  const twimlResponse = `
<?xml version="1.0" encoding="UTF-8"?>
<Response>
    <Say>O.K. you can start talking!</Say>
    <Connect>
        <Stream url="wss://${request.headers.host}/media-stream" />
    </Connect>
</Response>`.trim();
  reply.type('text/xml').send(twimlResponse);
});

// WebSocket route for media-stream
fastify.register(async (fastify) => {
  fastify.get('/media-stream', { websocket: true }, async (connection) => {
    const twilioTransportLayer = new TwilioRealtimeTransportLayer({
      twilioWebSocket: connection,
    });

    const session = new RealtimeSession(agent, {
      transport: twilioTransportLayer,
    });

    await session.connect({
      apiKey: OPENAI_API_KEY,
    });
    console.log('Connected to the OpenAI Realtime API');
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

Edit page