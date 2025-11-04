// src/scripts/progress.js
// Handles client-side logic for the Progress page

export function renderView(viewName) {
  console.log('🎨 renderView called with:', viewName);
  
  const barGraph = document.getElementById("barGraph");
  const graphLabels = document.getElementById("graphLabels");
  
  console.log('📊 Elements found:', { barGraph: !!barGraph, graphLabels: !!graphLabels, views: !!window.views });
  
  if (!barGraph || !graphLabels || !window.views) {
    console.error('❌ Missing required elements or data');
    return;
  }

  const view = window.views[viewName];
  if (!view) {
    console.error('❌ View not found:', viewName);
    return;
  }

  const { labels, values } = view;
  console.log('📈 Rendering data:', { labels, values });
  
  const maxValue = Math.max(...values, 1); // Ensure at least 1 to avoid division by 0
  console.log('📏 Max value:', maxValue);

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
    tooltip.textContent = value > 0 ? `${value}` : '0';

    const bar = document.createElement("div");
    bar.className = "bar";
    
    // Calculate height percentage
    const heightPercent = maxValue > 0 ? (value / maxValue) * 100 : 0;
    bar.style.height = `${Math.max(heightPercent, value > 0 ? 8 : 0)}%`;
    
    // Set color based on relative value (gradient from low to high activity)
    if (value === 0) {
      bar.style.background = "linear-gradient(180deg, #475569 0%, #334155 100%)";
      bar.style.boxShadow = "0 2px 8px rgba(51, 65, 85, 0.3)";
    } else if (value >= maxValue * 0.7) {
      bar.style.background = "linear-gradient(180deg, #34d399 0%, #10b981 100%)";
      bar.style.boxShadow = "0 4px 12px rgba(16, 185, 129, 0.3)";
    } else if (value >= maxValue * 0.4) {
      bar.style.background = "linear-gradient(180deg, #fbbf24 0%, #f59e0b 100%)";
      bar.style.boxShadow = "0 4px 12px rgba(245, 158, 11, 0.3)";
    } else {
      bar.style.background = "linear-gradient(180deg, #60a5fa 0%, #3b82f6 100%)";
      bar.style.boxShadow = "0 4px 12px rgba(59, 130, 246, 0.3)";
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
