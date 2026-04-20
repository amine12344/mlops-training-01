const express = require("express");
const app = express();
const port = process.env.PORT || 8090;

app.get("/", (req,res)=>res.json({service:"api",status:"ok",time:new Date()}));

app.get("/crash",(req,res)=>{res.json({msg:"crash"});process.exit(1);});

app.listen(port,()=>console.log("API running"));
