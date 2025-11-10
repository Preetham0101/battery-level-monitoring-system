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

const auth = firebase.auth();
const db = firebase.database();

// ---------- AUTH PAGE HANDLING ----------
const loginToggle = document.getElementById("loginToggle");
const signupToggle = document.getElementById("signupToggle");
const loginForm = document.getElementById("loginForm");
const signupForm = document.getElementById("signupForm");

if (loginToggle && signupToggle) {
  loginToggle.addEventListener("click", () => {
    loginToggle.classList.add("active");
    signupToggle.classList.remove("active");
    loginForm.classList.add("active");
    signupForm.classList.remove("active");
  });

  signupToggle.addEventListener("click", () => {
    signupToggle.classList.add("active");
    loginToggle.classList.remove("active");
    signupForm.classList.add("active");
    loginForm.classList.remove("active");
  });
}

// ---------- Signup ----------
if (signupForm) {
  signupForm.addEventListener("submit", (e) => {
    e.preventDefault();
    const name = document.getElementById("signupName").value.trim();
    const username = document.getElementById("signupUsername").value.trim();
    const email = document.getElementById("signupEmail").value.trim();
    const password = document.getElementById("signupPassword").value;

    auth.createUserWithEmailAndPassword(email, password)
      .then((cred) => {
        return db.ref("users/" + cred.user.uid).set({
          name, username, email, createdAt: new Date().toISOString()
        });
      })
      .then(() => {
        alert("Signup successful!");
        signupForm.reset();
      })
      .catch((err) => alert("Signup failed: " + err.message));
  });
}

// ---------- Login ----------
if (loginForm) {
  loginForm.addEventListener("submit", (e) => {
    e.preventDefault();
    const email = document.getElementById("loginEmail").value.trim();
    const password = document.getElementById("loginPassword").value;

    auth.signInWithEmailAndPassword(email, password)
      .then(() => {
        alert("Login successful!");
        window.location.href = "index.html";
      })
      .catch((err) => alert("Login failed: " + err.message));
  });
}

// ---------- Auth Protection ----------
auth.onAuthStateChanged((user) => {
  const onLogin = window.location.pathname.includes("login.html");
  const onDashboard = window.location.pathname.includes("index.html");
  if (!user && onDashboard) window.location.href = "login.html";
  if (user && onLogin) window.location.href = "index.html";
});

// ---------- Logout ----------
const logoutBtn = document.getElementById("logoutBtn");
if (logoutBtn) {
  logoutBtn.addEventListener("click", () => {
    auth.signOut().then(() => window.location.href = "login.html");
  });
}

