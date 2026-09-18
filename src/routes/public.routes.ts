import { Router } from 'express';
import { DriverProfileController } from '../controllers/driver-profile.controller';
import { AnnouncementController } from '../controllers/announcement.controller';
import { BookingController } from '../controllers/booking.controller';
import { PricingSettingsService } from '../services/pricing-settings.service';

const router = Router();

// ─── Public Estimate ────────────────────────────────────────────────────────
// POST /api/public/estimate — calculate route, distance and estimated price
router.post('/estimate', BookingController.getEstimate);

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
      `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}&accept-language=fr`,
      {
        headers: { 'User-Agent': 'ZAXI-Taxi-App/1.0 (contact@zaxi.dz)' },
        signal: AbortSignal.timeout(5000),
      }
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

// ─── Public Pricing Settings ───────────────────────────────────────────────
// GET /api/public/pricing — public current pricing settings for customer estimate & booking
router.get('/pricing', async (_req, res, next) => {
  try {
    const settings = await PricingSettingsService.getSettings();
    res.status(200).json({
      status: 'success',
      data: {
        cityFlatFare: settings.cityFlatFare,
        outsideRatePerKm: settings.outsideRatePerKm,
      },
    });
  } catch (err) {
    next(err);
  }
});

// ─── Public Announcements ───────────────────────────────────────────────────
// GET /api/public/announcements — paginated, filterable by category
router.get('/announcements', AnnouncementController.getAnnouncements);

export default router;
