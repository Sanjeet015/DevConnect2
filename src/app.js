const express = require("express");

const app = express();

const PORT = 3000;

app.use("/test",(req,res)=>{
  res.end("test server");
})
app.use("/",(req,res)=>{
  res.end("Hello from the server");
})



app.listen(PORT,()=>{
  console.log(`app is successfully listening on port 3000`)
});