try {
  require('dotenv').config();
} catch (err) {
  console.warn('dotenv not found; falling back to environment variables. Install with: npm install dotenv');
}

const express = require("express");
const {validateSignup} = require('./utils/validation');
const cookieParser = require('cookie-parser')
const jwt = require('jsonwebtoken');
const bcrypt = require('bcrypt');
const {userAuth}= require("./middleware/auth")
const connectDB = require("./config/database");
const User = require("./models/user");
const cors = require('cors')

const app = express();
const PORT = process.env.PORT;
const SECRET_KEY = process.env.SECRET_KEY;

app.use(cors({
  origin:"http://localhost:5173",
  credentials:true
}))
app.use(express.json());
app.use(cookieParser());
const authRouter = require("./routes/auth")
const profileRouter = require("./routes/profile")
const requestRouter = require("./routes/request");
const userRouter = require("./routes/user");
const projectRouter = require('./routes/project');
const groupRouter = require('./routes/group');
const chatRouter = require('./routes/chat')


app.use("/",authRouter);
app.use("/",profileRouter);
app.use("/",requestRouter);
app.use("/",userRouter);
app.use("/",projectRouter);
app.use("/",groupRouter);
app.use("/",chatRouter);

connectDB()
  .then(() => {
    console.log("Database connected successfully");
    app.listen(PORT, () => {
      console.log(`app is successfully listening on port ${PORT}`);
    });
  })
  .catch((err) => {
    console.error("Database can not be connected", err);
  });
