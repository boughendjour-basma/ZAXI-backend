import { Coordinates } from './pricing.config';

export interface BbaFixedRouteConfig {
  id: string;
  nameFr: string;
  nameAr: string;
  fixedFare: number;
  center: Coordinates;
  radiusKm: number;
  keywords: string[];
}

/**
 * Official fixed tariff table between Bordj Bou Arréridj (Center)
 * and the outer Daïras / Communes of Wilaya 34.
 */
export const BBA_FIXED_ROUTES: BbaFixedRouteConfig[] = [
  {
    id: 'medjana',
    nameFr: 'Medjana',
    nameAr: 'مجانة',
    fixedFare: 500,
    center: { latitude: 36.134, longitude: 4.671 },
    radiusKm: 6.5,
    keywords: ['medjana', 'مجانة', 'مدجانة'],
  },
  {
    id: 'zemmoura',
    nameFr: 'Zemmoura',
    nameAr: 'زمورة',
    fixedFare: 1300,
    center: { latitude: 36.275, longitude: 4.856 },
    radiusKm: 7.0,
    keywords: ['zemmoura', 'زمورة', 'زمورة برج بوعريريج'],
  },
  {
    id: 'ras_el_oued',
    nameFr: 'Ras El Oued',
    nameAr: 'رأس الوادي',
    fixedFare: 1500,
    center: { latitude: 35.945, longitude: 5.031 },
    radiusKm: 8.0,
    keywords: ['ras el oued', 'ras el-oued', 'raseloued', 'راس الواد', 'رأس الوادي', 'راس الوادي'],
  },
  {
    id: 'el_achir',
    nameFr: 'El Achir (El Yachir)',
    nameAr: 'الياشير',
    fixedFare: 800,
    center: { latitude: 36.064, longitude: 4.653 },
    radiusKm: 6.0,
    keywords: ['el achir', 'achir', 'yachir', 'el yachir', 'ياشير', 'الياشير'],
  },
  {
    id: 'sidi_embarek',
    nameFr: 'Sidi Embarek',
    nameAr: 'سيدي مبارك',
    fixedFare: 600,
    center: { latitude: 36.104, longitude: 4.910 },
    radiusKm: 6.0,
    keywords: ['sidi embarek', 'sidi m\'barek', 'سيدي مبارك'],
  },
  {
    id: 'ain_taghrout',
    nameFr: 'Ain Taghrout',
    nameAr: 'عين تاغروت',
    fixedFare: 1500,
    center: { latitude: 36.126, longitude: 5.083 },
    radiusKm: 7.0,
    keywords: ['ain taghrout', 'aïn taghrout', 'aintaghrout', 'عين تاغروت', 'عين تاغروث'],
  },
  {
    id: 'hammadia',
    nameFr: 'Hammadia',
    nameAr: 'حمادية',
    fixedFare: 800,
    center: { latitude: 35.978, longitude: 4.747 },
    radiusKm: 6.5,
    keywords: ['hammadia', 'hamadia', 'حمادية'],
  },
  {
    id: 'el_mansourah',
    nameFr: 'El Mansourah',
    nameAr: 'المنصورة',
    fixedFare: 1500,
    center: { latitude: 36.084, longitude: 4.453 },
    radiusKm: 7.0,
    keywords: ['mansoura', 'mansourah', 'el mansourah', 'المنصورة', 'منصورة'],
  },
  {
    id: 'el_mhir',
    nameFr: 'El M\'hir',
    nameAr: 'المهير',
    fixedFare: 2000,
    center: { latitude: 36.128, longitude: 4.378 },
    radiusKm: 7.0,
    keywords: ['el mhir', 'el m\'hir', 'el mehir', 'mhir', 'mehir', 'المهير', 'مهير'],
  },
  {
    id: 'el_anseur',
    nameFr: 'El Anseur (El Anasser)',
    nameAr: 'العناصر',
    fixedFare: 500,
    center: { latitude: 36.067, longitude: 4.850 },
    radiusKm: 6.0,
    keywords: ['el anasser', 'el anseur', 'anasser', 'anseur', 'العناصر', 'عناصر'],
  },
];

export const BBA_CENTER_COORDS: Coordinates = {
  latitude: 36.073,
  longitude: 4.761,
};

