// wrappers around chart.js to draw the grouped bar chart
// exports render & destroy functions

const ChartRenderer = (() => {
  let _chartInstance = null;

  // create or update chart instance
  function render(canvasId, labels, activeData, newData) {
    // Destroy any existing chart to prevent overlap
    if (_chartInstance) {
      _chartInstance.destroy();
      _chartInstance = null;
    }

    const ctx = document.getElementById(canvasId).getContext("2d");

    // Gradient for active users bars (blue)
    const blueGradient = ctx.createLinearGradient(0, 0, 0, 400);
    blueGradient.addColorStop(0, "rgba(79, 142, 247, 0.95)");
    blueGradient.addColorStop(1, "rgba(79, 142, 247, 0.55)");

    // Gradient for new users bars (orange)
    const orangeGradient = ctx.createLinearGradient(0, 0, 0, 400);
    orangeGradient.addColorStop(0, "rgba(255, 122, 61, 0.95)");
    orangeGradient.addColorStop(1, "rgba(255, 122, 61, 0.55)");

    _chartInstance = new Chart(ctx, {
      type: "bar",
      data: {
        labels,
        datasets: [
          {
            label: "Active Users (Messaging)",
            data: activeData,
            backgroundColor: blueGradient,
            borderColor: "rgba(79, 142, 247, 1)",
            borderWidth: 2,
            borderRadius: 8,
            borderSkipped: false,
            order: 1,
          },
          {
            label: "New Users (Joined)",
            data: newData,
            backgroundColor: orangeGradient,
            borderColor: "rgba(255, 122, 61, 1)",
            borderWidth: 2,
            borderRadius: 8,
            borderSkipped: false,
            order: 2,
          },
        ],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        animation: {
          duration: 900,
          easing: "easeOutQuart",
        },
        plugins: {
          legend: {
            display: true,
            position: "top",
            labels: {
              color: "#C9D1E3",
              font: { family: "'Inter', sans-serif", size: 13 },
              padding: 20,
              usePointStyle: true,
              pointStyle: "rectRounded",
            },
          },
          tooltip: {
            backgroundColor: "rgba(15, 18, 28, 0.92)",
            titleColor: "#E2E8F8",
            bodyColor: "#98A4C0",
            borderColor: "rgba(79, 142, 247, 0.35)",
            borderWidth: 1,
            padding: 12,
            cornerRadius: 10,
            titleFont: { family: "'Inter', sans-serif", size: 13, weight: "600" },
            bodyFont:  { family: "'Inter', sans-serif", size: 12 },
            callbacks: {
              label(ctx) {
                return `  ${ctx.dataset.label}: ${ctx.parsed.y}`;
              },
            },
          },
        },
        scales: {
          x: {
            ticks: {
              color: "#8892AA",
              font: { family: "'Inter', sans-serif", size: 12 },
            },
            grid: {
              color: "rgba(255,255,255,0.04)",
              drawBorder: false,
            },
          },
          y: {
            beginAtZero: true,
            ticks: {
              color: "#8892AA",
              font: { family: "'Inter', sans-serif", size: 12 },
              stepSize: 1,
              precision: 0,
            },
            grid: {
              color: "rgba(255,255,255,0.06)",
              drawBorder: false,
            },
          },
        },
      },
    });

    return _chartInstance;
  }

  function destroy() {
    if (_chartInstance) {
      _chartInstance.destroy();
      _chartInstance = null;
    }
  }

  return { render, destroy };
})();
