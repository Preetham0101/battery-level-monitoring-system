// ---------- Firebase Config ----------
const firebaseConfig = {
  apiKey: "AIzaSyBCwhjguHWNJM0L0GwRfoOS3lwrT53YU3Q",
  authDomain: "battery-monitoring-syste-46d3c.firebaseapp.com",
  databaseURL: "https://battery-monitoring-syste-46d3c-default-rtdb.firebaseio.com",
  projectId: "battery-monitoring-syste-46d3c",
  storageBucket: "battery-monitoring-syste-46d3c.firebasestorage.app",
  messagingSenderId: "1081428256051",
  appId: "1:1081428256051:web:76ae93261bb694c6b40a46",
  measurementId: "G-5V81MZ39W1"
};
firebase.initializeApp(firebaseConfig);
const db = firebase.database();

// ---------- Battery Circle ----------
function updateBatteryCircle(level) {
  const circle = document.getElementById("batteryCircle");
  const status = document.getElementById("batteryStatus");
  circle.style.setProperty("--level", `${level}%`);
  circle.textContent = `${level}%`;

  if (level > 60) {
    circle.style.background = `conic-gradient(#4caf50 ${level}%, #444 ${level}%)`;
    status.textContent = "Healthy ✅";
  } else if (level > 30) {
    circle.style.background = `conic-gradient(#ff9800 ${level}%, #444 ${level}%)`;
    status.textContent = "Moderate ⚠️";
  } else {
    circle.style.background = `conic-gradient(#f44336 ${level}%, #444 ${level}%)`;
    status.textContent = "Low Battery ❌";
  }
}

// ---------- Chart.js Setup ----------
function createChart(ctx, label, color) {
  return new Chart(ctx, {
    type: "line",
    data: {
      labels: [],
      datasets: [{
        label,
        data: [],
        borderColor: color,
        backgroundColor: color + "33",
        borderWidth: 2,
        tension: 0.4,
        fill: true,
        pointRadius: 0
      }]
    },
    options: {
      responsive: true,
      animation: false,
      plugins: {
        legend: { labels: { color: "#fff" } }
      },
      scales: {
        x: { ticks: { color: "#fff", maxRotation: 45, minRotation: 45 } },
        y: { ticks: { color: "#fff" }, beginAtZero: false }
      }
    }
  });
}

// ---------- Create Charts ----------
const voltageChart = createChart(document.getElementById("voltageChart"), "Voltage (V)", "#03a9f4");
const batteryChart = createChart(document.getElementById("batteryChart"), "Battery %", "#4caf50");
const temperatureChart = createChart(document.getElementById("temperatureChart"), "Temp (°C)", "#ff5722");

// ---------- Helpers ----------
function addData(chart, label, value, maxPoints = 50) {
  if (chart.data.labels.length >= maxPoints) {
    chart.data.labels.shift();
    chart.data.datasets[0].data.shift();
  }
  chart.data.labels.push(label);
  chart.data.datasets[0].data.push(value);
}

function formatTimestamp(ts) {
  const date = new Date(Number(ts) < 1e12 ? Number(ts) * 1000 : Number(ts));
  return date.toLocaleString("en-IN", {
    hour12: false, month: "short", day: "numeric",
    hour: "2-digit", minute: "2-digit", second: "2-digit"
  });
}

// ---------- Load Historical Data ----------
function loadHistoryData() {
  db.ref("arduino/history").limitToLast(500).once("value", (snapshot) => {
    if (!snapshot.exists()) return;
    const data = snapshot.val();
    const keys = Object.keys(data).sort((a, b) => Number(a) - Number(b));

    keys.forEach((ts) => {
      const entry = data[ts];
      const voltage = parseFloat(entry.VOLT || 0);
      const temp = parseFloat(entry.TEMP || 0);
      const label = formatTimestamp(ts);
      if (!isNaN(voltage)) addData(voltageChart, label, voltage);
      if (!isNaN(temp)) addData(temperatureChart, label, temp);
      if (!isNaN(voltage)) {
        const battery = Math.min(Math.max(((voltage - 3) / (4.2 - 3)) * 100, 0), 100);
        addData(batteryChart, label, Number(battery.toFixed(1)));
      }
    });

    voltageChart.update();
    batteryChart.update();
    temperatureChart.update();
  });
}

