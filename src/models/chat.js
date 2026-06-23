const mongoose = require('mongoose');
const { validate } = require('./user');

const ChatSchema = new mongoose.Schema({
  participants:{
    type:[{
      type:mongoose.Schema.Types.ObjectId,
      ref:"User",
      required:true,
    }],
    validate:{
      validator:function(arr){
        return arr.length === 2;
      },
      message:"Chat must have exactly two participants",
    }
  },
  lastMessage:{
    type:String,
    default:""
  },
  lastMessageSender:{
    type:mongoose.Schema.Types.ObjectId,
    ref:"User"
  }
},{
  timestamps:true,
})

ChatSchema.index({
  participants:1
});

const ChatModel = mongoose.model("Chat",ChatSchema);

module.exports = ChatModel;