// ---------- DASHBOARD ----------
if (document.getElementById("batteryCircle")) {
  // --- Battery Circle ---
  function updateBatteryCircle(level) {
    const circle = document.getElementById("batteryCircle");
    const status = document.getElementById("batteryStatus");
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

  // --- Create Chart Function ---
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
          fill: true,
          tension: 0.4,
          borderWidth: 2,
          pointRadius: 0
        }]
      },
      options: {
        responsive: true,
        animation: false,
        plugins: { legend: { labels: { color: "#fff" } } },
        scales: {
          x: { ticks: { color: "#fff", maxRotation: 45, minRotation: 45 } },
          y: { ticks: { color: "#fff" } }
        }
      }
    });
  }

  const voltageChart = createChart(document.getElementById("voltageChart"), "Voltage (V)", "#03a9f4");
  const batteryChart = createChart(document.getElementById("batteryChart"), "Battery %", "#4caf50");
  const temperatureChart = createChart(document.getElementById("temperatureChart"), "Temperature (°C)", "#ff5722");

  // --- Add Data ---
  function addData(chart, label, value, maxPoints = 100) {
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
      hour12: false,
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit"
    });
  }

  // --- Load Historical Data ---
  function loadHistoryData() {
    db.ref("arduino/history").limitToLast(500).once("value", (snapshot) => {
      if (!snapshot.exists()) return;
      const data = snapshot.val();
      const keys = Object.keys(data).sort((a, b) => Number(a) - Number(b));

      keys.forEach((ts) => {
        const entry = data[ts];
        const v = parseFloat(entry.VOLT || 0);
        const t = parseFloat(entry.TEMP || 0);
        const label = formatTimestamp(ts);
        if (!isNaN(v)) addData(voltageChart, label, v);
        if (!isNaN(t)) addData(temperatureChart, label, t);
        if (!isNaN(v)) {
          const battery = Math.min(Math.max(((v - 3) / (4.2 - 3)) * 100, 0), 100);
          addData(batteryChart, label, Number(battery.toFixed(1)));
        }
      });

      voltageChart.update();
      batteryChart.update();
      temperatureChart.update();
    });
  }

  // --- Live Updates ---
  db.ref("arduino/latest").on("value", (snap) => {
    const d = snap.val();
    if (!d) return;
    const v = parseFloat(d.VOLT || 0);
    const t = parseFloat(d.TEMP || 0);
    const battery = Math.min(Math.max(((v - 3) / (4.2 - 3)) * 100, 0), 100);
    updateBatteryCircle(Math.round(battery));
    const lbl = formatTimestamp(Date.now());
    addData(voltageChart, lbl, v);
    addData(batteryChart, lbl, battery);
    addData(temperatureChart, lbl, t);
    voltageChart.update("none");
    batteryChart.update("none");
    temperatureChart.update("none");
  });

  // --- Zoom Modal + Drag Anywhere ---
  const chartModal = document.getElementById("chartModal");
  const zoomedChartCanvas = document.getElementById("zoomedChart");
  const zoomTitle = document.getElementById("zoomTitle");
  const downloadChartBtn = document.getElementById("downloadChart");
  const resetZoomBtn = document.getElementById("resetZoomBtn");
  const closeModalBtn = document.getElementById("closeModal");
  const draggableModal = document.getElementById("draggableModal");
  let zoomedChart = null;

  function openChartModal(chart) {
    if (zoomedChart) zoomedChart.destroy();
    const dataCopy = JSON.parse(JSON.stringify(chart.data));
    zoomTitle.textContent = chart.data.datasets[0].label;
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
        scales: { x: { ticks: { color: "#fff" } }, y: { ticks: { color: "#fff" } } }
      }
    });

    setTimeout(() => (downloadChartBtn.href = zoomedChart.toBase64Image()), 200);
  }

  function closeChartModal() {
    chartModal.setAttribute("aria-hidden", "true");
    if (zoomedChart) zoomedChart.destroy();
  }

  closeModalBtn.addEventListener("click", closeChartModal);
  chartModal.addEventListener("click", (e) => {
    if (e.target === chartModal) closeChartModal();
  });
  resetZoomBtn.addEventListener("click", () => zoomedChart && zoomedChart.resetZoom());

  document.querySelectorAll(".clickable-chart").forEach((canvas) => {
    canvas.addEventListener("click", () => {
      if (canvas.id === "voltageChart") openChartModal(voltageChart);
      else if (canvas.id === "batteryChart") openChartModal(batteryChart);
      else if (canvas.id === "temperatureChart") openChartModal(temperatureChart);
    });
  });

  // --- Drag Modal Anywhere ---
  let offsetX = 0, offsetY = 0, isDragging = false;
  draggableModal.addEventListener("mousedown", (e) => {
    isDragging = true;
    offsetX = e.clientX - draggableModal.offsetLeft;
    offsetY = e.clientY - draggableModal.offsetTop;
    draggableModal.style.transition = "none";
    e.preventDefault();
  });
  window.addEventListener("mousemove", (e) => {
    if (isDragging) {
      draggableModal.style.left = `${e.clientX - offsetX}px`;
      draggableModal.style.top = `${e.clientY - offsetY}px`;
      draggableModal.style.position = "absolute";
      draggableModal.style.zIndex = "9999";
    }
  });
  window.addEventListener("mouseup", () => (isDragging = false));

  // --- Initialize ---
  loadHistoryData();
}
