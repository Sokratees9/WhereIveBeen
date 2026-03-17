function escapeHtml(text) {
  if (text === null || text === undefined) return "";
  return String(text)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function formatDisplayDate(dateString) {
  if (!dateString) return "Present";

  const date = new Date(dateString + "T00:00:00");

  if (Number.isNaN(date.getTime())) {
    return "Unknown";
  }

  return date.toLocaleDateString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric"
  });
}

function getDurationYears(fromDate, toDate) {
  if (!fromDate) return null;

  const start = new Date(fromDate + "T00:00:00");
  const end = toDate
    ? new Date(toDate + "T00:00:00")
    : new Date();

  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) {
    return null;
  }

  const diffMs = end - start;
  return diffMs / (1000 * 60 * 60 * 24 * 365.25);
}

function getLivedRadiusPixels(years) {
  if (!years) return 8;
  return Math.max(6, Math.min(30, 6 + Math.sqrt(years) * 6));
}

function getLivedRadiusMeters(years) {
  if (!years) return 5000;
  return Math.max(5000, Math.min(60000, Math.sqrt(years) * 5000));
}

function buildLivedPopup(place) {
  const years = getDurationYears(place.fromDate, place.toDate);
  const endText = place.toDate ? formatDisplayDate(place.toDate) : "Present";
  const yearsText = years ? `${years.toFixed(1)} years` : "Unknown duration";

  let html = `
    <div class="popup-title">${escapeHtml(place.name || "Unknown place")}</div>
    ${place.address ? `<div>${escapeHtml(place.address)}</div>` : ""}
    <div><strong>Dates:</strong> ${escapeHtml(formatDisplayDate(place.fromDate))} → ${escapeHtml(endText)}</div>
    <div><strong>Duration:</strong> ${escapeHtml(yearsText)}</div>
  `;

  if (place.notes) {
    html += `<div class="popup-notes">${escapeHtml(place.notes)}</div>`;
  }

  return html;
}

function createLivedMarkers(place) {
  const years = getDurationYears(place.fromDate, place.toDate);
  const popup = buildLivedPopup(place);

  const centerMarker = L.circleMarker([place.lat, place.lng], {
    radius: 4,
    color: "#000000",
    fillColor: "#1d4ed8",
    fillOpacity: 0.6,
    weight: 1
  }).bindPopup(popup);

  const symbolMarker = L.circleMarker([place.lat, place.lng], {
    radius: getLivedRadiusPixels(years),
    color: "#1d4ed8",
    fillColor: "#60a5fa",
    fillOpacity: 0.35,
    weight: 2
  }).bindPopup(popup);

  const areaCircle = L.circle([place.lat, place.lng], {
    radius: getLivedRadiusMeters(years),
    color: "#1d4ed8",
    fillColor: "#60a5fa",
    fillOpacity: 0.18,
    weight: 2
  }).bindPopup(popup);

  return { centerMarker, symbolMarker, areaCircle };
}

export async function loadLived(path) {
  const response = await fetch(path);

  if (!response.ok) {
    throw new Error(`Could not load ${path}`);
  }

  return await response.json();
}

export function renderLivedPlaces(map, places) {

  const symbolLayer = L.layerGroup();
  const areaLayer = L.layerGroup();

  places.forEach(place => {

    if (typeof place.lat !== "number" || typeof place.lng !== "number") return;

    const { centerMarker, symbolMarker, areaCircle } = createLivedMarkers(place);

    symbolLayer.addLayer(symbolMarker);
    symbolLayer.addLayer(centerMarker);

    areaLayer.addLayer(areaCircle);
    areaLayer.addLayer(centerMarker);
  });

  function updateLivedLayerVisibility() {

    const zoom = map.getZoom();

    if (zoom >= 7) {
      if (map.hasLayer(symbolLayer)) map.removeLayer(symbolLayer);
      if (!map.hasLayer(areaLayer)) areaLayer.addTo(map);
    } else {
      if (map.hasLayer(areaLayer)) map.removeLayer(areaLayer);
      if (!map.hasLayer(symbolLayer)) symbolLayer.addTo(map);
    }
  }

  updateLivedLayerVisibility();
  map.on("zoomend", updateLivedLayerVisibility);

}