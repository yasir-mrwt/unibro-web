const User = require("../models/user");
const { sendEmail } = require("../config/email");
const {
  passwordResetSuccessEmail,
  verificationEmail,
} = require("../utils/emailTemplates");
const { sendServerError } = require("../utils/httpError");

const sendEmailSafely = async (options) => {
  try {
    await sendEmail(options);
    return true;
  } catch (error) {
    if (process.env.NODE_ENV === "development") {
      console.error(`Email delivery failed: ${error.message}`);
    }
    return false;
  }
};

// Get all users (admin only)
const getAllUsers = async (req, res) => {
  try {
    const users = await User.find().select(
      "_id fullName email avatar role isVerified authProvider lastLogin createdAt updatedAt"
    );

    res.status(200).json({
      success: true,
      count: users.length,
      users,
    });
  } catch (error) {
    sendServerError(res, "Server error", error);
  }
};

// Update user profile
const updateProfile = async (req, res) => {
  try {
    const { fullName, email } = req.body;

    const user = await User.findById(req.user._id);

    if (user) {
      user.fullName = fullName || user.fullName;

      let emailChanged = false;
      if (email && email !== user.email) {
        const emailExists = await User.findOne({ email });
        if (emailExists) {
          return res.status(400).json({
            success: false,
            message: "Email already in use",
          });
        }
        user.email = email;
        user.isVerified = false;
        user.generateVerificationToken();
        emailChanged = true;
      }

      const updatedUser = await user.save();
      let verificationEmailSent = null;
      if (emailChanged) {
        const verificationUrl = `${process.env.FRONTEND_URL}/verify-email/${updatedUser.verificationToken}`;
        verificationEmailSent = await sendEmailSafely({
          email: updatedUser.email,
          subject: "Verify Your Email - Unibro",
          html: verificationEmail(updatedUser.fullName, verificationUrl),
        });
      }

      res.status(200).json({
        success: true,
        message:
          emailChanged && !verificationEmailSent
            ? "Profile updated, but the verification email could not be delivered. Use resend verification."
            : "Profile updated successfully",
        verificationEmailSent,
        user: {
          id: updatedUser._id,
          fullName: updatedUser.fullName,
          email: updatedUser.email,
          role: updatedUser.role,
          isVerified: updatedUser.isVerified,
          avatar: updatedUser.avatar,
        },
      });
    } else {
      res.status(404).json({
        success: false,
        message: "User not found",
      });
    }
  } catch (error) {
    sendServerError(res, "Server error", error);
  }
};

// Change password from profile settings
const changePassword = async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;

    const user = await User.findById(req.user._id).select("+password");

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    if (user.authProvider === "google" && !user.password) {
      return res.status(400).json({
        success: false,
        message: "Cannot change password for Google OAuth accounts",
      });
    }

    const isPasswordCorrect = await user.comparePassword(currentPassword);

    if (!isPasswordCorrect) {
      return res.status(401).json({
        success: false,
        message: "Current password is incorrect",
      });
    }

    user.password = newPassword;
    await user.save();

    const notificationSent = await sendEmailSafely({
      email: user.email,
      subject: "Password Changed Successfully - Unibro",
      html: passwordResetSuccessEmail(user.fullName),
    });

    res.status(200).json({
      success: true,
      message: "Password changed successfully",
      notificationSent,
    });
  } catch (error) {
    sendServerError(res, "Server error while changing password", error);
  }
};

module.exports = {
  getAllUsers,
  updateProfile,
  changePassword,
};
