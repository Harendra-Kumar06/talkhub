import { upsertStreamUser } from "../lib/stream.js";
import { sendOtpEmail, generateOTP } from "../lib/mailer.js";
import User from "../models/User.js";
import Otp from "../models/Otp.js";
import jwt from "jsonwebtoken";
import bcrypt from "bcryptjs";

const OTP_EXPIRY_MINUTES = 5;
const MAX_OTP_ATTEMPTS = 5;

const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const signToken = (userId) =>
  jwt.sign({ userId }, process.env.JWT_SECRET_KEY, { expiresIn: "7d" });

const setAuthCookie = (res, token) => {
res.cookie("jwt", token, {
  httpOnly: true,
  secure: process.env.NODE_ENV === "production",
  sameSite: process.env.NODE_ENV === "production" ? "none" : "strict",
  maxAge: 7 * 24 * 60 * 60 * 1000,
});
};

// ==================== SIGNUP (send OTP) ====================
export async function signup(req, res) {
  try {
    const { email, password, fullName } = req.body;

    if (!email || !password || !fullName)
      return res.status(400).json({ message: "All fields are required" });
    if (password.length < 6)
      return res.status(400).json({ message: "Password must be at least 6 characters" });
    if (!emailRegex.test(email))
      return res.status(400).json({ message: "Invalid email format" });

    const emailLower = email.toLowerCase();

    const existingUser = await User.findOne({ email: emailLower });
    if (existingUser)
      return res.status(400).json({ message: "Email already exists" });

    // Hash password now so we don't store plaintext in pendingData
    const hashedPassword = await bcrypt.hash(password, 10);

    const otp = generateOTP();
    const expiresAt = new Date(Date.now() + OTP_EXPIRY_MINUTES * 60 * 1000);

    // Remove any old OTPs for this email+purpose
    await Otp.deleteMany({ email: emailLower, purpose: "signup" });

    await Otp.create({
      email: emailLower,
      otp,
      purpose: "signup",
      pendingData: {
        fullName,
        email: emailLower,
        password: hashedPassword,
      },
      expiresAt,
    });

    await sendOtpEmail({ to: emailLower, otp, purpose: "signup" });

    res.status(200).json({
      success: true,
      message: "OTP sent to your email. Please verify to complete signup.",
      email: emailLower,
    });
  } catch (error) {
    console.error("signup error:", error);
    res.status(500).json({ message: "Failed to send OTP. Please try again." });
  }
}

