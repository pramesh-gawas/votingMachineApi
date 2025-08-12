const express = require("express");
const router = express.Router();
const User = require("../models/user");
const { jwtAuthMiddleWare, generateToken } = require("../jwt");
const multer = require("multer");
const nodemailer = require("nodemailer");
const bcrypt = require("bcrypt");
require("dotenv").config();
const jwt = require("jsonwebtoken");
const { put } = require("@vercel/blob");

const checkAdminRole = async (userId) => {
  try {
    const user = await User.findById(userId);
    return user.role === "admin";
  } catch (error) {
    return false;
  }
};

const storage = multer.memoryStorage();

const upload = multer({ storage: storage });

router.post("/signup", upload.single("photo"), async (req, res) => {
  try {
    const {
      firstname,
      lastname,
      age,
      email,
      mobile,
      address,
      aadharCardNumber,
      password,
      role,
      isVoted,
    } = req.body;

    if (!req.file) {
      return res.status(400).json({ error: "No photo uploaded." });
    }

    const vercelBlobToken = process.env.BLOB_READ_WRITE_TOKEN;

    if (!vercelBlobToken) {
      return res
        .status(500)
        .json({ error: "Vercel Blob token is not configured." });
    }

    const blob = await put(req.file.originalname, req.file.buffer, {
      access: "public",
      token: vercelBlobToken,
    });

    const uploadPhoto = blob.url;

    const updateUserProfile = new User({
      firstname,
      lastname,
      age,
      email,
      mobile,
      address,
      aadharCardNumber,
      password,
      role,
      isVoted,
      photo: uploadPhoto,
    });

    if (role === "admin") {
      const existingAdmin = await User.findOne({ role: "admin" });
      if (existingAdmin) {
        console.log("An admin user already exists. Cannot create another.");
        return res.status(409).json({
          error: "An admin user already exists. Only one admin is allowed.",
        });
      }
    }
    const newUser = new User(updateUserProfile);
    const response = await newUser.save();
    console.log("data saved");

    const payload = {
      id: response.id,
    };
    console.log(JSON.stringify(payload));

    const token = generateToken(payload);
    console.log(token);

    res.status(200).json({
      response: response,
      token: token,
      message: "User Registered Successfully",
    });
  } catch (error) {
    console.log(error);
    if (error.name === "ValidationError") {
      const errors = Object.keys(error.errors).map(
        (key) => error.errors[key].message
      );
      return res.status(400).json({ message: "Validation failed", errors });
    } else if (error.code === 11000) {
      const field = Object.keys(error.keyValue)[0];
      const value = error.keyValue[field];

      let errorMessage = `The ${field} '${value}' already exists. Please use a different one.`;

      if (field === "aadharCardNumber") {
        errorMessage;
      } else if (field === "email") {
        errorMessage;
      }

      return res.status(409).json({
        error: `Duplicate Entry ${errorMessage}`,
        field: field,
      });
    } else {
      return res
        .status(500)
        .json({ error: "Internal Server Error", message: error.message });
    }
  }
});
//login route

router.post("/login", async (req, res) => {
  try {
    //extract aadharCardNumber and password from request body
    const { aadharCardNumber, password } = req.body;

    //find the aadharCardNumber
    const user = await User.findOne({ aadharCardNumber: aadharCardNumber });

    //if user does not exist or password does not match ,return error
    if (!user || !(await user.comparePassword(password))) {
      return res
        .status(401)
        .json({ error: "invalid aadharCardNumber or password" });
    }
    //generate token
    const payload = {
      id: user.id,
    };

    const token = generateToken(payload);
    const userRole = user.role;

    res.json({ token, userRole, message: "You have successfully logged in!" });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "internal server Error" });
  }
});

router.get("/profile", jwtAuthMiddleWare, async (req, res) => {
  try {
    const userData = req.user;
    const userId = userData.id;
    const user = await User.findById(userId);
    res.status(200).json({ user });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "internal server error" });
  }
});

