async function checkApi() {
  const output = document.getElementById("output");

  try {
    const res = await fetch("/api/health");
    const data = await res.json();
    output.textContent = JSON.stringify(data, null, 2);
  } catch (err) {
    output.textContent = err.message;
  }
}