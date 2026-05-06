const express = require("express");
const client = require("prom-client");
const { Client } = require("pg");
const app = express();
const port = process.env.PORT || 8090;

app.get("/", (req,res)=>res.json({service:"api",status:"ok",time:new Date()}));

app.get("/db", async (req,res)=>{
 const client=new Client({host:process.env.DB_HOST||"db",user:"postgres",password:"postgres",database:"postgres"});
 try{ await client.connect(); const r=await client.query("SELECT NOW()"); await client.end(); res.json(r.rows[0]);}
 catch(e){ res.status(500).json({error:e.message});}
});

app.get("/health", (req, res) => {
  res.json({ status: "healthy", time: new Date() });
});

app.get("/crash",(req,res)=>{res.json({msg:"crash"});process.exit(1);});

const register = new client.Registry();

client.collectDefaultMetrics({
  register,
});

const httpRequestDurationMicroseconds = new client.Histogram({
  name: "http_request_duration_ms",
  help: "Duration of HTTP requests in ms",
  labelNames: ["route", "method", "status_code"],
  buckets: [50, 100, 200, 300, 400, 500],
});

register.registerMetric(httpRequestDurationMicroseconds);

app.use((req, res, next) => {
  const start = Date.now();

  res.on("finish", () => {
    const duration = Date.now() - start;

    httpRequestDurationMicroseconds
      .labels(req.route?.path || req.path, req.method, res.statusCode)
      .observe(duration);
  });

  next();
});

app.get("/metrics", async (req, res) => {
  res.set("Content-Type", register.contentType);
  res.end(await register.metrics());
});

app.listen(port,()=>console.log("API running"));
