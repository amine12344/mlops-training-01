async function callApi(path, targetId) {
  const target = document.getElementById(targetId);

  try {
    target.textContent = "Loading...";
    const response = await fetch(`/api${path}`);
    const data = await response.json();
    target.textContent = JSON.stringify(data, null, 2);
  } catch (error) {
    target.textContent = JSON.stringify({ error: error.message }, null, 2);
  }
}

function checkHealth() {
  callApi("/health", "health");
}

function checkDatabase() {
  callApi("/db", "database");
}

function loadMetrics() {
  fetch("/api/metrics")
    .then((res) => res.text())
    .then((text) => {
      document.getElementById("metrics").textContent = text.slice(0, 1200);
    })
    .catch((err) => {
      document.getElementById("metrics").textContent = err.message;
    });
}