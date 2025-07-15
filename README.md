# NEA Gourmet Twilio Voice Agent

Voice agent service that handles incoming calls using Twilio Media Streams and OpenAI's Realtime API.

## Setup

1. Install dependencies:
```bash
npm install
```

2. Create a `.env` file with the following variables:
```env
OPENAI_API_KEY=your_openai_api_key
FIREBASE_API_KEY=your_firebase_api_key
FIREBASE_AUTH_DOMAIN=your_firebase_domain
FIREBASE_PROJECT_ID=your_project_id
FIREBASE_STORAGE_BUCKET=your_storage_bucket
FIREBASE_MESSAGING_SENDER_ID=your_sender_id
FIREBASE_APP_ID=your_app_id
PORT=5050
```

3. Run the development server:
```bash
npm run dev
```

## Deployment

This service is designed to be deployed to Railway.app:

1. Create a new project on Railway.app
2. Connect this repository
3. Set the environment variables in Railway dashboard
4. Deploy!

## Twilio Configuration

After deployment:

1. Go to your Twilio console
2. Configure your Twilio phone number
3. Set the voice webhook URL to: `https://your-railway-app.railway.app/incoming-call`

## Development

- `npm run dev` - Start development server with hot reload
- `npm start` - Start production server 