// ---------- Real-time ----------
let lastUpdate = 0;
function listenToLatest() {
  db.ref("arduino/latest").on("value", (snap) => {
    if (!snap.exists()) return;
    const now = Date.now();
    if (now - lastUpdate < 800) return;
    lastUpdate = now;

    const d = snap.val() || {};
    const v = parseFloat(d.VOLT || 0);
    const t = parseFloat(d.TEMP || 0);
    const battery = Math.min(Math.max(((v - 3) / (4.2 - 3)) * 100, 0), 100);
    updateBatteryCircle(Math.round(battery));
    const lbl = formatTimestamp(now);

    addData(voltageChart, lbl, v);
    addData(batteryChart, lbl, battery);
    addData(temperatureChart, lbl, t);

    voltageChart.update("none");
    batteryChart.update("none");
    temperatureChart.update("none");
  });
}

// ---------- Modal + Zoom + Drag ----------
const chartModal = document.getElementById("chartModal");
const zoomedChartCanvas = document.getElementById("zoomedChart");
const zoomTitle = document.getElementById("zoomTitle");
const downloadChartBtn = document.getElementById("downloadChart");
const resetZoomBtn = document.getElementById("resetZoomBtn");
const closeModalBtn = document.getElementById("closeModal");
const draggableModal = document.getElementById("draggableModal");
let zoomedChart = null;

function deepCopyChartData(chart) {
  return JSON.parse(JSON.stringify(chart.data));
}

function openChartModal(chart) {
  if (zoomedChart) zoomedChart.destroy();
  const dataCopy = deepCopyChartData(chart);
  zoomTitle.textContent = chart.data.datasets[0].label || "Chart";
  chartModal.setAttribute("aria-hidden", "false");

  zoomedChart = new Chart(zoomedChartCanvas, {
    type: "line",
    data: dataCopy,
    options: {
      responsive: true,
      animation: false,
      plugins: {
        legend: { labels: { color: "#fff" } },
        zoom: {
          zoom: { wheel: { enabled: true }, pinch: { enabled: true }, mode: "xy" },
          pan: { enabled: true, mode: "xy" }
        }
      },
      scales: {
        x: { ticks: { color: "#fff" } },
        y: { ticks: { color: "#fff" }, beginAtZero: false }
      }
    }
  });

  setTimeout(() => {
    try {
      downloadChartBtn.href = zoomedChart.toBase64Image();
    } catch {
      downloadChartBtn.href = "#";
    }
  }, 100);
}

function closeChartModal() {
  chartModal.setAttribute("aria-hidden", "true");
  if (zoomedChart) zoomedChart.destroy();
}

closeModalBtn.addEventListener("click", closeChartModal);
chartModal.addEventListener("click", (e) => {
  if (e.target === chartModal) closeChartModal();
});
resetZoomBtn.addEventListener("click", () => { if (zoomedChart) zoomedChart.resetZoom(); });

// ---------- Ensure click events work ----------
document.querySelectorAll(".clickable-chart").forEach((canvas) => {
  canvas.addEventListener("click", () => {
    const chartId = canvas.id;
    if (chartId === "voltageChart") openChartModal(voltageChart);
    else if (chartId === "batteryChart") openChartModal(batteryChart);
    else if (chartId === "temperatureChart") openChartModal(temperatureChart);
  });
});

// ---------- Drag Modal ----------
let offsetX = 0, offsetY = 0, isDragging = false;
draggableModal.addEventListener("mousedown", (e) => {
  isDragging = true;
  offsetX = e.clientX - draggableModal.offsetLeft;
  offsetY = e.clientY - draggableModal.offsetTop;
  draggableModal.style.transition = "none";
});
window.addEventListener("mousemove", (e) => {
  if (isDragging) {
    draggableModal.style.left = `${e.clientX - offsetX}px`;
    draggableModal.style.top = `${e.clientY - offsetY}px`;
  }
});
window.addEventListener("mouseup", () => isDragging = false);

// ---------- Initialize ----------
loadHistoryData();
listenToLatest();
