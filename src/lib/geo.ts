export const INDIA_BBOX = { minLat: 6.5, maxLat: 37.5, minLng: 67.5, maxLng: 97.5 };

/** Project lat/lng into 0-100 percentage coordinates over the India bounding box. */
export function project(lat: number, lng: number) {
  const x = ((lng - INDIA_BBOX.minLng) / (INDIA_BBOX.maxLng - INDIA_BBOX.minLng)) * 100;
  const y = ((INDIA_BBOX.maxLat - lat) / (INDIA_BBOX.maxLat - INDIA_BBOX.minLat)) * 100;
  return { x: Math.min(100, Math.max(0, x)), y: Math.min(100, Math.max(0, y)) };
}

export function haversineKm(
  aLat: number,
  aLng: number,
  bLat: number,
  bLng: number,
): number {
  const R = 6371;
  const dLat = ((bLat - aLat) * Math.PI) / 180;
  const dLng = ((bLng - aLng) * Math.PI) / 180;
  const s =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((aLat * Math.PI) / 180) *
      Math.cos((bLat * Math.PI) / 180) *
      Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(s));
}

export const AGENCY_TYPES = [
  "NDRF",
  "SDRF",
  "Fire & Rescue",
  "Police",
  "Medical / Hospital",
  "Ambulance Service",
  "Coast Guard",
  "Civil Defence",
  "NGO / Volunteer",
] as const;

export const CAPABILITIES = [
  "Flood Rescue",
  "Earthquake / Collapse",
  "Fire Fighting",
  "Medical Aid",
  "Search & Rescue",
  "Evacuation Transport",
  "Cyclone Response",
  "Chemical / Industrial",
  "Relief Supplies",
  "Aerial Support",
] as const;

export const DISASTER_TYPES = [
  "Flood",
  "Earthquake",
  "Cyclone",
  "Landslide",
  "Fire",
  "Building Collapse",
  "Industrial / Chemical",
  "Road Accident",
  "Other",
] as const;

export const RESOURCE_KINDS = [
  "Ambulance",
  "Rescue Boat",
  "Fire Tender",
  "Rescue Team",
  "Medical Team",
  "Helicopter",
  "Heavy Machinery",
  "Relief Truck",
] as const;

export function severityLabel(s: number) {
  return ["", "Low", "Moderate", "High", "Severe", "Catastrophic"][s] ?? "Unknown";
}

export function timeAgo(iso: string) {
  const diff = Date.now() - new Date(iso).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 1) return "just now";
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  return `${Math.floor(h / 24)}d ago`;
}
