import { Router } from 'express';
import { DriverProfileController } from '../controllers/driver-profile.controller';
import { AnnouncementController } from '../controllers/announcement.controller';

const router = Router();

// ─── Public Driver Profile ──────────────────────────────────────────────────
// GET /api/public/driver-profile — public driver profile (customers, no auth)
router.get('/driver-profile', DriverProfileController.getPublicProfile);

// ─── Public Reverse Geocoding ──────────────────────────────────────────────
// POST /api/public/reverse-geocode — returns human readable address for lat/lng
router.post('/reverse-geocode', async (req, res) => {
  try {
    const { lat, lng } = req.body;
    if (typeof lat !== 'number' || typeof lng !== 'number') {
      res.status(400).json({ status: 'error', message: 'lat and lng must be numbers' });
      return;
    }
    const nomRes = await fetch(
      `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}&accept-language=fr`
    );
    const nomData = await nomRes.json();
    const address = nomData.display_name
      ? nomData.display_name.split(',').slice(0, 3).join(',')
      : `${lat.toFixed(5)}, ${lng.toFixed(5)}`;

    res.status(200).json({
      status: 'success',
      data: { address },
    });
  } catch (err) {
    res.status(200).json({
      status: 'success',
      data: { address: 'Bordj Bou Arréridj' },
    });
  }
});

// ─── Public Announcements ───────────────────────────────────────────────────
// GET /api/public/announcements — paginated, filterable by category
router.get('/announcements', AnnouncementController.getAnnouncements);

export default router;
