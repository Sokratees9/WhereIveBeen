import { routeColors, markerColors } from "./config.js";

let replayTimeouts = [];
let activeReplayLine = null;

function getMarkerColor(type) {
  return markerColors[type] || "#374151";
}

export function escapeHtml(text) {
  if (text === null || text === undefined) return "";
  return String(text)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function formatDisplayDate(dateString) {
  if (!dateString) return "Unknown";
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

function getTripDurationDays(startDate, endDate) {
  if (!startDate || !endDate) return null;

  const start = new Date(startDate + "T00:00:00");
  const end = new Date(endDate + "T00:00:00");

  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) {
    return null;
  }

  const diffMs = end - start;
  const diffDays = Math.round(diffMs / (1000 * 60 * 60 * 24)) + 1;

  if (diffDays < 1) return null;
  return diffDays;
}

function getTripYear(trip) {
  if (trip.startDate) {
    const year = new Date(trip.startDate + "T00:00:00").getFullYear();
    if (!Number.isNaN(year)) return year;
  }

  if (trip.year) return trip.year;
  return null;
}

function getYearRange(trips) {
  const years = trips
    .map(getTripYear)
    .filter(year => year !== null);

  if (years.length === 0) {
    return { min: 1979, max: 2025 };
  }

  return {
    min: Math.min(...years),
    max: Math.max(...years)
  };
}

function buildPopup(trip, stop, stopIndex, totalStops) {
  const duration = getTripDurationDays(trip.startDate, trip.endDate);

  let html = `
    <div class="popup-title">${escapeHtml(stop.name)}</div>
    <div class="popup-subtitle">${escapeHtml(trip.title)}</div>
    <div><strong>Dates:</strong> ${escapeHtml(formatDisplayDate(trip.startDate))} → ${escapeHtml(formatDisplayDate(trip.endDate))}</div>
    <div><strong>Trip group:</strong> ${escapeHtml(trip.group || "Unknown")}</div>
    <div><strong>Stop type:</strong> ${escapeHtml(stop.type)}</div>
    <div><strong>Stop:</strong> ${stopIndex + 1} of ${totalStops}</div>
  `;

  if (duration) {
    html += `<div><strong>Duration:</strong> ${duration} day${duration === 1 ? "" : "s"}</div>`;
  }
  if (stop.nights) {
    html += `<div><strong>Nights:</strong> ${escapeHtml(stop.nights)}</div>`;
  }
  if (stop.notes) {
    html += `<div class="popup-notes"><strong>Stop notes:</strong> ${escapeHtml(stop.notes)}</div>`;
  }
  if (trip.notes) {
    html += `<div class="popup-notes"><strong>Trip notes:</strong> ${escapeHtml(trip.notes)}</div>`;
  }
  return html;
}

function createMarker(stop) {
  const color = getMarkerColor(stop.type);

  const icon = L.divIcon({
    className: "triangle-marker",
    html: `<div style="--marker-color:${color}"></div>`,
    iconSize: [16, 16],
    iconAnchor: [8, 14]
  });

  return L.marker([stop.lat, stop.lng], { icon });
}

function clearReplay(map) {
  replayTimeouts.forEach(timeoutId => clearTimeout(timeoutId));
  replayTimeouts = [];

  if (activeReplayLine) {
    map.removeLayer(activeReplayLine);
    activeReplayLine = null;
  }
}

function setActiveTripButton(tripIndex) {
  document.querySelectorAll(".trip-button").forEach(button => {
    button.classList.toggle(
      "active",
      Number(button.dataset.tripIndex) === tripIndex
    );
  });
}

function replayTrip(map, tripData) {
  clearReplay(map);
  setActiveTripButton(tripData.tripIndex);

  const stops = tripData.trip.stops || [];
  if (stops.length === 0) return;

  if (!map.hasLayer(tripData.layerGroup)) {
    tripData.layerGroup.addTo(map);
  }

  const bounds = L.latLngBounds(stops.map(stop => [stop.lat, stop.lng]));
  map.fitBounds(bounds, { padding: [40, 40] });

  const replayColor = routeColors[tripData.tripIndex % routeColors.length];
  activeReplayLine = L.polyline([], {
    color: replayColor,
    weight: 6,
    opacity: 0.9
  }).addTo(map);

  const pointsSoFar = [];

  tripData.markers.forEach((marker, stopIndex) => {
    const timeoutId = setTimeout(() => {
      const stop = stops[stopIndex];
      if (!stop) return;

      const point = [stop.lat, stop.lng];
      pointsSoFar.push(point);

      activeReplayLine.setLatLngs(pointsSoFar);
      map.panTo(point, { animate: true, duration: 0.75 });
      marker.openPopup();
    }, stopIndex * 900);

    replayTimeouts.push(timeoutId);
  });
}

function renderTripList(tripsToRender, map, onAfterRender) {
  const tripList = document.getElementById("trip-list");
  tripList.innerHTML = "";

  if (tripsToRender.length === 0) {
    tripList.innerHTML = `<div class="trip-meta">No trips match this filter.</div>`;
    onAfterRender?.();
    return;
  }

  tripsToRender.forEach(tripData => {
    const trip = tripData.trip;
    const stops = trip.stops || [];
    const duration = getTripDurationDays(trip.startDate, trip.endDate);

    const button = document.createElement("button");
    button.className = "trip-button";
    button.type = "button";
    button.dataset.tripIndex = tripData.tripIndex;

    button.innerHTML = `
      <div class="trip-title">${escapeHtml(trip.title)}</div>
      <div class="trip-meta">${escapeHtml(formatDisplayDate(trip.startDate))} → ${escapeHtml(formatDisplayDate(trip.endDate))}</div>
      <div class="trip-meta">${duration ? `${duration} day${duration === 1 ? "" : "s"}` : "Duration unknown"} · ${escapeHtml(trip.group || "Unknown")}</div>
      <div class="trip-meta">${stops.length} stop${stops.length === 1 ? "" : "s"}</div>
      ${trip.notes ? `<div class="trip-notes">${escapeHtml(trip.notes)}</div>` : ""}
    `;

    button.addEventListener("click", () => replayTrip(map, tripData));
    tripList.appendChild(button);
  });
  onAfterRender?.();
}

export async function loadTrips(path) {
  const response = await fetch(path);
  if (!response.ok) {
    throw new Error(`Could not load ${path}`);
  }
  return await response.json();
}

export function renderTrips(map, trips, options = {}) {
  const { onAfterRender } = options;
  const tripLayers = [];
  const allBounds = [];

  trips.forEach((trip, tripIndex) => {
    const stops = trip.stops || [];
    const stopPoints = stops.map(stop => [stop.lat, stop.lng]);
    const routeColor = routeColors[tripIndex % routeColors.length];
    const markers = [];
    const layerGroup = L.layerGroup();

    let routeLine = null;
    if (stopPoints.length > 1) {
      routeLine = L.polyline(stopPoints, {
        color: routeColor,
        weight: 3,
        opacity: 0.45
      });
      layerGroup.addLayer(routeLine);
    }

    stops.forEach((stop, stopIndex) => {
      const marker = createMarker(stop);
      marker.bindPopup(buildPopup(trip, stop, stopIndex, stops.length));
      layerGroup.addLayer(marker);
      markers.push(marker);
      allBounds.push([stop.lat, stop.lng]);
    });

    layerGroup.addTo(map);

    tripLayers.push({
      trip,
      tripIndex,
      markers,
      routeLine,
      layerGroup
    });
  });

  if (allBounds.length > 0) {
    map.fitBounds(allBounds, { padding: [30, 30] });
  }

  renderTripList(tripLayers, map, onAfterRender);
  const yearRange = getYearRange(trips);

  function applyYearFilter(selectedYear) {
    clearReplay(map);
    setActiveTripButton(-1);

    const visibleBounds = [];

    tripLayers.forEach(tripData => {
      const tripYear = getTripYear(tripData.trip);
      const shouldShow =
        selectedYear === null ||
        (tripYear !== null && tripYear <= selectedYear);

      if (shouldShow) {
        if (!map.hasLayer(tripData.layerGroup)) {
          tripData.layerGroup.addTo(map);
        }

        (tripData.trip.stops || []).forEach(stop => {
          visibleBounds.push([stop.lat, stop.lng]);
        });
      } else {
        if (map.hasLayer(tripData.layerGroup)) {
          map.removeLayer(tripData.layerGroup);
        }
      }
    });

    renderTripList(
      selectedYear === null
        ? tripLayers
        : tripLayers.filter(tripData => {
            const tripYear = getTripYear(tripData.trip);
            return tripYear !== null && tripYear <= selectedYear;
          }),
      map,
      onAfterRender
    );

    if (visibleBounds.length > 0) {
      map.fitBounds(visibleBounds, { padding: [30, 30] });
    }
  }

  return {
    tripLayers,
    yearRange,
    applyYearFilter
  };
}