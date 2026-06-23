const express = require('express');
const mongoose = require('mongoose');
const ConnectionRequest = require('../models/connectionRequest');
const Chat = require('../models/chat');
const User = require('../models/user');
const Message = require('../models/message');
const {userAuth} = require('../middleware/auth');

const chatRouter = express.Router();

chatRouter.post("/chat/start/:userId",userAuth,async(req,res)=>{
  try {
    const requesterId = req.user._id;
    const userId = req.params.userId;

    if(!mongoose.Types.ObjectId.isValid(userId)){
      return res.status(400).json({message:"Invalid user"});
    }

    if (requesterId.toString() === userId.toString()) {
      return res.status(400).json({
        message: "You cannot start a chat with yourself"
      });
    }

    const user = await User.findById(userId);
    if(!user){
      return res.status(404).json({message:"User not found"});
    }


    const connected = await ConnectionRequest.findOne({
      $or:[
        {fromUserId:requesterId,toUserId:userId},
        {fromUserId:userId,toUserId:requesterId}
      ],
      status:"Accepted"
    })

    if(!connected){
      return res.status(400).json({message:"User should be in your connection to initiate the chat"})
    }

    const existingChat = await Chat.findOne({
      participants:{
        $all:[requesterId,userId]
      }
    })

    if(existingChat){
      return res.json({message:"Chat already exists",data:existingChat});
    }

    const chat = await Chat.create({
      participants:[requesterId,userId]
    })

    res.json({message:"Chat created successfully",data:chat});
  } catch (err) {
    res.status(400).json("ERROR: "+err.message);
  }
})

chatRouter.get("/chat/conversations", userAuth, async (req, res) => {
  try {
    const requesterId = req.user._id;

    const chats = await Chat.find({
      participants: requesterId,
    })
      .populate(
        "participants",
        "firstName lastName age gender photoUrl about skills"
      )
      .sort({ updatedAt: -1 });

    const data = await Promise.all(
      chats.map(async (chat) => {
        const otherUser = chat.participants.find(
          (p) => p._id.toString() !== requesterId.toString()
        );

        if (!otherUser) return null;

        const unreadCount = await Message.countDocuments({
          chatId: chat._id,
          senderId: { $ne: requesterId },
          seenBy: { $ne: requesterId },
        });

        return {
          chatId: chat._id,
          user: {
            _id: otherUser._id,
            firstName: otherUser.firstName,
            lastName: otherUser.lastName,
            photoUrl: otherUser.photoUrl,
            age: otherUser.age,
            gender: otherUser.gender,
            about: otherUser.about,
            skills: otherUser.skills,
          },
          lastMessage: chat.lastMessage || null,
          unreadCount,
          updatedAt: chat.updatedAt,
        };
      })
    );

    const filteredData = data.filter(Boolean);

    const totalUnreadChats = filteredData.filter(
      (chat) => chat.unreadCount > 0
    ).length;

    const totalUnreadMessages = filteredData.reduce(
      (sum, chat) => sum + chat.unreadCount,
      0
    );

    res.json({
      message: "Chats fetched successfully",
      totalUnreadChats,
      totalUnreadMessages,
      data: filteredData,
    });
  } catch (err) {
    res.status(400).json({
      message: "ERROR: " + err.message,
    });
  }
});

chatRouter.get("/chat/messages/:chatId", userAuth, async (req, res) => {
  try {
    const userId = req.user._id;
    const chatId = req.params.chatId;

    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;
    const skip = (page - 1) * limit;

    if (!mongoose.Types.ObjectId.isValid(chatId)) {
      return res.status(400).json({ message: "Invalid chat Id" });
    }

    const chat = await Chat.findOne({
      _id: chatId,
      participants: userId
    });

    if (!chat) {
      return res.status(400).json({ message: "Unauthorized access" });
    }

    const messages = await Message.find({ chatId })
      .populate("senderId", "firstName lastName photoUrl")
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit);

    const data = messages.reverse().map(msg => ({
      id: msg._id,
      text: msg.text,
      createdAt: msg.createdAt,

      isMine: msg.senderId._id.toString() === userId.toString(),

      isSeen: msg.seenBy?.includes(userId),

      sender: msg.senderId
        ? {
            id: msg.senderId._id,
            name: `${msg.senderId.firstName} ${msg.senderId.lastName}`,
            photoUrl: msg.senderId.photoUrl
          }
        : null
    }));

    const totalMessages = await Message.countDocuments({ chatId });

    const hasMore = skip + messages.length < totalMessages;

    res.json({
      message: "Chat fetched successfully",
      data,
      pagination: {
        page,
        limit,
        hasMore,
        totalMessages
      }
    });

  } catch (err) {
    res.status(500).json({
      message: "ERROR: " + err.message
    });
  }
});

chatRouter.patch("/chat/messages/:chatId/seen",userAuth,async(req,res)=>{
  try {
    const userId = req.user._id;
    const chatId = req.params.chatId;

    if(!mongoose.Types.ObjectId.isValid(chatId)){
      return res.status(400).json({message:"Invalid chat id"});
    }

    const chat = await Chat.findOne({
      _id: chatId,
      participants: userId
    });

    if (!chat) {
      return res.status(400).json({ message: "Unauthorized access" });
    }

    await Message.updateMany(
      {
        chatId: chatId,
        senderId: { $ne: userId },
        seenBy: { $ne: userId }
      },
      {
        $addToSet: { seenBy: userId }
      }
    );

    res.json({
      message: "Messages marked as seen successfully"
    });
  } catch (err) {
    res.status(400).json({message:"ERROR: "+err.message});
  }
})

chatRouter.post("/chat/message", userAuth, async (req, res) => {
  try {
    const userId = req.user._id;
    const { chatId, text } = req.body;

    if (!mongoose.Types.ObjectId.isValid(chatId)) {
      return res.status(400).json({ message: "Invalid chat id" });
    }

    if (!text || text.trim().length === 0) {
      return res.status(400).json({ message: "Message cannot be empty" });
    }

    const chat = await Chat.findOne({
      _id: chatId,
      participants: userId
    });

    if (!chat) {
      return res.status(403).json({ message: "Unauthorized access" });
    }

    const message = await Message.create({
      chatId,
      senderId: userId,
      text,
      seenBy: [userId]
    });

    chat.lastMessage = text;
    chat.lastMessageSender = userId;
    chat.updatedAt = new Date();

    await chat.save();

    await message.populate("senderId", "firstName lastName photoUrl");

    const response = {
      id: message._id,
      text: message.text,
      createdAt: message.createdAt,
      isMine: true,
      isSeen: false,
      sender: {
        id: message.senderId._id,
        name: `${message.senderId.firstName} ${message.senderId.lastName}`,
        photoUrl: message.senderId.photoUrl
      }
    };

    res.json({
      message: "Message sent successfully",
      data: response
    });

  } catch (err) {
    res.status(500).json({
      message: "ERROR: " + err.message
    });
  }
});


module.exports = chatRouter;