router.put("/profile/password", jwtAuthMiddleWare, async (req, res) => {
  try {
    const userId = req.user.id;
    const { currentPassword, newPassword } = req.body;
    const user = await User.findById(userId);
    if (!(await user.comparePassword(currentPassword))) {
      return res.status(401).json({ error: "invalid password " });
    }

    user.password = newPassword;
    await user.save();

    console.log("password updated");

    res.status(200).json({ message: "password updated" });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "internal server error" });
  }
});

router.put(
  "/:userID",
  upload.single("photo"),
  jwtAuthMiddleWare,
  async (req, res) => {
    try {
      const userID = req.params.userID;
      if (!(await checkAdminRole(req.user.id))) {
        return res
          .status(403)
          .json({ message: "user does not has admin role" });
      }

      const {
        firstname,
        lastname,
        age,
        email,
        mobile,
        address,
        aadharCardNumber,
        password,
        role,
        isVoted,
        photo,
      } = req.body;

      const vercelBlobToken = process.env.BLOB_READ_WRITE_TOKEN;

      if (!vercelBlobToken) {
        return res
          .status(500)
          .json({ error: "Vercel Blob token is not configured." });
      }

      const blob = await put(req.file.originalname, req.file.buffer, {
        access: "public",
        token: vercelBlobToken,
      });

      const uploadPhoto = blob.url;

      const updateUserProfile = {
        firstname,
        lastname,
        age,
        email,
        mobile,
        address,
        aadharCardNumber,
        password,
        role,
        isVoted,
        photo: uploadPhoto,
      };

      console.log(updateUserProfile);

      const response = await User.findByIdAndUpdate(userID, updateUserProfile, {
        new: true, //return the updated document
        runValidators: true, // run mongoose validation
      });
      console.log(response);
      if (!response) {
        return res.status(404).json({ error: "User not found" });
      }
      console.log("User data updated");
      res.status(200).json({ response, message: "User data updated" });
    } catch (error) {
      console.log(error);
      res.status(500).json({ error: "Internal Server Error" });
    }
  }
);

//admin control user add
router.post("/", upload.single("photo"), async (req, res) => {
  try {
    const {
      firstname,
      lastname,
      age,
      email,
      mobile,
      address,
      aadharCardNumber,
      password,
      role,
      isVoted,
    } = req.body;
    if (!req.file) {
      return res.status(400).json({ error: "No photo uploaded." });
    }

    const vercelBlobToken = process.env.BLOB_READ_WRITE_TOKEN;

    if (!vercelBlobToken) {
      return res
        .status(500)
        .json({ error: "Vercel Blob token is not configured." });
    }

    const blob = await put(req.file.originalname, req.file.buffer, {
      access: "public",
      token: vercelBlobToken,
    });

    const uploadPhoto = blob.url;

    const updateUserProfile = new User({
      firstname,
      lastname,
      age,
      email,
      mobile,
      address,
      aadharCardNumber,
      password,
      role,
      isVoted,
      photo: uploadPhoto,
    });

    if (role === "admin") {
      const existingAdmin = await User.findOne({ role: "admin" });
      if (existingAdmin) {
        console.log("An admin user already exists. Cannot create another.");
        return res.status(409).json({
          error: "An admin user already exists. Only one admin is allowed.",
        });
      }
    }
    const response = await updateUserProfile.save();
    console.log("data saved");

    const payload = {
      id: response.id,
    };
    console.log(JSON.stringify(payload));
    const token = generateToken(payload);

    res.status(200).json({
      response: response,
      message: "User added Successfully",
      token,
    });
  } catch (error) {
    console.log(error);
    res.status(500).json({ error: "internal server error" });
  }
});

router.get("/userList", async (req, res) => {
  try {
    const userdata = await User.find();
    return res
      .status(200)
      .json({ userdata, message: "User fetched sucessfully" });
  } catch (error) {
    console.log(error);
    res.status(500).json({ error: "Internal Server Error" });
  }
});

