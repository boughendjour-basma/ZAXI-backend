import { Router } from 'express';
import { BookingController } from '../controllers/booking.controller';
import { DriverLocationController } from '../controllers/driver-location.controller';
import { PaymentController } from '../controllers/payment.controller';
import { authenticate, requireRole } from '../middleware/auth.middleware';
import { Role } from '@prisma/client';
import { RatingController } from '../controllers/rating.controller';

const router = Router();

// Apply authentication middleware to booking routes
router.use(authenticate);

// Protected routes (require valid JWT)
router.post('/estimate', BookingController.getEstimate);
router.post('/', BookingController.createBooking);
router.get('/my', BookingController.getCustomerBookings);
router.get('/history', PaymentController.getHistory);
router.get('/:id', BookingController.getCustomerBookingById);
router.patch('/:id/cancel', BookingController.cancelBooking);
router.get('/:id/location', DriverLocationController.getLocation);
router.post('/:id/payment', PaymentController.createPayment);
router.get('/:id/payment', PaymentController.getPayment);
router.get('/:id/receipt', PaymentController.getReceipt);
router.post('/:id/rating', RatingController.createRating);
router.get('/:id/rating', RatingController.getRating);

export default router;
