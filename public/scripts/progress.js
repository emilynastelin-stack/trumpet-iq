// src/scripts/progress.js
// Handles client-side logic for the Progress page

export function renderView(viewName) {
  const barGraph = document.getElementById("barGraph");
  const graphLabels = document.getElementById("graphLabels");
  
  if (!barGraph || !graphLabels || !window.views) return;

  const view = window.views[viewName];
  if (!view) return;

  const { labels, values } = view;
  const maxValue = Math.max(...values, 1); // Ensure at least 1 to avoid division by 0

  // Clear existing content
  barGraph.innerHTML = "";
  graphLabels.innerHTML = "";

  // Create bars
  values.forEach((value, index) => {
    const barWrapper = document.createElement("div");
    barWrapper.className = "bar-wrapper";
    barWrapper.style.flex = "1";

    const tooltip = document.createElement("div");
    tooltip.className = "bar-tooltip";
    tooltip.textContent = `${value}%`;

    const bar = document.createElement("div");
    bar.className = "bar";
    
    // Calculate height percentage
    const heightPercent = (value / maxValue) * 100;
    bar.style.height = `${heightPercent}%`;
    
    // Set color based on value
    if (value >= 75) {
      bar.style.background = "linear-gradient(180deg, #34d399 0%, #10b981 100%)";
      bar.style.boxShadow = "0 4px 12px rgba(16, 185, 129, 0.3)";
    } else if (value >= 50) {
      bar.style.background = "linear-gradient(180deg, #fbbf24 0%, #f59e0b 100%)";
      bar.style.boxShadow = "0 4px 12px rgba(245, 158, 11, 0.3)";
    } else {
      bar.style.background = "linear-gradient(180deg, #f87171 0%, #ef4444 100%)";
      bar.style.boxShadow = "0 4px 12px rgba(239, 68, 68, 0.3)";
    }

    barWrapper.appendChild(tooltip);
    barWrapper.appendChild(bar);
    barGraph.appendChild(barWrapper);

    // Show tooltip on hover
    barWrapper.addEventListener("mouseenter", () => {
      tooltip.style.opacity = "1";
    });
    barWrapper.addEventListener("mouseleave", () => {
      tooltip.style.opacity = "0";
    });
  });

  // Create labels
  labels.forEach((label) => {
    const labelEl = document.createElement("div");
    labelEl.style.flex = "1";
    labelEl.style.textAlign = "center";
    labelEl.textContent = label;
    graphLabels.appendChild(labelEl);
  });
}
