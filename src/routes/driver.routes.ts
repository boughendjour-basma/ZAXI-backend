import { Router } from 'express';
import { DriverPricingController } from '../controllers/driver-pricing.controller';
import { DriverProfileController } from '../controllers/driver-profile.controller';
import { AnnouncementController } from '../controllers/announcement.controller';
import { PaymentController } from '../controllers/payment.controller';
import driverBookingRoutes from './driver-booking.routes';
import { authenticate, requireRole } from '../middleware/auth.middleware';
import { Role } from '@prisma/client';

const router = Router();

// Apply authentication and DRIVER role requirement to all driver routes
router.use(authenticate);
router.use(requireRole(Role.DRIVER));

// ─── Driver Bookings Endpoints ──────────────────────────────────────────────
router.use('/bookings', driverBookingRoutes);

// ─── Driver Earnings Endpoint ───────────────────────────────────────────────
router.get('/earnings', PaymentController.getDriverEarnings);

// ─── Driver Pricing Endpoints ───────────────────────────────────────────────
router.get('/pricing', DriverPricingController.getPricing);
router.patch('/pricing', DriverPricingController.updatePricing);

// ─── Driver Profile Endpoints ────────────────────────────────────────────────
router.get('/profile', DriverProfileController.getProfile);
router.patch('/profile', DriverProfileController.updateProfile);

// ─── Driver Announcement Endpoints ───────────────────────────────────────────
router.post('/announcements', AnnouncementController.createAnnouncement);
router.patch('/announcements/:id', AnnouncementController.updateAnnouncement);
router.delete('/announcements/:id', AnnouncementController.deleteAnnouncement);

export default router;