// ==================== VERIFY SIGNUP OTP ====================
export async function verifySignupOtp(req, res) {
  try {
    const { email, otp } = req.body;
    if (!email || !otp)
      return res.status(400).json({ message: "Email and OTP required" });

    const emailLower = email.toLowerCase();
    const record = await Otp.findOne({ email: emailLower, purpose: "signup" });

    if (!record)
      return res.status(400).json({ message: "OTP expired or not found. Please sign up again." });

    if (record.attempts >= MAX_OTP_ATTEMPTS) {
      await Otp.deleteOne({ _id: record._id });
      return res.status(400).json({ message: "Too many attempts. Please sign up again." });
    }

    if (record.otp !== otp) {
      record.attempts += 1;
      await record.save();
      return res.status(400).json({ message: "Invalid OTP" });
    }

    // OTP correct — create user
    const { fullName, password } = record.pendingData;
    const idx = Math.floor(Math.random() * 100) + 1;
    const randomAvatar = `https://avatar.iran.liara.run/public/${idx}.png`;

    // Create user with pre-hashed password — bypass pre-save hook
    const newUser = new User({
      email: emailLower,
      fullName,
      password, // already hashed
      profilePic: randomAvatar,
    });
    // Mark password as not modified so pre('save') hook skips re-hashing
    newUser.$isNew = true;
    // Use insertOne-style save with a workaround: set skipHash flag via findOneAndUpdate
    // Simpler: just save with pre-hashed and trust — but hook will re-hash. So we save then update.
    await User.collection.insertOne({
      ...newUser.toObject(),
      password,
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    const createdUser = await User.findOne({ email: emailLower });

    // Delete OTP
    await Otp.deleteOne({ _id: record._id });

    // Upsert Stream user
    try {
      await upsertStreamUser({
        id: createdUser._id.toString(),
        name: createdUser.fullName,
        image: createdUser.profilePic || "",
      });
    } catch (e) {
      console.log("Stream upsert error:", e.message);
    }

    const token = signToken(createdUser._id);
    setAuthCookie(res, token);

    res.status(201).json({ success: true, user: createdUser });
  } catch (error) {
    console.error("verifySignupOtp error:", error);
    res.status(500).json({ message: "Internal Server Error" });
  }
}

// ==================== LOGIN (password) ====================
export async function login(req, res) {
  try {
    const { email, password } = req.body;
    if (!email || !password)
      return res.status(400).json({ message: "All fields are required" });

    const user = await User.findOne({ email: email.toLowerCase() });
    if (!user) return res.status(401).json({ message: "Invalid email or password" });

    const ok = await user.matchPassword(password);
    if (!ok) return res.status(401).json({ message: "Invalid email or password" });

    const token = signToken(user._id);
    setAuthCookie(res, token);

    res.status(200).json({ success: true, user });
  } catch (error) {
    console.error("login error:", error.message);
    res.status(500).json({ message: "Internal Server Error" });
  }
}

// ==================== LOGIN with OTP (request) ====================
export async function requestLoginOtp(req, res) {
  try {
    const { email } = req.body;
    if (!email || !emailRegex.test(email))
      return res.status(400).json({ message: "Valid email required" });

    const emailLower = email.toLowerCase();
    const user = await User.findOne({ email: emailLower });
    if (!user)
      return res.status(404).json({ message: "No account found with this email" });

    const otp = generateOTP();
    const expiresAt = new Date(Date.now() + OTP_EXPIRY_MINUTES * 60 * 1000);

    await Otp.deleteMany({ email: emailLower, purpose: "login" });
    await Otp.create({
      email: emailLower,
      otp,
      purpose: "login",
      expiresAt,
    });

    await sendOtpEmail({ to: emailLower, otp, purpose: "login" });

    res.status(200).json({
      success: true,
      message: "OTP sent to your email",
      email: emailLower,
    });
  } catch (error) {
    console.error("requestLoginOtp error:", error);
    res.status(500).json({ message: "Failed to send OTP" });
  }
}

// ==================== LOGIN with OTP (verify) ====================
export async function verifyLoginOtp(req, res) {
  try {
    const { email, otp } = req.body;
    if (!email || !otp)
      return res.status(400).json({ message: "Email and OTP required" });

    const emailLower = email.toLowerCase();
    const record = await Otp.findOne({ email: emailLower, purpose: "login" });

    if (!record)
      return res.status(400).json({ message: "OTP expired or not found" });

    if (record.attempts >= MAX_OTP_ATTEMPTS) {
      await Otp.deleteOne({ _id: record._id });
      return res.status(400).json({ message: "Too many attempts. Request a new OTP." });
    }

    if (record.otp !== otp) {
      record.attempts += 1;
      await record.save();
      return res.status(400).json({ message: "Invalid OTP" });
    }

    const user = await User.findOne({ email: emailLower });
    if (!user) return res.status(404).json({ message: "User not found" });

    await Otp.deleteOne({ _id: record._id });

    const token = signToken(user._id);
    setAuthCookie(res, token);

    res.status(200).json({ success: true, user });
  } catch (error) {
    console.error("verifyLoginOtp error:", error);
    res.status(500).json({ message: "Internal Server Error" });
  }
}

// ==================== FORGOT PASSWORD (request) ====================
export async function forgotPassword(req, res) {
  try {
    const { email } = req.body;
    if (!email || !emailRegex.test(email))
      return res.status(400).json({ message: "Valid email required" });

    const emailLower = email.toLowerCase();
    const user = await User.findOne({ email: emailLower });
    if (!user)
      return res.status(404).json({ message: "No account found with this email" });

    const otp = generateOTP();
    const expiresAt = new Date(Date.now() + OTP_EXPIRY_MINUTES * 60 * 1000);

    await Otp.deleteMany({ email: emailLower, purpose: "reset-password" });
    await Otp.create({
      email: emailLower,
      otp,
      purpose: "reset-password",
      expiresAt,
    });

    await sendOtpEmail({ to: emailLower, otp, purpose: "reset-password" });

    res.status(200).json({
      success: true,
      message: "Password reset OTP sent to your email",
      email: emailLower,
    });
  } catch (error) {
    console.error("forgotPassword error:", error);
    res.status(500).json({ message: "Failed to send OTP" });
  }
}

// ==================== RESET PASSWORD (verify OTP + new pass) ====================
export async function resetPassword(req, res) {
  try {
    const { email, otp, newPassword } = req.body;
    if (!email || !otp || !newPassword)
      return res.status(400).json({ message: "All fields required" });
    if (newPassword.length < 6)
      return res.status(400).json({ message: "Password must be at least 6 characters" });

    const emailLower = email.toLowerCase();
    const record = await Otp.findOne({ email: emailLower, purpose: "reset-password" });

    if (!record)
      return res.status(400).json({ message: "OTP expired or not found" });

    if (record.attempts >= MAX_OTP_ATTEMPTS) {
      await Otp.deleteOne({ _id: record._id });
      return res.status(400).json({ message: "Too many attempts. Request a new OTP." });
    }

    if (record.otp !== otp) {
      record.attempts += 1;
      await record.save();
      return res.status(400).json({ message: "Invalid OTP" });
    }

    const user = await User.findOne({ email: emailLower });
    if (!user) return res.status(404).json({ message: "User not found" });

    user.password = newPassword; // pre-save hook will hash
    await user.save();

    await Otp.deleteOne({ _id: record._id });

    const token = signToken(user._id);
    setAuthCookie(res, token);

    res.status(200).json({ success: true, user, message: "Password reset successful" });
  } catch (error) {
    console.error("resetPassword error:", error);
    res.status(500).json({ message: "Internal Server Error" });
  }
}

// ==================== LOGOUT ====================
export async function logout(req, res) {
  res.clearCookie("jwt");
  res.status(200).json({ success: true, message: "Logout successful" });
}

// ==================== ONBOARDING ====================
export async function onboard(req, res) {
  try {
    const userId = req.user._id;
    const { fullName, bio, country, location } = req.body;

    if (!fullName || !bio || !country || !location) {
      return res.status(400).json({
        message: "All fields are required",
        missingFields: [
          !fullName && "fullName",
          !bio && "bio",
          !country && "country",
          !location && "location",
        ].filter(Boolean),
      });
    }

    const updatedUser = await User.findByIdAndUpdate(
      userId,
      { ...req.body, isOnboarded: true },
      { new: true }
    );

    if (!updatedUser) return res.status(404).json({ message: "User not found" });

    try {
      await upsertStreamUser({
        id: updatedUser._id.toString(),
        name: updatedUser.fullName,
        image: updatedUser.profilePic || "",
      });
    } catch (e) {
      console.log("Stream update error:", e.message);
    }

    res.status(200).json({ success: true, user: updatedUser });
  } catch (error) {
    console.error("Onboarding error:", error);
    res.status(500).json({ message: "Internal Server Error" });
  }
}

// ==================== UPDATE PROFILE ====================
export async function updateProfile(req, res) {
  try {
    const userId = req.user._id;
    const { fullName, bio, country, location, profilePic } = req.body;

    if (!fullName || !country)
      return res.status(400).json({ message: "Full name and country are required" });

    const updatedUser = await User.findByIdAndUpdate(
      userId,
      { fullName, bio, country, location, profilePic },
      { new: true }
    ).select("-password");

    if (!updatedUser) return res.status(404).json({ message: "User not found" });

    try {
      await upsertStreamUser({
        id: updatedUser._id.toString(),
        name: updatedUser.fullName,
        image: updatedUser.profilePic || "",
      });
    } catch (e) {
      console.log("Stream update error:", e.message);
    }

    res.status(200).json({ success: true, user: updatedUser });
  } catch (error) {
    console.error("Update profile error:", error);
    res.status(500).json({ message: "Internal Server Error" });
  }
}

// ==================== UPDATE ONLINE STATUS ====================
export async function updateOnlineStatus(req, res) {
  try {
    const { isOnline } = req.body;
    const userId = req.user._id;
    const updateData = { isOnline: Boolean(isOnline) };
    if (!isOnline) updateData.lastSeen = new Date();

    const updatedUser = await User.findByIdAndUpdate(userId, updateData, {
      new: true,
    }).select("-password");

    res.status(200).json({ success: true, user: updatedUser });
  } catch (error) {
    console.error("Update online status error:", error);
    res.status(500).json({ message: "Internal Server Error" });
  }
}
