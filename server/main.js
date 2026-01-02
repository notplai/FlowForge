import express from 'express';
import cors from 'cors';
import { createServer } from 'http';
import { WebSocketServer } from 'ws';

import nodesApi from './src/api/nodes.js';
import workflowsApi from './src/api/workflows.js';
import settingsApi from './src/api/settings.js';
import workflowEngine from './src/engine/workflowEngine.js';

const app = express();
const PORT = 3001;

app.use(cors());
app.use(express.json());

// API routes
app.use('/api/nodes', nodesApi);
app.use('/api/workflows', workflowsApi);
app.use('/api/settings', settingsApi);

// Create HTTP server
const server = createServer(app);

// Create WebSocket server for console logs
const wss = new WebSocketServer({ server, path: '/ws/logs' });

// Store connected clients
const wsClients = new Set();

// Message queue for logs when no clients are connected (max 50 messages)
const messageQueue = [];
const MAX_QUEUE_SIZE = 50;

wss.on('connection', (ws) => {
    wsClients.add(ws);

    // Send any queued messages to the newly connected client
    if (messageQueue.length > 0) {
        messageQueue.forEach(msg => {
            if (ws.readyState === 1) {
                ws.send(msg);
            }
        });
        // Clear the queue after sending
        messageQueue.length = 0;
    }

    ws.on('close', () => {
        wsClients.delete(ws);
    });

    ws.on('error', (err) => {
        console.error('WebSocket error:', err);
        wsClients.delete(ws);
    });
});

// Function to broadcast log messages to all connected clients
const broadcastLog = (logData) => {
    const message = JSON.stringify(logData);

    if (wsClients.size === 0) {
        // No clients connected - queue the message
        messageQueue.push(message);
        // Keep queue size limited
        if (messageQueue.length > MAX_QUEUE_SIZE) {
            messageQueue.shift(); // Remove oldest message
        }
    } else {
        // Send to all connected clients
        wsClients.forEach(client => {
            if (client.readyState === 1) { // WebSocket.OPEN
                client.send(message);
            }
        });
    }
};

// Set up the log broadcaster in workflow engine
workflowEngine.setLogBroadcaster(broadcastLog);

server.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
    console.log(`WebSocket logs available at ws://localhost:${PORT}/ws/logs`);
});

// Graceful shutdown handler
async function gracefulShutdown(signal) {
    console.log(`\n${signal} received. Starting graceful shutdown...`);

    // Stop accepting new connections
    server.close(() => {
        console.log('HTTP server closed');
    });

    // Close all WebSocket connections
    console.log('Closing WebSocket connections...');
    wsClients.forEach(client => {
        try {
            client.close(1000, 'Server shutting down');
        } catch (err) {
            // Ignore errors
        }
    });
    wsClients.clear();

    // Shutdown workflow engine (stops all workflows and saves state)
    try {
        await workflowEngine.shutdown();
    } catch (err) {
        console.error('Error during workflow engine shutdown:', err);
    }

    console.log('Shutdown complete. Goodbye!');
    process.exit(0);
}

// Register signal handlers
process.on('SIGINT', () => gracefulShutdown('SIGINT'));
process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));

// Handle uncaught errors
process.on('uncaughtException', (err) => {
    console.error('Uncaught exception:', err);
    gracefulShutdown('UNCAUGHT_EXCEPTION');
});

process.on('unhandledRejection', (reason, promise) => {
    console.error('Unhandled rejection at:', promise, 'reason:', reason);
    gracefulShutdown('UNHANDLED_REJECTION');
});
