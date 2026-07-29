import dotenv from 'dotenv';
// Load environment variables before importing app
dotenv.config();

import { createServer } from 'http';
import app from './app';
import { SocketService } from './sockets/socket.service';

const PORT = process.env.PORT || 3000;

const httpServer = createServer(app);

// Initialize Socket.IO on the HTTP server
SocketService.initialize(httpServer);

httpServer.listen(PORT, () => {
  console.log(`[Server]: Server is running on port ${PORT}`);
});

// Handling unhandled promise rejections
process.on('unhandledRejection', (reason: any, promise: Promise<any>) => {
  console.error('[Unhandled Rejection]:', reason);
  // Optionally shut down the server gracefully here
});
