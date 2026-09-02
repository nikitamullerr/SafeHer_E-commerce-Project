/**
 * Danger level assessment for Premium sign-in alerts.
 *
 * Combines the user's real GPS coordinates, current time of day, and day of
 * week to produce an advisory danger level: Low, Moderate, Heightened,
 * High or Extreme. The result is a safety advisory — not live crime or
 * emergency data.
 */

// High-risk proxy zones (major SA metro nightlife/transport hotspots).
// These are advisory heuristics used to demonstrate location-aware risk.
const HIGH_RISK_ZONES = [
  // Gauteng - Johannesburg inner city / taxi ranks
  { lat: -26.2041, lng: 28.0473, radiusKm: 4, label: "Johannesburg CBD" },
  // Gauteng - Hillbrow & Berea
  { lat: -26.1905, lng: 28.049, radiusKm: 2.5, label: "Hillbrow / Berea" },
  // Gauteng - Pretoria CBD
  { lat: -25.7479, lng: 28.2293, radiusKm: 3, label: "Pretoria CBD" },
  // Western Cape - Cape Town CBD
  { lat: -33.9249, lng: 18.4241, radiusKm: 3, label: "Cape Town CBD" },
  // Western Cape - Cape Flats (informal night transport corridors)
  { lat: -33.9712, lng: 18.5777, radiusKm: 6, label: "Cape Flats area" },
  // KwaZulu-Natal - Durban CBD
  { lat: -29.8587, lng: 31.0243, radiusKm: 4, label: "Durban CBD" },
  // KwaZulu-Natal - Umlazi (late-night transport corridors)
  { lat: -29.9694, lng: 30.8835, radiusKm: 4, label: "Umlazi corridor" },
  // Eastern Cape - Gqeberha (Port Elizabeth) central
  { lat: -33.9581, lng: 25.6009, radiusKm: 3, label: "Gqeberha CBD" },
  // Free State - Bloemfontein CBD
  { lat: -29.121, lng: 26.216, radiusKm: 3, label: "Bloemfontein CBD" },
  // North West - Rustenburg informal transport hubs
  { lat: -25.6672, lng: 27.2424, radiusKm: 4, label: "Rustenburg area" },
  // Limpopo - Polokwane CBD
  { lat: -23.9045, lng: 29.4689, radiusKm: 3, label: "Polokwane CBD" },
  // Mpumalanga - Mbombela (Nelspruit) CBD
  { lat: -25.4652, lng: 30.9851, radiusKm: 3, label: "Mbombela area" },
  // Northern Cape - Kimberley CBD
  { lat: -28.7278, lng: 24.7491, radiusKm: 3, label: "Kimberley CBD" },
];

function toRadians(degrees) {
  return (degrees * Math.PI) / 180;
}

function distanceKm(lat1, lng1, lat2, lng2) {
  const earthRadiusKm = 6371;
  const dLat = toRadians(lat2 - lat1);
  const dLng = toRadians(lng2 - lng1);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRadians(lat1)) *
      Math.cos(toRadians(lat2)) *
      Math.sin(dLng / 2) *
      Math.sin(dLng / 2);
  return earthRadiusKm * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

function nearestHighRiskZone(lat, lng) {
  let nearest = null;
  for (const zone of HIGH_RISK_ZONES) {
    const dist = distanceKm(lat, lng, zone.lat, zone.lng);
    if (!nearest || dist < nearest.distance) nearest = { ...zone, distance: dist };
  }
  return nearest;
}

function timeOfDayFactor(hour) {
  // Late night and early morning carry the highest advisory risk.
  if (hour >= 0 && hour < 4) return { points: 42, band: "Deep night" };
  if (hour >= 4 && hour < 6) return { points: 30, band: "Early morning" };
  if (hour >= 6 && hour < 9) return { points: 12, band: "Morning commute" };
  if (hour >= 9 && hour < 17) return { points: 0, band: "Daytime" };
  if (hour >= 17 && hour < 19) return { points: 12, band: "Evening commute" };
  if (hour >= 19 && hour < 22) return { points: 26, band: "Evening" };
  return { points: 38, band: "Late evening" }; // 22:00 – 23:59
}

function dayOfWeekFactor(date) {
  const day = date.getDay();
  // Friday and Saturday nights are elevated advisory periods.
  if (day === 5 || day === 6) return 10;
  return 0;
}

function nearestHelpDistanceFactor(distanceKmValue) {
  // Distance (in km) to the nearest known help point proxied via the
  // LiveMap help markers (police / ambulance / trusted response).
  // A longer distance to help raises the advisory level, but only within
  // a coverage range we actually have data for. Beyond that range we
  // cannot judge response availability, so no penalty is applied.
  if (distanceKmValue <= 2) return 0;
  if (distanceKmValue <= 6) return 8;
  if (distanceKmValue <= 12) return 16;
  if (distanceKmValue <= 30) return 24;
  return 0;
}

function zoneProximityFactor(zone) {
  if (!zone) return 0;
  // Inside or very close to an advisory zone.
  if (zone.distance <= zone.radiusKm) return 26;
  if (zone.distance <= zone.radiusKm * 2) return 14;
  return 6;
}

function weatherFactor() {
  // Poor visibility advisory placeholder. Without a live weather API this
  // uses a deterministic monthly rain-season proxy (Nov–Mar in SA).
  const month = new Date().getMonth() + 1;
  if (month >= 11 || month <= 3) return 4;
  return 0;
}

