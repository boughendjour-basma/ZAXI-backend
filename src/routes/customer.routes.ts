import { Router } from 'express';
import { CustomerController } from '../controllers/customer.controller';
import { CustomerBookingController } from '../controllers/customer-booking.controller';
import { FavoriteController } from '../controllers/favorite.controller';
import { NotificationController } from '../controllers/notification.controller';
import { authenticate, requireRole } from '../middleware/auth.middleware';
import { Role } from '@prisma/client';

const router = Router();

// Apply authentication to all customer routes
router.use(authenticate);
router.use(requireRole(Role.CUSTOMER));

// ─── Profile ────────────────────────────────────────────────────────────────
router.get('/me', CustomerController.getProfile);
router.patch('/me', CustomerController.updateProfile);
router.patch('/me/password', CustomerController.changePassword);

// ─── My Bookings ────────────────────────────────────────────────────────────
router.get('/bookings', CustomerBookingController.getMyBookings);
router.get('/bookings/:id', CustomerBookingController.getMyBookingById);
router.patch('/bookings/:id/cancel', CustomerBookingController.cancelBooking);

// ─── Favorites ──────────────────────────────────────────────────────────────
router.get('/favorites', FavoriteController.list);
router.post('/favorites', FavoriteController.create);
router.patch('/favorites/:id', FavoriteController.update);
router.delete('/favorites/:id', FavoriteController.remove);

// ─── Notifications ──────────────────────────────────────────────────────────
router.get('/notifications', NotificationController.list);
router.patch('/notifications/:id/read', NotificationController.markRead);
router.patch('/notifications/read-all', NotificationController.markAllRead);

export default router;
