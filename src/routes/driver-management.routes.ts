import { Router } from 'express';
import { DriverManagementController } from '../controllers/driver-management.controller';
import { authenticate, requireRole } from '../middleware/auth.middleware';
import { Role } from '@prisma/client';

const router = Router();

// Require valid JWT + DRIVER role for all management routes.
// The single DRIVER is the platform administrator — no separate admin role exists.
router.use(authenticate);
router.use(requireRole(Role.DRIVER));

// ─── Platform Statistics ───────────────────────────────────────────────────
router.get('/statistics', DriverManagementController.getStatistics);

// ─── Customer Management ───────────────────────────────────────────────────
router.get('/customers', DriverManagementController.getCustomers);

// ─── Booking Monitoring ────────────────────────────────────────────────────
router.get('/bookings-management', DriverManagementController.getBookings);

// ─── System Audit Logs ─────────────────────────────────────────────────────
router.get('/audit-logs', DriverManagementController.getAuditLogs);

export default router;
