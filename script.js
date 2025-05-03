// Your Firebase config
const firebaseConfig = {
  apiKey: "AIzaSyCLtr21dwLVVjZ_ngFDE50aaFjUr1OqZ_0",
  authDomain: "cjd2-7557c.firebaseapp.com",
  databaseURL: "https://cjd2-7557c-default-rtdb.asia-southeast1.firebasedatabase.app/",
  projectId: "cjd2-7557c",
  storageBucket: "cjd2-7557c.appspot.com",
  messagingSenderId: "604281951557",
  appId: "1:604281951557:web:c0d2304add5b5275dbda2c"
};

// Initialize Firebase
firebase.initializeApp(firebaseConfig);
const db = firebase.database();

// Chart setup
const ctx = document.getElementById("batteryPerformanceChart").getContext("2d");
const chart = new Chart(ctx, {
  type: 'line',
  data: {
    labels: [],
    datasets: [{
      label: 'Voltage (V)',
      data: [],
      borderColor: 'blue',
      fill: false
    }, {
      label: 'Current (A)',
      data: [],
      borderColor: 'green',
      fill: false
    }]
  },
  options: {
    responsive: true,
    scales: {
      x: { title: { display: true, text: 'Timestamp' }},
      y: { title: { display: true, text: 'Values' }}
    }
  }
});

// Read historical data once
db.ref("arduino/history").once("value", (snapshot) => {
  const history = snapshot.val();
  if (history) {
    const timestamps = [];
    const voltages = [];
    const currents = [];

    Object.entries(history).forEach(([timestamp, rawData]) => {
      const voltageMatch = rawData.match(/Voltage:\s*([\d.]+)\s*V/);
      const currentMatch = rawData.match(/Current:\s*(-?[\d.]+)\s*A/);

      if (voltageMatch && currentMatch) {
        timestamps.push(new Date(Number(timestamp) * 1000).toLocaleTimeString());
        voltages.push(parseFloat(voltageMatch[1]));
        currents.push(parseFloat(currentMatch[1]));
      }
    });

    chart.data.labels = timestamps;
    chart.data.datasets[0].data = voltages;
    chart.data.datasets[1].data = currents;
    chart.update();
  } else {
    console.warn("No history data found.");
  }
});

// ✅ New function to prevent the error
function changeGraphView(view) {
  console.log(`Graph view changed to: ${view}`);
  // Later: filter the data by hour/day/month/year based on the view
}
