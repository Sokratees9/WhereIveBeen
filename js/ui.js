export function updateTripListHeight() {
  const tripsDetails = document.getElementById("trips-details");
  const tripList = document.getElementById("trip-list");

  if (!tripsDetails || !tripList) return;

  if (window.innerWidth <= 800) {
    tripList.style.height = "";
    return;
  }

  if (!tripsDetails.open) {
    tripList.style.height = "0px";
    return;
  }

  const listRect = tripList.getBoundingClientRect();
  const detailsRect = tripsDetails.getBoundingClientRect();
  const available = detailsRect.bottom - listRect.top - 12;

  tripList.style.height = `${Math.max(120, Math.floor(available))}px`;
}

export function scheduleTripListHeightUpdate() {
  requestAnimationFrame(() => {
    requestAnimationFrame(() => {
      updateTripListHeight();
    });
  });
}

export function initUI(map, tripController) {
  const yearSlider = document.getElementById("year-slider");
  const yearValue = document.getElementById("year-value");
  const yearMin = document.getElementById("year-min");
  const yearMax = document.getElementById("year-max");
  const showAllBtn = document.getElementById("show-all-btn");

  const { yearRange, applyYearFilter } = tripController;

  yearSlider.min = yearRange.min;
  yearSlider.max = yearRange.max;
  yearSlider.value = yearRange.max;
  yearMin.textContent = yearRange.min;
  yearMax.textContent = yearRange.max;
  yearValue.textContent = yearRange.max;

  yearSlider.addEventListener("input", () => {
    const selectedYear = Number(yearSlider.value);
    yearValue.textContent = selectedYear;
    applyYearFilter(selectedYear);
    scheduleTripListHeightUpdate();
  });

  showAllBtn.addEventListener("click", () => {
    yearSlider.value = yearRange.max;
    yearValue.textContent = "All";
    applyYearFilter(null);
    scheduleTripListHeightUpdate();
  });

  window.addEventListener("resize", scheduleTripListHeightUpdate);
  window.addEventListener("load", scheduleTripListHeightUpdate);

  document.querySelectorAll("#timeline-shell, #trips-details").forEach(section => {
    section.addEventListener("toggle", () => {
      setTimeout(() => {
        map.invalidateSize();
        scheduleTripListHeightUpdate();
      }, 200);
    });
  });
}