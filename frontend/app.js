document.addEventListener("DOMContentLoaded", () => {
  const appVersion = window.APP_VERSION || {
    version: "local-dev",
    commit: "unknown",
    buildTime: "unknown"
  };

  document.getElementById("version").textContent = appVersion.version;
  document.getElementById("commit").textContent = appVersion.commit;
  document.getElementById("buildTime").textContent = appVersion.buildTime;
});

async function callApi(path, targetId, responseType = "json") {
  const target = document.getElementById(targetId);

  try {
    target.textContent = "Loading...";

    const response = await fetch(`/api${path}`);

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }

    if (responseType === "text") {
      const text = await response.text();
      target.textContent = text.slice(0, 1400);
      return;
    }

    const data = await response.json();
    target.textContent = JSON.stringify(data, null, 2);
  } catch (error) {
    target.textContent = JSON.stringify(
      {
        status: "error",
        message: error.message
      },
      null,
      2
    );
  }
}

function checkHealth() {
  callApi("/health", "health");
}

function checkDatabase() {
  callApi("/db", "database");
}

function loadMetrics() {
  callApi("/metrics", "metrics", "text");
}