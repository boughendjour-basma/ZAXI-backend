import { Router } from 'express';
import { DriverBookingController } from '../controllers/driver-booking.controller';
import { DriverController } from '../controllers/driver.controller';
import { DriverLocationController } from '../controllers/driver-location.controller';
import { authenticate, requireRole } from '../middleware/auth.middleware';
import { Role } from '@prisma/client';

const router = Router();

// Apply authentication and DRIVER role requirement to all driver booking routes
router.use(authenticate);
router.use(requireRole(Role.DRIVER));

router.get('/', DriverBookingController.getBookings);
router.get('/:id', DriverController.getDriverBookingById);
router.patch('/:id/status', DriverController.updateBookingStatus);
router.patch('/:id/accept', DriverBookingController.acceptBooking);
router.patch('/:id/reject', DriverBookingController.rejectBooking);
router.patch('/:id/start', DriverBookingController.startRide);
router.patch('/:id/complete', DriverBookingController.completeRide);
router.patch('/:id/location', DriverLocationController.updateLocation);

export default router;
