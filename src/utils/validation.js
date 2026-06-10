const validator = require('validator');
const validateSignup = (req)=>{
  const {firstName,lastName,emailId,password} = req.body;

  if(
  !firstName?.trim() || !lastName?.trim() || !emailId?.trim() || !password?.trim()) {
  throw new Error("All fields are required");
  }else if(!validator.isEmail(emailId)){
    throw new Error("Enter valid email address");
  }else if(!validator.isStrongPassword(password)){
    throw new Error("Please enter a strong password");
  }
}

module.exports = {
  validateSignup,
}