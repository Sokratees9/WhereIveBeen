import { createMap, addLegend, addLegendToggle } from "./map.js";
import { loadTrips, renderTrips } from "./trips.js";
import { loadLived, renderLivedPlaces } from "./lived.js";
import { initUI, scheduleTripListHeightUpdate } from "./ui.js";
import { markerColors, markerLabels } from "./config.js";

const map = createMap();

async function start() {
  const trips = await loadTrips("data/trips.json");

  let lived = [];
  try {
    lived = await loadLived("data/lived.json");
  } catch {
    console.warn("lived.json not found yet");
  }

  const tripController = renderTrips(map, trips, {
    onAfterRender: scheduleTripListHeightUpdate
  });

  renderLivedPlaces(map, lived);

  addLegend(map, markerColors, markerLabels);
  addLegendToggle(map);

  initUI(map, tripController);
  scheduleTripListHeightUpdate();
}

start();