router.delete("/:userId", jwtAuthMiddleWare, async (req, res) => {
  try {
    const userId = req.params.userId;

    const response = await User.findByIdAndDelete(userId);

    if (!response) {
      return res.status(404).json({ error: "user not found" });
    }

    console.log("user deleted");
    res.status(200).json({ response, message: "user deleted Successfully" });
  } catch (error) {
    console.log(error);
    res.status(500).json({ error: "Internal Server Error" });
  }
});

router.post("/forgotpassword", upload.none(), async (req, res) => {
  try {
    const { email } = req.body;
    const response = await User.findOne({ email });

    if (!response) {
      return res.status(404).json({ error: "user not found" });
    }

    const userID = response.id;
    const payload = {
      id: userID,
    };

    const token = generateToken(payload);

    // Create a test account or replace with real credentials.
    const transporter = nodemailer.createTransport({
      service: "gmail",
      auth: {
        user: process.env.RESETEMAIL, // env
        pass: process.env.RESETPASSWORD, //env
      },
    });

    mailOptions = {
      from: process.env.RESETEMAIL, //env
      to: email,
      subject: "Reset your password ",
      html: `
    <div style="font-family: 'Inter', sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #ddd; border-radius: 10px;">
        <h2 style="color: #3b82f6; text-align: center; margin-bottom: 20px;">Password Reset Request</h2>
        <p>Hello,</p>
        <p>You have requested to reset your password for your account. Please click on the button below to proceed:</p>
        <p style="text-align: center; margin: 30px 0;">
            <a href=${process.env.APIURL}/user/reset-password/${userID}/${token}
               style="background-color: #3b82f6; color: #ffffff; padding: 12px 25px; border-radius: 8px; text-decoration: none; font-weight: bold; display: inline-block;">
                Reset My Password
            </a>
        </p>
        <p>This link is valid for <strong>10 minutes</strong>. For security reasons, if you do not reset your password within this time, you will need to request a new link.</p>
        <p>If you did not request a password reset, please ignore this email. Your password will remain unchanged.</p>
        <p style="margin-top: 30px; font-size: 0.9em; color: #777;">
            Thank you,<br>
            Your Application Team
        </p>
        <hr style="border: none; border-top: 1px solid #eee; margin-top: 20px;">
        <p style="font-size: 0.8em; color: #999; text-align: center;">
            This is an automated email, please do not reply.
        </p>
    </div>
  `,
    };

    transporter.sendMail(mailOptions, function (error, info) {
      if (error) {
        console.error(error);
      } else {
        return res.send({
          message: "check email to reset the password",
          token,
        });
      }
    });
  } catch (error) {
    console.log(error);
    res.status(500).json({ error: "Internal Server Error" });
  }
});

router.put(
  "/reset-password/:userID/:token",
  upload.none(),
  async (req, res) => {
    try {
      const { userID, token } = req.params;

      const { password } = req.body;

      if (!password || typeof password !== "string" || password.length < 6) {
        return res.status(400).json({
          message: "New password must be at least 6 characters long.",
        });
      }

      let decoded;
      try {
        decoded = jwt.verify(token, process.env.SECREATE_KEY);
        req.user = decoded;
      } catch (error) {
        return res.status(401).json({ error: "invalid token" });
      }

      const salt = await bcrypt.genSalt(10);
      const hashedPassword = await bcrypt.hash(password, salt);

      const updatedUser = await User.findByIdAndUpdate(
        { _id: userID },
        { password: hashedPassword },
        {
          new: true,
          runValidators: true,
        }
      );
      res
        .status(200)
        .json({ message: "password updated", user: updatedUser.email });
    } catch (error) {
      console.log(error);
      return res.status(500).json({ error: "Internal Server Error" });
    }
  }
);

module.exports = router;
