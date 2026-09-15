import { Server as SocketIOServer } from 'socket.io';
import { Server as HttpServer } from 'http';
import { verifyToken } from '../utils/jwt';
import prisma from '../config/database';

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
   */
  initialize(httpServer: HttpServer): SocketIOServer {
    const clientUrl = process.env.CLIENT_URL?.trim();
    const corsOrigins = process.env.CORS_ORIGINS
      ? process.env.CORS_ORIGINS.split(',').map((o) => o.trim()).filter(Boolean)
      : [];
    const allowedOrigins = [clientUrl, ...corsOrigins].filter(Boolean) as string[];

    this.io = new SocketIOServer(httpServer, {
      cors: {
        origin: (origin, callback) => {
          if (!origin || process.env.NODE_ENV !== 'production') {
            return callback(null, true);
          }
          const normalizedOrigin = origin.replace(/\/+$/, '');
          const isAllowed =
            origin.startsWith('http://localhost:') ||
            origin.startsWith('http://127.0.0.1:') ||
            allowedOrigins.some((allowed) => {
              if (allowed === '*') return true;
              return allowed.replace(/\/+$/, '') === normalizedOrigin;
            });
          if (isAllowed || allowedOrigins.length === 0) {
            return callback(null, true);
          }
          return callback(new Error('Not allowed by CORS'));
        },
        methods: ['GET', 'POST'],
        credentials: true,
      },
    });

    this.io.use((socket, next) => {
      try {
        const rawToken =
          socket.handshake.auth?.token ||
          (socket.handshake.headers?.authorization
            ? socket.handshake.headers.authorization.replace('Bearer ', '')
            : null);

        if (!rawToken) {
          socket.data.user = null;
          return next();
        }

        const decoded = verifyToken(rawToken);
        socket.data.user = decoded;
        return next();
      } catch {
        socket.data.user = null;
        return next();
      }
    });

    this.io.on('connection', (socket) => {
      socket.on('join:booking', async (bookingId: string) => {
        if (!bookingId || typeof bookingId !== 'string') return;
        const user = socket.data.user;

        if (!user || !user.userId) return;

        try {
          const booking = await prisma.booking.findUnique({
            where: { id: bookingId },
            select: { id: true, customerId: true, driverId: true },
          });

          if (!booking) return;

          const isCustomerOwner = booking.customerId === user.userId;
          const isAssignedDriver = booking.driverId === user.userId;
          const isPlatformDriver = user.role === 'DRIVER';

          if (isCustomerOwner || isAssignedDriver || isPlatformDriver) {
            socket.join(`booking:${bookingId}`);
          }
        } catch {
          // Silent error handling
        }
      });

      socket.on('driver:location', async (payload: { bookingId?: string; latitude: number; longitude: number; heading?: number; speed?: number; accuracy?: number }) => {
        const user = socket.data.user;
        if (!user || user.role !== 'DRIVER') return;
        if (!payload || typeof payload.latitude !== 'number' || typeof payload.longitude !== 'number') return;

        try {
          if (payload.bookingId) {
            this.emitDriverLocationUpdate(payload.bookingId, {
              bookingId: payload.bookingId,
              latitude: payload.latitude,
              longitude: payload.longitude,
              heading: payload.heading,
              speed: payload.speed,
              accuracy: payload.accuracy,
              updatedAt: new Date().toISOString(),
              lastSeen: new Date().toISOString(),
            });
          }
        } catch {
          // Silent catch for background location emission
        }
      });

      socket.on('disconnect', () => {
        // Disconnected
      });
    });

    console.log('[Socket.IO]: Server initialized');
    return this.io;
  }

  /** Broadcast a new booking request to all connected clients / drivers. */
  emitBookingNew(booking: object): void {
    this.io?.emit('booking:new', booking);
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

  /** Emit booking:driver_arriving event to connected clients. */
  emitBookingDriverArriving(payload: { bookingId: string; status: string }): void {
    this.io?.to(`booking:${payload.bookingId}`).emit('booking:driver_arriving', payload);
    this.io?.emit('booking:driver_arriving', payload);
  }

  /** Emit booking:driver_arrived event to connected clients. */
  emitBookingDriverArrived(payload: { bookingId: string; status: string }): void {
    this.io?.to(`booking:${payload.bookingId}`).emit('booking:driver_arrived', payload);
    this.io?.emit('booking:driver_arrived', payload);
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

  /** Emit auth:verified event after successful account creation. */
  emitAuthVerified(payload: { userId: string; phone: string; role: string }): void {
    this.io?.emit('auth:verified', payload);
  }

  /** Emit driver:phone_available event after ride acceptance. */
  emitDriverPhoneAvailable(payload: { bookingId: string; phone: string }): void {
    this.io?.to(`booking:${payload.bookingId}`).emit('driver:phone_available', payload);
    this.io?.emit('driver:phone_available', payload);
  }

  /** Emit pricing:updated event to all connected clients. */
  emitPricingUpdated(payload: { cityFlatFare: number; outsideRatePerKm: number }): void {
    this.io?.emit('pricing:updated', payload);
  }
}

export const SocketService = new SocketServiceClass();