export const BBA_CENTER_RADIUS_KM = 9.0;

/** Calculate Haversine distance between two coordinates in km */
export function calculateHaversineDistanceKm(a: Coordinates, b: Coordinates): number {
  const R = 6371;
  const dLat = ((b.latitude - a.latitude) * Math.PI) / 180;
  const dLon = ((b.longitude - a.longitude) * Math.PI) / 180;
  const sinLat = Math.sin(dLat / 2);
  const sinLon = Math.sin(dLon / 2);
  const h =
    sinLat * sinLat +
    Math.cos((a.latitude * Math.PI) / 180) *
      Math.cos((b.latitude * Math.PI) / 180) *
      sinLon *
      sinLon;
  return R * 2 * Math.atan2(Math.sqrt(h), Math.sqrt(1 - h));
}

/** Check if a point is within Bordj Bou Arréridj center */
export function isPointInBbaCenter(point: Coordinates, address?: string | null): boolean {
  if (address) {
    const lower = address.toLowerCase();
    const isOuterDaira = BBA_FIXED_ROUTES.some((route) =>
      route.keywords.some((k) => lower.includes(k))
    );
    if (!isOuterDaira && (lower.includes('bordj') || lower.includes('bba') || lower.includes('برج'))) {
      return true;
    }
  }

  const dist = calculateHaversineDistanceKm(point, BBA_CENTER_COORDS);
  return dist <= BBA_CENTER_RADIUS_KM;
}

/** Check if a point matches a specific BBA Daïra */
export function matchBbaDaira(
  point: Coordinates,
  address?: string | null
): BbaFixedRouteConfig | null {
  const lowerAddress = (address || '').toLowerCase();

  for (const route of BBA_FIXED_ROUTES) {
    // 1. Text keyword match in address
    if (lowerAddress && route.keywords.some((kw) => lowerAddress.includes(kw))) {
      return route;
    }
    // 2. Proximity match to Daira center
    const dist = calculateHaversineDistanceKm(point, route.center);
    if (dist <= route.radiusKm) {
      return route;
    }
  }

  return null;
}

/**
 * Checks whether a ride is between Bordj Bou Arréridj (Center)
 * and one of the 10 BBA outer Daïras / Communes.
 * Matches by GPS proximity to the daïra center OR address keyword,
 * while ensuring the other endpoint connects with BBA Center.
 */
export function detectBbaFixedRoute(
  pickup: Coordinates,
  destination: Coordinates,
  pickupAddress?: string | null,
  destinationAddress?: string | null
): { route: BbaFixedRouteConfig; dairaName: string; fixedFare: number } | null {
  const pickupInCenter = isPointInBbaCenter(pickup, pickupAddress);
  const destInCenter = isPointInBbaCenter(destination, destinationAddress);

  // If neither endpoint is in BBA Center, this is an inter-commune or outside trip (distance fare)
  if (!pickupInCenter && !destInCenter) {
    return null;
  }

  // If both endpoints are in center, this is handled by city flat fare, not fixed daira route
  if (pickupInCenter && destInCenter) {
    return null;
  }

  for (const route of BBA_FIXED_ROUTES) {
    // Case 1: Pickup is in BBA Center, destination is the outer Daïra
    if (pickupInCenter) {
      const destMatchCoords = calculateHaversineDistanceKm(destination, route.center) <= route.radiusKm;
      const destMatchAddr = destinationAddress
        ? route.keywords.some((kw) => destinationAddress.toLowerCase().includes(kw))
        : false;

      if (destMatchCoords || destMatchAddr) {
        return { route, dairaName: route.nameAr, fixedFare: route.fixedFare };
      }
    }

    // Case 2: Destination is in BBA Center, pickup is the outer Daïra (return trip)
    if (destInCenter) {
      const pickupMatchCoords = calculateHaversineDistanceKm(pickup, route.center) <= route.radiusKm;
      const pickupMatchAddr = pickupAddress
        ? route.keywords.some((kw) => pickupAddress.toLowerCase().includes(kw))
        : false;

      if (pickupMatchCoords || pickupMatchAddr) {
        return { route, dairaName: route.nameAr, fixedFare: route.fixedFare };
      }
    }
  }

  return null;
}
