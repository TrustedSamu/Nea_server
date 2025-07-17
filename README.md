# Twilio + OpenAI Voice Agent Setup

## Current Setup

1. **OpenAI Voice Agent Server**: Running on port 5050
   - Endpoint: `http://localhost:5050/incoming-call` (TwiML webhook)
   - WebSocket: `ws://localhost:5050/media-stream` (Audio stream)

2. **Twilio Dev Phone**: Starting on port 3001
   - Web interface: `http://localhost:3001`
   - Creates virtual phone for testing

## To Connect Them:

1. **Open the Dev Phone Interface**: 
   - Go to `http://localhost:3001` in your browser
   - You should see a virtual phone interface

2. **Configure the Dev Phone to use our voice agent**:
   - In the Dev Phone interface, you'll need to set the webhook URL to:
   - `http://localhost:5050/incoming-call`

3. **Test the Connection**:
   - Make a call using the Dev Phone interface
   - You should see debug logs in your voice agent server
   - The call should connect to OpenAI and you should hear the AI assistant

## Debug Information

With `DEBUG=openai-agents:extensions:twilio*` enabled, you should see:
- WebSocket connections
- Twilio events
- OpenAI API connections
- Audio stream data

## Current Issues to Check:
- Make sure both servers are running
- Check the Dev Phone web interface loads
- Verify webhook URL configuration
- Look for any error messages in the logs 