import { Server as SocketIOServer } from 'socket.io';
import { Server as HttpServer } from 'http';

/**
 * SocketService — Singleton Socket.IO server manager.
 *
 * Provides a central place to initialize Socket.IO and emit
 * real-time events to connected clients.
 */
class SocketServiceClass {
  private io: SocketIOServer | null = null;

  /**
   * Initialize the Socket.IO server, attached to the HTTP server.
   * Must be called once at application startup (server.ts).
   */
  initialize(httpServer: HttpServer): SocketIOServer {
    this.io = new SocketIOServer(httpServer, {
      cors: {
        origin: process.env.CLIENT_URL || '*',
        methods: ['GET', 'POST'],
      },
    });

    this.io.on('connection', (socket) => {
      console.log(`[Socket.IO]: Client connected: ${socket.id}`);

      socket.on('join:booking', (bookingId: string) => {
        if (bookingId) {
          socket.join(`booking:${bookingId}`);
          console.log(`[Socket.IO]: Socket ${socket.id} joined room booking:${bookingId}`);
        }
      });

      socket.on('disconnect', () => {
        console.log(`[Socket.IO]: Client disconnected: ${socket.id}`);
      });
    });

    console.log('[Socket.IO]: Server initialized');
    return this.io;
  }

  /** Broadcast a new announcement event to all connected clients. */
  emitAnnouncementNew(announcement: object): void {
    this.io?.emit('announcement:new', announcement);
  }

  /** Broadcast an updated announcement event to all connected clients. */
  emitAnnouncementUpdated(announcement: object): void {
    this.io?.emit('announcement:updated', announcement);
  }

  /** Broadcast an announcement removal event to all connected clients. */
  emitAnnouncementRemoved(announcementId: string): void {
    this.io?.emit('announcement:removed', { id: announcementId });
  }

  /** Emit booking:accepted event to connected clients. */
  emitBookingAccepted(payload: { bookingId: string; status: string }): void {
    this.io?.to(`booking:${payload.bookingId}`).emit('booking:accepted', payload);
    this.io?.emit('booking:accepted', payload);
  }

  /** Emit booking:cancelled event to connected clients. */
  emitBookingCancelled(payload: { bookingId: string; status: string }): void {
    this.io?.to(`booking:${payload.bookingId}`).emit('booking:cancelled', payload);
    this.io?.emit('booking:cancelled', payload);
  }

  /** Emit booking:started event to connected clients. */
  emitBookingStarted(payload: { bookingId: string; status: string }): void {
    this.io?.to(`booking:${payload.bookingId}`).emit('booking:started', payload);
    this.io?.emit('booking:started', payload);
  }

  /** Emit booking:completed event to connected clients. */
  emitBookingCompleted(payload: { bookingId: string; status: string }): void {
    this.io?.to(`booking:${payload.bookingId}`).emit('booking:completed', payload);
    this.io?.emit('booking:completed', payload);
  }

  /** Emit driver:location:update event to the booking room. */
  emitDriverLocationUpdate(bookingId: string, payload: {
    bookingId: string;
    latitude: number;
    longitude: number;
    heading?: number | null;
    speed?: number | null;
    accuracy?: number | null;
    updatedAt: string;
    lastSeen: string;
  }): void {
    this.io?.to(`booking:${bookingId}`).emit('driver:location:update', payload);
    this.io?.emit('driver:location:update', payload);
  }

  /** Emit payment:completed to both booking room members and all clients. */
  emitPaymentCompleted(payload: {
    bookingId: string;
    paymentId: string;
    amount: number;
    paymentMethod: string;
    status: string;
    paidAt: string | null;
  }): void {
    this.io?.to(`booking:${payload.bookingId}`).emit('payment:completed', payload);
    this.io?.emit('payment:completed', payload);
  }

  /** Emit auth:verified event after successful OTP verification. */
  emitAuthVerified(payload: { userId: string; phone: string; role: string }): void {
    this.io?.emit('auth:verified', payload);
  }

  /** Emit driver:phone_available event after ride acceptance. */
  emitDriverPhoneAvailable(payload: { bookingId: string; phone: string }): void {
    this.io?.to(`booking:${payload.bookingId}`).emit('driver:phone_available', payload);
    this.io?.emit('driver:phone_available', payload);
  }
}

export const SocketService = new SocketServiceClass();
