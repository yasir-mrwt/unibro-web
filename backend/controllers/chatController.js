const ChatMessage = require("../models/ChatMessage");
const User = require("../models/user");
const { sendServerError } = require("../utils/httpError");

// Get chat messages for a room with pagination
const getRoomMessages = async (req, res) => {
  try {
    const { department, semester } = req.params;
    const { limit = 50, before } = req.query;

    const roomId = `${department}_${semester}`;

    let query = {
      roomId,
      isDeleted: false,
    };

    if (before) {
      query.createdAt = { $lt: new Date(before) };
    }

    const messages = await ChatMessage.find(query)
      .select("-userEmail")
      .sort({ createdAt: -1 })
      .limit(parseInt(limit))
      .populate("userId", "fullName")
      .populate({ path: "replyTo", select: "-userEmail" });

    const sortedMessages = messages.reverse();

    res.status(200).json({
      success: true,
      count: messages.length,
      messages: sortedMessages,
      hasMore: messages.length === parseInt(limit),
    });
  } catch (error) {
    sendServerError(res, "Failed to fetch messages", error);
  }
};

// Send a new message
const sendMessage = async (req, res) => {
  try {
    const {
      department,
      semester,
      message,
      messageType,
      fileUrl,
      fileName,
      replyTo,
    } = req.body;

    if (!req.user.isVerified) {
      return res.status(403).json({
        success: false,
        message: "Verify your email before sending messages",
      });
    }

    const roomId = `${department}_${semester}`;

    const newMessage = await ChatMessage.create({
      roomId,
      department,
      semester,
      message,
      messageType: messageType || "text",
      fileUrl,
      fileName,
      replyTo,
      userId: req.user._id,
      userName: req.user.fullName,
    });

    await newMessage.populate("userId", "fullName");
    if (replyTo) {
      await newMessage.populate({ path: "replyTo", select: "-userEmail" });
    }

    const safeMessage = newMessage.toObject();
    delete safeMessage.userEmail;

    res.status(201).json({
      success: true,
      message: safeMessage,
    });
  } catch (error) {
    sendServerError(res, "Failed to send message", error);
  }
};

// Delete a message (soft delete)
const deleteMessage = async (req, res) => {
  try {
    const { messageId } = req.params;

    const message = await ChatMessage.findById(messageId);

    if (!message) {
      return res.status(404).json({
        success: false,
        message: "Message not found",
      });
    }

    if (message.userId.toString() !== req.user._id.toString()) {
      return res.status(403).json({
        success: false,
        message: "Not authorized to delete this message",
      });
    }

    message.isDeleted = true;
    message.deletedAt = Date.now();
    message.message = "This message was deleted";
    await message.save();

    res.status(200).json({
      success: true,
      message: "Message deleted successfully",
    });
  } catch (error) {
    sendServerError(res, "Failed to delete message", error);
  }
};

// Get unread message count for a room
const getUnreadCount = async (req, res) => {
  try {
    const { department, semester } = req.params;
    const roomId = `${department}_${semester}`;

    const count = await ChatMessage.countDocuments({
      roomId,
      isDeleted: false,
      userId: { $ne: req.user._id },
      createdAt: { $gt: req.user.lastChatVisit || new Date(0) },
    });

    res.status(200).json({
      success: true,
      unreadCount: count,
    });
  } catch (error) {
    sendServerError(res, "Failed to get unread count", error);
  }
};

// Mark messages as read
const markAsRead = async (req, res) => {
  try {
    const { department, semester } = req.params;

    await User.findByIdAndUpdate(req.user._id, {
      lastChatVisit: Date.now(),
    });

    res.status(200).json({
      success: true,
      message: "Marked as read",
    });
  } catch (error) {
    sendServerError(res, "Failed to mark as read", error);
  }
};

module.exports = {
  getRoomMessages,
  sendMessage,
  deleteMessage,
  getUnreadCount,
  markAsRead,
};
