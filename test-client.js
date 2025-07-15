import WebSocket from 'ws';

const ws = new WebSocket('ws://localhost:5050');

ws.on('open', () => {
  console.log('Connected to server');
  
  // Test message to trigger a tool
  const testMessage = {
    message: "Ich möchte Julia Schäfer krank melden. Sie hat Grippe und wird voraussichtlich 3 Tage ausfallen."
  };
  
  ws.send(JSON.stringify(testMessage));
});

ws.on('message', (data) => {
  const response = JSON.parse(data.toString());
  console.log('Received response:', response);
});

ws.on('error', (error) => {
  console.error('WebSocket error:', error);
});

ws.on('close', () => {
  console.log('Disconnected from server');
}); 