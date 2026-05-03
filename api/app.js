const express = require("express");
const { Client } = require("pg");
const app = express();
const port = process.env.PORT || 8090;

app.get("/", (req,res)=>res.json({service:"api",status:"ok",time:new Date()}));

app.get("/db", async (req,res)=>{
 const client=new Client({host:process.env.DB_HOST||"db",user:"postgres",password:"postgres",database:"postgres"});
 try{ await client.connect(); const r=await client.query("SELECT NOW()"); await client.end(); res.json(r.rows[0]);}
 catch(e){ res.status(500).json({error:e.message});}
});

app.get("/crash",(req,res)=>{res.json({msg:"crash"});process.exit(1);});


app.listen(port,()=>console.log("API running"));
