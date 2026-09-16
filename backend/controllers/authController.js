const User = require("../models/user");
const crypto = require("crypto");
const generateToken = require("../utils/generateToken");
const jwt = require("jsonwebtoken");
const { sendEmail } = require("../config/email");
const {
  welcomeEmail,
  verificationEmail,
  loginNotification,
  passwordResetEmail,
  passwordResetSuccessEmail,
  accountLockedEmail,
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

// Simple token generator for Google OAuth (no HTTP-only cookies)
const generateSimpleToken = (userId) => {
  return jwt.sign({ id: userId }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRE,
  });
};

// Register new user
const register = async (req, res) => {
  try {
    const { fullName, email, password } = req.body;

    const userExists = await User.findOne({ email });

    if (userExists) {
      return res.status(400).json({
        success: false,
        message: "User already exists with this email",
      });
    }

    const user = await User.create({
      fullName,
      email,
      password,
      authProvider: "local",
    });

    const verificationToken = user.generateVerificationToken();
    await user.save();

    const verificationUrl = `${process.env.FRONTEND_URL}/verify-email/${verificationToken}`;

    const emailSent = await sendEmailSafely({
      email: user.email,
      subject: "Verify Your Email - Unibro",
      html: verificationEmail(user.fullName, verificationUrl),
    });

    const token = generateToken(res, user._id);

    res.status(201).json({
      success: true,
      message: emailSent
        ? "Registration successful! Please check your email to verify your account."
        : "Registration successful, but the verification email could not be delivered. Use resend verification after signing in.",
      emailSent,
      token,
      user: {
        _id: user._id,
        fullName: user.fullName,
        email: user.email,
        role: user.role,
        isVerified: user.isVerified,
      },
    });
  } catch (error) {
    sendServerError(res, "Server error during registration", error);
  }
};

// Login user
const login = async (req, res) => {
  try {
    const { email, password } = req.body;

    const user = await User.findOne({ email }).select("+password");

    if (!user) {
      return res.status(401).json({
        success: false,
        message: "Invalid email or password",
      });
    }

    if (user.isLocked) {
      return res.status(401).json({
        success: false,
        message: "Invalid email or password",
      });
    }

    if (user.authProvider === "google" && !user.password) {
      return res.status(400).json({
        success: false,
        message:
          "This account was created with Google. Please use Google Sign-In.",
      });
    }

    const isPasswordCorrect = await user.comparePassword(password);

    if (!isPasswordCorrect) {
      await user.incLoginAttempts();

      const updatedUser = await User.findById(user._id);
      if (updatedUser.isLocked) {
        const unlockTime = new Date(updatedUser.lockUntil).toLocaleString();

        await sendEmailSafely({
          email: user.email,
          subject: "Account Locked - Unibro",
          html: accountLockedEmail(user.fullName, unlockTime),
        });

        return res.status(401).json({
          success: false,
          message: "Invalid email or password",
        });
      }

      return res.status(401).json({
        success: false,
        message: "Invalid email or password",
      });
    }

    if (user.loginAttempts > 0 || user.lockUntil) {
      await user.resetLoginAttempts();
    }

    user.lastLogin = Date.now();
    await user.save();

    const token = generateToken(res, user._id);

    const loginTime = new Date().toLocaleString();
    const ipAddress = req.ip || req.connection.remoteAddress;

    const notificationSent = await sendEmailSafely({
      email: user.email,
      subject: "New Login to Your Account - Unibro",
      html: loginNotification(user.fullName, loginTime, ipAddress),
    });

    res.status(200).json({
      success: true,
      message: "Login successful!",
      notificationSent,
      token,
      user: {
        _id: user._id,
        fullName: user.fullName,
        email: user.email,
        role: user.role,
        isVerified: user.isVerified,
        avatar: user.avatar,
      },
    });
  } catch (error) {
    sendServerError(res, "Server error during login", error);
  }
};

// Logout user
const logout = async (req, res) => {
  try {
    res.status(200).json({
      success: true,
      message: "Logged out successfully",
    });
  } catch (error) {
    sendServerError(res, "Server error during logout", error);
  }
};

// Verify email
const verifyEmail = async (req, res) => {
  try {
    const { token } = req.params;

    const user = await User.findOne({
      verificationToken: token,
      verificationTokenExpire: { $gt: Date.now() },
    });

    if (!user) {
      return res.status(400).json({
        success: false,
        message: "Invalid or expired verification token",
        expired: true,
      });
    }

    user.isVerified = true;
    user.verificationToken = undefined;
    user.verificationTokenExpire = undefined;
    user.verificationResendCount = 0;
    user.lastVerificationResend = undefined;
    await user.save();

    await sendEmailSafely({
      email: user.email,
      subject: "Welcome to Unibro! 🎉",
      html: welcomeEmail(user.fullName),
    });

    return res.status(200).json({
      success: true,
      message: "Email verified successfully!",
    });
  } catch (error) {
    return sendServerError(res, "Server error during verification", error);
  }
};

