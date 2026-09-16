const express = require("express");
const router = express.Router();
const { protect } = require("../middleware/authMiddleware");
const {
  getRoomMessages,
  sendMessage,
  deleteMessage,
  getUnreadCount,
  markAsRead,
} = require("../controllers/chatController");
const {
  chatMessageValidation,
  chatRoomValidation,
  mongoIdValidation,
  validate,
} = require("../middleware/validation");

// All routes require authentication
router.use(protect);

// Get messages for a specific room (department + semester)
router.get(
  "/messages/:department/:semester",
  chatRoomValidation,
  validate,
  getRoomMessages
);

// Send a new message
router.post("/messages", chatMessageValidation, validate, sendMessage);

// Delete a message
router.delete(
  "/messages/:messageId",
  mongoIdValidation("messageId"),
  validate,
  deleteMessage
);

// Get unread message count
router.get(
  "/unread/:department/:semester",
  chatRoomValidation,
  validate,
  getUnreadCount
);

// Mark messages as read
router.put(
  "/read/:department/:semester",
  chatRoomValidation,
  validate,
  markAsRead
);

module.exports = router;
