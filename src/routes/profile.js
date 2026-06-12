const express = require("express");
const {userAuth} = require("../middleware/auth")
const User = require("../models/user");
const { validateEditProfileData } = require("../utils/validation");
const bcrypt = require("bcrypt")
const validator = require("validator");


const profileRouter = express.Router();


profileRouter.get("/profile/view",userAuth,async (req,res)=>{
  try {
    const user = req.user;
    res.send(user);
  } catch (err) {
    res.status(500).send("Error: "+err.message);
  }
})

profileRouter.patch("/profile/update",userAuth,async (req,res)=>{
  try {
    if(!validateEditProfileData(req)){
      throw new Error("Invalid edit request");
    }

    const loggedInUser = req.user;

    Object.keys(req.body).forEach(key=>loggedInUser[key]=req.body[key]);

    await loggedInUser.save();
    res.send(`${loggedInUser.firstName}, Your profile updated successfully`);
  } catch (err) {
    res.status(500).send("ERROR: "+err.message);
  }
})

profileRouter.patch("/profile/password",userAuth,async(req,res)=>{
  try {
    const {currentPassword,newPassword} = req.body;

    const loggedInUser = req.user;

    const isPasswordValid = await bcrypt.compare(currentPassword,loggedInUser.password);

    if(!isPasswordValid){
      throw new Error("Current password is incorrect");
    }

    const isNewPasswordValid = validator.isStrongPassword(newPassword);

    if(!isNewPasswordValid) {
      throw new Error("Please enter a strong password");
    }

    const hashedPassword = await bcrypt.hash(newPassword,10);

    loggedInUser.password = hashedPassword;

    await loggedInUser.save();

    res.send("Password updated successfully");

  } catch (err) {
    res.status(500).send("ERROR: "+err.message);
  }
})

// profileRouter.get("/user",async (req,res)=>{
//   const userEmail = req.body.emailId;

//   try {
//     const user = await User.findOne({emailId:userEmail});
//     if(!user === 0){
//       res.status(404).send("User not found");
//     }else{
//       res.send(user);
//     }
//   } catch (err) {
//     res.status(400).send("Something went wrong");
//   }
// })


// profileRouter.get("/feed",async (req,res)=>{
//   try {
//     const users = await User.find({});
//     if(users.length === 0){
//       res.status(404).send("Empty feed");
//     }else{
//       res.send(users);
//     }
//   } catch (err) {
//     res.status(500).send("Something went wrong..!");
//   }
// })

// profileRouter.delete("/user",async (req,res)=>{
//   const userId = req.body.userId;
//   try {
//     const user = await User.findByIdAndDelete(userId);
//     res.send("User Deleted successfully");
//   } catch (err) {
//     res.status(500).send("Something went wrong..!");
//   }
// })


// profileRouter.patch("/user/:userId",async (req,res)=>{
//   const userId = req.params?.userId;
//   const data = req.body;

  
//   try{
//     const ALLOWED_UPDATES =["photoUrl","about","gender","age","skills"];

//     const isUpdateAllowed = Object.keys(data).every((k)=> ALLOWED_UPDATES.includes(k));

//     if(!isUpdateAllowed){
//       throw new Error("Update not allowed");
//     }

//     if(data?.skills.length>10){
//       throw new Error("You can have atmost 10 skills");
//     }
//     const updatedUser = await User.findByIdAndUpdate({_id:userId},data,{
//       runValidators:true,
//     });
//     res.send("User updated successfully");
//   }catch (err) {
//     res.status(500).send("Something went wrong..!");
//   }
// })

module.exports = profileRouter;