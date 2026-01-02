import { generateToken } from "../lib/utils.js";
import User from "../models/User.js";
import bcrypt from "bcryptjs";
import cloudinary from "../lib/cloudinary.js";

export const signup = async (req, res) => {
  const { fullname, email, password, bio } = req.body;

  try {
    if (!fullname || !email || !password || !bio) {
      return res.json({ success: false, message: "All fields are required" });
    }
    
    const normalizedEmail = email.toLowerCase().trim();
    
    const existingUser = await User.findOne({ email: normalizedEmail });
    if (existingUser) {
      return res.json({ success: false, message: "User already exists" });
    }
    
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);
    
    const newUser = await User.create({
      fullname,
      email: normalizedEmail,
      password: hashedPassword,
      bio,
    });
    
    const token = generateToken(newUser._id);
    res.json({
      success: true,
      userData: newUser,
      token,
      message: "User registered successfully",
    });
  } catch (error) {
    console.error(error.message);
    
    if (error.code === 11000) {
      return res.json({ 
        success: false, 
        message: "Email already exists" 
      });
    }
    
    return res.json({ success: false, message: error.message });
  }
};

export const login = async (req, res) => {
  try {
    const { email, password } = req.body;

    const normalizedEmail = email.toLowerCase().trim();

    const userData = await User.findOne({ email: normalizedEmail });
    if (!userData) {
      return res.json({
        success: false,
        message: "Invalid credentials",
      });
    }

    const isPasswordCorrect = await bcrypt.compare(password, userData.password);

    if (!isPasswordCorrect) {
      return res.json({
        success: false,
        message: "Invalid credentials",
      });
    }

    const token = generateToken(userData._id);

    res.json({
      success: true,
      user: userData,
      token,
      message: "Logged in successfully",
    });
  } catch (error) {
    console.error(error.message);
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

export const checkAuth = (req, res) => {
  res.json({ success: true, user: req.user });
};

export const updateProfile = async (req, res) => {
  try {
    const { profilepic, fullname, bio } = req.body;
    const userId = req.user._id;
    let updatedUser;

    if (!profilepic) {
      updatedUser = await User.findByIdAndUpdate(
        userId,
        { fullname, bio },
        { new: true }
      );
    } else {
      const upload = await cloudinary.uploader.upload(profilepic);
      updatedUser = await User.findByIdAndUpdate(
        userId,
        {
          profilepic: upload.secure_url,
          bio,
          fullname,
        },
        { new: true }
      );
    }
    res.json({ success: true, user: updatedUser });
  } catch (error) {
    console.error(error.message);
    res.json({ success: false, message: error.message });
  }
};