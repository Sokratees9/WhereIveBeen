import { markerColors, markerLabels } from "./config.js";
import { escapeHtml } from "./trips.js";

let legendControl = null;
let legendVisible = true;

export function createMap() {
  const map = L.map("map").setView([50,5],4);
  L.tileLayer(
    "https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png",
    {
      attribution:"© OpenStreetMap contributors"
    }
  ).addTo(map);
  return map;
}

export function addLegend(map) {
  legendControl = L.control({ position: "bottomright" });
  legendControl.onAdd = function () {
    const div = L.DomUtil.create("div", "legend");
    const stopItems = getLegendEntries(markerColors, markerLabels)
      .map(entry => `
        <div class="legend-item">
          <span class="legend-triangle" style="--marker-color:${entry.color}"></span>
          ${escapeHtml(entry.label)}
        </div>
      `).join("");

    div.innerHTML = `
			<h4>Stops</h4>
			${stopItems}

			<h4 style="margin-top:10px;">Other</h4>
			<div class="legend-item legend-lived"
					title="Circle size represents approximately how long I lived in that place.">
				<span class="legend-lived-circle"></span>
				Places I've lived
			</div>
		`;
    return div;
  };
  legendControl.addTo(map);
}

export function addLegendToggle(map) {
  const toggleControl = L.control({ position: "topright" });
  toggleControl.onAdd = function () {
    const button = L.DomUtil.create("button", "legend-toggle");
    button.textContent = "Hide legend";
    L.DomEvent.disableClickPropagation(button);

    button.onclick = () => {
      if (legendVisible) {
        map.removeControl(legendControl);
        button.textContent = "Show legend";
      } else {
        legendControl.addTo(map);
        button.textContent = "Hide legend";
      }
      legendVisible = !legendVisible;
    };
    return button;
  };
  toggleControl.addTo(map);
}

function getLegendEntries(markerColors, markerLabels) {
  const seen = new Set();
  const entries = [];

  Object.entries(markerLabels).forEach(([type,label]) => {
    if(seen.has(label)) return;

    seen.add(label);
    entries.push({
      type,
      label,
      color: markerColors[type]
    });
  });
  return entries;
}