import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import dotenv from "dotenv";
import UserModel from "../models/userModel.js";

dotenv.config();

export const register = async (req, res) => {
  try {
    console.log("Register request received");
    console.log("Request body:", req.body);

    // Check if body is empty
    if (!req.body || Object.keys(req.body).length === 0) {
      console.log("Empty request body");
      return res.status(400).json({
        success: false,
        error:
          "Request body is empty. Make sure to send JSON with Content-Type: application/json",
      });
    }

    const { name, email, password, phone } = req.body;

    if (!name || !email || !password) {
      console.log("Missing required fields");
      return res.status(400).json({
        success: false,
        error: "Name, email and password are required",
      });
    }

    console.log("Checking if user exists...");
    const exists = await UserModel.exists(email);
    if (exists) {
      return res.status(409).json({
        success: false,
        error: "User already exists",
      });
    }

    console.log("Hashing password...");
    const saltRounds = parseInt(process.env.BCRYPT_SALT_ROUNDS) || 10;
    const hashedPassword = await bcrypt.hash(password, saltRounds);

    console.log("Creating user...");
    const userId = await UserModel.create({
      name,
      email,
      password_hash: hashedPassword,
      phone,
    });

    console.log("Getting user...");
    const user = await UserModel.findById(userId);

    console.log("Generating token...");
    const token = jwt.sign(
      { id: user.id, email: user.email },
      process.env.JWT_SECRET,
      { expiresIn: process.env.JWT_EXPIRES_IN || "7d" },
    );

    console.log("Registration successful!");
    res.status(201).json({
      success: true,
      user,
      token,
    });
  } catch (error) {
    console.error("Register error:", error);
    console.error("Error stack:", error.stack);
    res.status(500).json({
      success: false,
      error: error.message || "Registration failed",
    });
  }
};

export const login = async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({
        success: false,
        error: "Email and password are required",
      });
    }

    const user = await UserModel.findByEmail(email);
    if (!user) {
      return res.status(401).json({
        success: false,
        error: "Invalid email or password",
      });
    }

    const isMatch = await bcrypt.compare(password, user.password_hash);
    if (!isMatch) {
      return res.status(401).json({
        success: false,
        error: "Invalid email or password",
      });
    }

    delete user.password_hash;

    const token = jwt.sign(
      { id: user.id, email: user.email },
      process.env.JWT_SECRET,
      { expiresIn: process.env.JWT_EXPIRES_IN || "7d" },
    );

    res.json({
      success: true,
      user,
      token,
    });
  } catch (error) {
    console.error("Login error:", error);
    res.status(500).json({
      success: false,
      error: "Login failed",
    });
  }
};

export const getMe = async (req, res) => {
  try {
    const user = await UserModel.findById(req.user.id);
    if (!user) {
      return res.status(404).json({
        success: false,
        error: "User not found",
      });
    }
    res.json({
      success: true,
      user,
    });
  } catch (error) {
    console.error("Get profile error:", error);
    res.status(500).json({
      success: false,
      error: "Failed to get profile",
    });
  }
};

export const updateProfile = async (req, res) => {
  try {
    const { name, phone } = req.body;
    const userId = req.user.id;

    if (!name && !phone) {
      return res.status(400).json({
        success: false,
        error: "At least one field to update is required",
      });
    }

    const updated = await UserModel.update(userId, { name, phone });
    if (!updated) {
      return res.status(404).json({
        success: false,
        error: "User not found",
      });
    }

    const user = await UserModel.findById(userId);
    res.json({
      success: true,
      user,
    });
  } catch (error) {
    console.error("Update profile error:", error);
    res.status(500).json({
      success: false,
      error: "Failed to update profile",
    });
  }
};

export const changePassword = async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;
    const userId = req.user.id;

    if (!currentPassword || !newPassword) {
      return res.status(400).json({
        success: false,
        error: "Current and new password are required",
      });
    }

    if (newPassword.length < 6) {
      return res.status(400).json({
        success: false,
        error: "New password must be at least 6 characters",
      });
    }

    const user = await UserModel.findById(userId);
    if (!user) {
      return res.status(404).json({
        success: false,
        error: "User not found",
      });
    }

    const isMatch = await bcrypt.compare(currentPassword, user.password_hash);
    if (!isMatch) {
      return res.status(401).json({
        success: false,
        error: "Current password is incorrect",
      });
    }

    const saltRounds = parseInt(process.env.BCRYPT_SALT_ROUNDS) || 10;
    const hashedPassword = await bcrypt.hash(newPassword, saltRounds);

    const updated = await UserModel.updatePassword(userId, hashedPassword);
    if (!updated) {
      return res.status(500).json({
        success: false,
        error: "Failed to update password",
      });
    }

    res.json({
      success: true,
      message: "Password updated successfully",
    });
  } catch (error) {
    console.error("Change password error:", error);
    res.status(500).json({
      success: false,
      error: "Failed to change password",
    });
  }
};

export const deleteAccount = async (req, res) => {
  try {
    const userId = req.user.id;
    const deleted = await UserModel.delete(userId);
    if (!deleted) {
      return res.status(404).json({
        success: false,
        error: "User not found",
      });
    }
    res.json({
      success: true,
      message: "Account deleted successfully",
    });
  } catch (error) {
    console.error("Delete account error:", error);
    res.status(500).json({
      success: false,
      error: "Failed to delete account",
    });
  }
};