// Resend verification email
const resendVerification = async (req, res) => {
  try {
    const user = await User.findById(req.user._id);

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    if (user.isVerified) {
      return res.status(400).json({
        success: false,
        message: "Email is already verified",
      });
    }

    const now = Date.now();
    const oneDayAgo = now - 24 * 60 * 60 * 1000;

    if (
      !user.lastVerificationResend ||
      user.lastVerificationResend < oneDayAgo
    ) {
      user.verificationResendCount = 0;
    }

    if (user.verificationResendCount >= 5) {
      const timeUntilReset = new Date(
        user.lastVerificationResend.getTime() + 24 * 60 * 60 * 1000
      );
      return res.status(429).json({
        success: false,
        message: `Maximum verification email requests reached. Try again after ${timeUntilReset.toLocaleString()}`,
        retryAfter: timeUntilReset,
      });
    }

    if (user.lastVerificationResend) {
      const timeSinceLastResend = now - user.lastVerificationResend.getTime();
      const twoMinutes = 2 * 60 * 1000;

      if (timeSinceLastResend < twoMinutes) {
        const waitTime = Math.ceil((twoMinutes - timeSinceLastResend) / 1000);
        return res.status(429).json({
          success: false,
          message: `Please wait ${waitTime} seconds before requesting another verification email`,
          waitTime,
        });
      }
    }

    const verificationToken = user.generateVerificationToken();

    user.verificationResendCount = (user.verificationResendCount || 0) + 1;
    user.lastVerificationResend = now;

    await user.save();

    const verificationUrl = `${process.env.FRONTEND_URL}/verify-email/${verificationToken}`;

    const emailSent = await sendEmailSafely({
      email: user.email,
      subject: "Verify Your Email - Unibro",
      html: verificationEmail(user.fullName, verificationUrl),
    });

    if (!emailSent) {
      return res.status(503).json({
        success: false,
        message: "Verification email service is temporarily unavailable",
      });
    }

    res.status(200).json({
      success: true,
      message: "Verification email sent! Please check your inbox.",
      remainingAttempts: 5 - user.verificationResendCount,
    });
  } catch (error) {
    sendServerError(res, "Error sending verification email", error);
  }
};

// Forgot password
const forgotPassword = async (req, res) => {
  try {
    const { email } = req.body;

    const user = await User.findOne({ email });

    const genericMessage =
      "If an eligible account exists, password reset instructions will be sent.";

    if (!user) {
      return res.status(202).json({ success: true, message: genericMessage });
    }

    if (user.authProvider === "google" && !user.password) {
      return res.status(202).json({ success: true, message: genericMessage });
    }

    const resetToken = user.generatePasswordResetToken();
    await user.save();

    const resetUrl = `${process.env.FRONTEND_URL}/reset-password/${resetToken}`;

    const emailSent = await sendEmailSafely({
      email: user.email,
      subject: "Password Reset Request - Unibro",
      html: passwordResetEmail(user.fullName, resetUrl),
    });

    if (!emailSent) {
      return res.status(503).json({
        success: false,
        message: "Password reset email service is temporarily unavailable",
      });
    }

    res.status(202).json({ success: true, message: genericMessage });
  } catch (error) {
    sendServerError(res, "Error sending password reset email", error);
  }
};

// Reset password
const resetPassword = async (req, res) => {
  try {
    const { password } = req.body;

    const resetPasswordToken = crypto
      .createHash("sha256")
      .update(req.params.token)
      .digest("hex");

    const user = await User.findOne({
      resetPasswordToken,
      resetPasswordExpire: { $gt: Date.now() },
    });

    if (!user) {
      return res.status(400).json({
        success: false,
        message: "Invalid or expired reset token",
      });
    }

    user.password = password;
    user.resetPasswordToken = undefined;
    user.resetPasswordExpire = undefined;
    user.loginAttempts = 0;
    user.lockUntil = undefined;

    await user.save();

    const notificationSent = await sendEmailSafely({
      email: user.email,
      subject: "Password Changed Successfully - Unibro",
      html: passwordResetSuccessEmail(user.fullName),
    });

    res.status(200).json({
      success: true,
      message:
        "Password reset successful! You can now login with your new password.",
      notificationSent,
    });
  } catch (error) {
    sendServerError(res, "Error resetting password", error);
  }
};

// Get current logged in user
const getMe = async (req, res) => {
  try {
    const user = req.user;

    res.status(200).json({
      success: true,
      user: {
        _id: user._id,
        fullName: user.fullName,
        email: user.email,
        role: user.role,
        isVerified: user.isVerified,
        avatar: user.avatar,
        authProvider: user.authProvider,
        createdAt: user.createdAt,
      },
    });
  } catch (error) {
    sendServerError(res, "Server error", error);
  }
};

// Google OAuth callback
const googleCallback = async (req, res) => {
  try {
    if (!req.user) {
      return res.redirect(`${process.env.FRONTEND_URL}/auth/error`);
    }

    const token = generateSimpleToken(req.user._id);

    const isNewUser =
      !req.user.lastLogin ||
      Date.now() - new Date(req.user.createdAt).getTime() < 60000;
    req.user.lastLogin = Date.now();

    await req.user.save();

    if (isNewUser) {
      await sendEmailSafely({
        email: req.user.email,
        subject: "Welcome to Unibro! 🎉",
        html: welcomeEmail(req.user.fullName),
      });
    } else {
      const loginTime = new Date().toLocaleString();
      const ipAddress = req.ip || req.connection?.remoteAddress || "Unknown";

      await sendEmailSafely({
        email: req.user.email,
        subject: "New Login to Your Account - Unibro",
        html: loginNotification(req.user.fullName, loginTime, ipAddress),
      });
    }

    const redirectUrl = `${process.env.FRONTEND_URL}/auth/success#token=${encodeURIComponent(
      token
    )}`;
    res.redirect(redirectUrl);
  } catch (error) {
    res.redirect(`${process.env.FRONTEND_URL}/auth/error`);
  }
};

module.exports = {
  register,
  login,
  logout,
  verifyEmail,
  resendVerification,
  getMe,
  googleCallback,
  forgotPassword,
  resetPassword,
};
