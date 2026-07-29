import { Router } from 'express';
import { DriverProfileController } from '../controllers/driver-profile.controller';
import { AnnouncementController } from '../controllers/announcement.controller';

const router = Router();

// ─── Public Driver Profile ──────────────────────────────────────────────────
// GET /api/public/driver-profile — public driver profile (customers, no auth)
router.get('/driver-profile', DriverProfileController.getPublicProfile);

// ─── Public Announcements ───────────────────────────────────────────────────
// GET /api/public/announcements — paginated, filterable by category
router.get('/announcements', AnnouncementController.getAnnouncements);

export default router;
