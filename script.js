// Firebase Config
const firebaseConfig = {
  apiKey: "AIzaSyCLtr21dwLVVjZ_ngFDE50aaFjUr1OqZ_0",
  authDomain: "cjd2-7557c.firebaseapp.com",
  databaseURL: "https://cjd2-7557c-default-rtdb.asia-southeast1.firebasedatabase.app/",
  projectId: "cjd2-7557c",
  storageBucket: "cjd2-7557c.appspot.com",
  messagingSenderId: "604281951557",
  appId: "1:604281951557:web:c0d2304add5b5275dbda2c"
};

firebase.initializeApp(firebaseConfig);
const db = firebase.database();

// Time limits in milliseconds
const viewLimits = {
  hour: 3600000,
  day: 86400000,
  month: 2592000000,
  year: 31536000000
};

// Chart initialization
const batteryChart = new Chart(document.getElementById("batteryPerformanceChart"), {
  type: 'line',
  data: {
    labels: [],
    datasets: [
      { label: "Voltage (V)", data: [], borderColor: "blue", fill: false },
      { label: "Current (A)", data: [], borderColor: "green", fill: false }
    ]
  },
  options: {
    responsive: true,
    scales: {
      x: { title: { display: true, text: "Time" } },
      y: { beginAtZero: true, title: { display: true, text: "Value" } }
    }
  }
});

const voltageChart = new Chart(document.getElementById("voltageGraph"), {
  type: 'line',
  data: {
    labels: [],
    datasets: [
      { label: "Voltage (V)", data: [], borderColor: "purple", fill: false }
    ]
  },
  options: {
    responsive: true,
    scales: {
      x: { title: { display: true, text: "Time" } },
      y: { beginAtZero: true, title: { display: true, text: "Voltage" } }
    }
  }
});

const tempChart = new Chart(document.getElementById("temperatureGraph"), {
  type: 'line',
  data: {
    labels: [],
    datasets: [
      { label: "Temperature (°C)", data: [], borderColor: "red", fill: false }
    ]
  },
  options: {
    responsive: true,
    scales: {
      x: { title: { display: true, text: "Time" } },
      y: { beginAtZero: true, title: { display: true, text: "Temperature" } }
    }
  }
});

// Fetch and fill gaps in data
function fetchAndUpdateCharts(view = 'day') {
  const now = Date.now();

  db.ref("arduino/history").once("value", (snapshot) => {
    const history = snapshot.val();
    if (!history) return;

    const entries = Object.entries(history)
      .map(([ts, data]) => ({ 
        time: Number(ts) * 1000,
        voltage: parseFloat(data.voltage),
        current: parseFloat(data.current),
        temperature: parseFloat(data.temperature)
      }))
      .filter(entry => now - entry.time <= viewLimits[view])
      .sort((a, b) => a.time - b.time);

    if (entries.length === 0) return;

    const filledLabels = [], voltages = [], currents = [], temps = [];
    const step = view === 'hour' ? 60000 : view === 'day' ? 300000 : 3600000; // 1 min / 5 min / 1 hr
    const halfStep = step / 2;

    let pointer = entries[0].time;
    const endTime = entries[entries.length - 1].time;

    while (pointer <= endTime) {
      const date = new Date(pointer);
      let label = view === 'hour' 
        ? date.toLocaleTimeString() 
        : view === 'day' 
          ? date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) 
          : view === 'month' 
            ? date.toLocaleDateString() 
            : date.getFullYear().toString();

      // Find the closest data point within ±halfStep
      let nearest = null;
      let minDiff = Infinity;
      for (let i = 0; i < entries.length; i++) {
        const diff = Math.abs(entries[i].time - pointer);
        if (diff <= halfStep && diff < minDiff) {
          nearest = entries[i];
          minDiff = diff;
        }
      }

      if (nearest) {
        voltages.push(nearest.voltage);
        currents.push(nearest.current);
        temps.push(nearest.temperature);
      } else {
        voltages.push(0);
        currents.push(0);
        temps.push(0);
      }

      filledLabels.push(label);
      pointer += step;
    }

    // Update charts
    batteryChart.data.labels = filledLabels;
    batteryChart.data.datasets[0].data = voltages;
    batteryChart.data.datasets[1].data = currents;
    batteryChart.update();

    voltageChart.data.labels = filledLabels;
    voltageChart.data.datasets[0].data = voltages;
    voltageChart.update();

    tempChart.data.labels = filledLabels;
    tempChart.data.datasets[0].data = temps;
    tempChart.update();
  });
}

// View change event handlers
function changeGraphView(view) { fetchAndUpdateCharts(view); }
function changeVoltageGraphView(view) { fetchAndUpdateCharts(view); }
function changeTempGraphView(view) { fetchAndUpdateCharts(view); }

// Real-time value updates
db.ref("arduino/latest").on("value", (snapshot) => {
  const data = snapshot.val();
  if (data) {
    document.getElementById("temp").textContent = data.temperature;
    document.getElementById("battery").textContent = data.battery;
    document.getElementById("currentDate").textContent = data.date;
    document.getElementById("currentTime").textContent = data.time;
    document.getElementById("voltage-value").textContent = data.voltage;
  }
});

// Load default
fetchAndUpdateCharts('day');