const HELP_POINTS = [
  // Mirrors the LiveMap helper points used elsewhere in the app.
  { lat: -33.9249, lng: 18.4241 }, // Cape Town Central Police Station
  { lat: -33.9295, lng: 18.4107 }, // Cape Town Mediclinic
  { lat: -33.918, lng: 18.431 }, // SafeHer Community Response
];

function nearestHelpPointKm(lat, lng) {
  let nearest = Infinity;
  for (const point of HELP_POINTS) {
    const dist = distanceKm(lat, lng, point.lat, point.lng);
    if (dist < nearest) nearest = dist;
  }
  return nearest === Infinity ? 25 : nearest;
}

function levelFromScore(score) {
  if (score >= 68) {
    return {
      key: "extreme",
      level: "Extreme",
      short: "Extreme risk",
      icon: "bi-exclamation-octagon-fill",
      color: "#8e0f16",
      chip: "#fde7e9",
      ring: "#d92d36",
      marker: 0,
      guidance:
        "Exercise maximum caution. Avoid walking alone, use well-lit main routes or transport you control, and keep your SOS and live tracking ready. Consider sharing your journey with a trusted contact immediately.",
    };
  }
  if (score >= 50) {
    return {
      key: "high",
      level: "High",
      short: "High risk",
      icon: "bi-exclamation-triangle-fill",
      color: "#b3232c",
      chip: "#fdeef0",
      ring: "#d92d36",
      marker: 25,
      guidance:
        "Heightened care is advised. Stay on busy routes, keep your phone charged, and avoid isolated shortcuts. Let a trusted contact know where you are heading.",
    };
  }
  if (score >= 34) {
    return {
      key: "heightened",
      level: "Heightened",
      short: "Heightened caution",
      icon: "bi-shield-fill-exclamation",
      color: "#c0761c",
      chip: "#fdf3e2",
      ring: "#e8a13c",
      marker: 50,
      guidance:
        "Be extra aware of your surroundings. Choose well-lit streets, keep valuables out of sight, and keep your phone within reach. Your SafeHer tracking tools remain active.",
    };
  }
  if (score >= 16) {
    return {
      key: "moderate",
      level: "Moderate",
      short: "Moderate advisory",
      icon: "bi-shield-fill-check",
      color: "#2e9e5b",
      chip: "#e8f7ee",
      ring: "#2e9e5b",
      marker: 75,
      guidance:
        "Conditions look calm but stay aware. Keep your phone charged, plan your route, and continue to trust your instincts as you move through your day.",
    };
  }
  return {
    key: "low",
    level: "Low",
    short: "Low risk",
    icon: "bi-shield-check",
    color: "#1d6f42",
    chip: "#e8f7ee",
    ring: "#2e9e5b",
    marker: 100,
    guidance:
      "Your general safety check is complete. Continue to trust your instincts and use SafeHer tools whenever you need them.",
  };
}

/**
 * Assess the danger level for a location at the current moment.
 * @param {{lat:number, lng:number}} coords GPS coordinates
 * @returns {{level:string, short:string, score:number, icon:string, color:string, chip:string, ring:string, marker:number, guidance:string, factors:object, zone:object}}
 */
export function assessDangerLevel(coords, date = new Date()) {
  const hour = date.getHours();
  const time = timeOfDayFactor(hour);
  const dayPoints = dayOfWeekFactor(date);
  const weatherPoints = weatherFactor();

  // Without usable coordinates we still assess from time of day, day of
  // week and visibility so a Premium sign-in always receives an advisory.
  if (!coords || typeof coords.lat !== "number" || typeof coords.lng !== "number") {
    const score = Math.min(
      100,
      Math.round(time.points + dayPoints + weatherPoints),
    );
    return {
      ...levelFromScore(score),
      score,
      locationUnavailable: true,
      factors: {
        time: { points: time.points, band: time.band },
        day: dayPoints,
        helpDistanceKm: 0,
        zone: null,
        weather: weatherPoints,
      },
      zone: null,
    };
  }

  const helpDistance = nearestHelpPointKm(coords.lat, coords.lng);
  const helpPoints = nearestHelpDistanceFactor(helpDistance);
  const zone = nearestHighRiskZone(coords.lat, coords.lng);
  const zonePoints = zoneProximityFactor(zone);

  const score = Math.min(
    100,
    Math.round(time.points + dayPoints + helpPoints + zonePoints + weatherPoints),
  );

  return {
    ...levelFromScore(score),
    score,
    locationUnavailable: false,
    factors: {
      time: { points: time.points, band: time.band },
      day: dayPoints,
      helpDistanceKm: Math.round(helpDistance * 10) / 10,
      zone: zonePoints,
      weather: weatherPoints,
    },
    zone,
  };
}

/** Human-readable summary of the dominant contributing factors. */
export function describeFactors(assessment) {
  const parts = [];
  const { factors, zone } = assessment;
  if (factors.time.points > 0) {
    parts.push(`${factors.time.band} hours (+${factors.time.points})`);
  }
  if (factors.day > 0) parts.push("Weekend (+10)");
  if (factors.helpDistanceKm > 2) {
    parts.push(`~${factors.helpDistanceKm} km from nearest help point (+${factors.zone === 0 ? 8 : factors.zone})`);
  }
  if (zone && zone.distance <= zone.radiusKm) {
    parts.push(`Advisory zone: ${zone.label} (+${factors.zone})`);
  } else if (zone && factors.zone > 0) {
    parts.push(`${zone.distance.toFixed(1)} km from ${zone.label} (+${factors.zone})`);
  }
  if (factors.weather > 0) parts.push("Rainy season visibility (+4)");
  return parts.length ? parts.join(" · ") : "No significant risk factors found";
}