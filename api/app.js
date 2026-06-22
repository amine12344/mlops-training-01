const express = require("express");
const { Client } = require("pg");
const clientMetrics = require("prom-client");

const app = express();
const port = process.env.PORT || 8090;

clientMetrics.collectDefaultMetrics();

const httpRequestsTotal = new clientMetrics.Counter({
  name: "mlops_http_requests_total",
  help: "Total HTTP requests",
  labelNames: ["method", "route", "status"]
});

app.use((req, res, next) => {
  res.on("finish", () => {
    httpRequestsTotal.inc({
      method: req.method,
      route: req.path,
      status: res.statusCode
    });
  });
  next();
});

function createDbClient() {
  return new Client({
    host: process.env.DB_HOST || "postgres",
    port: Number(process.env.DB_PORT || 5432),
    user: process.env.DB_USER || "postgres",
    password: process.env.DB_PASSWORD || "postgres",
    database: process.env.DB_NAME || "mlops_db"
  });
}

app.get("/", (req, res) => {
  res.json({
    service: "mlops-training-api",
    owner: "Hajji Amine",
    status: "ok",
    version: process.env.APP_VERSION || "local",
    time: new Date().toISOString()
  });
});

app.get("/health", (req, res) => {
  res.json({
    status: "healthy",
    time: new Date().toISOString()
  });
});

app.get("/readyz", async (req, res) => {
  const db = createDbClient();

  try {
    await db.connect();
    await db.query("SELECT 1");
    await db.end();

    res.json({
      status: "ready",
      database: "reachable"
    });
  } catch (error) {
    res.status(500).json({
      status: "not-ready",
      error: error.message
    });
  }
});

app.get("/db", async (req, res) => {
  const db = createDbClient();

  try {
    await db.connect();
    const result = await db.query("SELECT NOW() as now");
    await db.end();

    res.json({
      database: "connected",
      now: result.rows[0].now
    });
  } catch (error) {
    res.status(500).json({
      database: "error",
      error: error.message
    });
  }
});

app.get("/metrics", async (req, res) => {
  res.set("Content-Type", clientMetrics.register.contentType);
  res.end(await clientMetrics.register.metrics());
});

app.get("/crash", (req, res) => {
  res.json({ message: "crashing intentionally" });
  process.exit(1);
});

app.listen(port, () => {
  console.log(`API running on port ${port}`);
});