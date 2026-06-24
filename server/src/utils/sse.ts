import { Response } from 'express';

interface SSEClient {
  id: string;
  res: Response;
  userId: number;
}

let clients: SSEClient[] = [];

/**
 * Registers a new SSE client connection.
 * Sends initial CONNECTED handshake, sets headers, and sets up a keep-alive heartbeat.
 */
export function addClient(id: string, res: Response, userId: number) {
  // Set headers for SSE stream (let global CORS middleware handle origin/credentials)
  res.writeHead(200, {
    'Content-Type': 'text/event-stream',
    'Cache-Control': 'no-cache',
    'Connection': 'keep-alive'
  });

  // Prevent connection timeout by sending an initial handshake message
  res.write(`data: ${JSON.stringify({ type: 'CONNECTED' })}\n\n`);

  clients.push({ id, res, userId });
  console.log(`[SSE] Client connected: ${id} (User: ${userId}). Total clients: ${clients.length}`);

  // Heartbeat ping interval (every 20s) to keep socket alive and prevent proxy timeouts
  const pingInterval = setInterval(() => {
    try {
      res.write(': ping\n\n');
    } catch (err) {
      console.error(`[SSE] Error sending ping to client ${id}:`, err);
    }
  }, 20000);

  // Return a cleanup function
  return () => {
    clearInterval(pingInterval);
    clients = clients.filter(c => c.id !== id);
    console.log(`[SSE] Client disconnected: ${id}. Total clients: ${clients.length}`);
  };
}

/**
 * Broadcasts an event of a specific type (e.g. 'jobs', 'customers') to all connected SSE clients.
 */
export function broadcast(type: string, payload?: any) {
  const message = `data: ${JSON.stringify({ type, payload })}\n\n`;
  console.log(`[SSE] Broadcasting event to ${clients.length} clients - Type: ${type}`);
  clients.forEach(client => {
    try {
      client.res.write(message);
    } catch (err) {
      console.error(`[SSE] Failed to send event to client ${client.id}:`, err);
    }
  });
}
