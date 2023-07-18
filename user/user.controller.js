require("dotenv").config();
const bcrypt = require("bcrypt");
const axios = require("axios");
const XmlToJson = require("xml-js");
const UserModel = require("./user.model");
const jwt = require("../helpers/jwt");
const { sendClientEmail } = require("../helpers/nodemailer");

exports.Register = async (req, res) => {
  try {
    const {
      firstName,
      lastName,
      password,
      phoneNumber,
      email,
      state,
      birthday,
      gender,
    } = req.body;
    const user = await UserModel.findOne({ email: email });
    if (user) {
      return res
        .status(400)
        .json({ message: "User already exists", status: "fail" });
    }
    let verificationKey = Math.floor(Math.random() * 1000000);
    // phoneNumber = parseInt(phoneNumber)

    const newUser = new UserModel({
      firstName,
      lastName,
      phoneNumber,
      email,
      state,
      birthday,
      gender,
      verificationKey,
    });
    const authUser = {
      id: newUser._id.toString(),
      role: "guest",
      password: password,
    };
    const response = await axios.post(
      process.env.AUTH_SERVER_URL + "/user/register",
      authUser
    );
    if (response.status === 201) {
      newUser.save();
      sendClientEmail({
        from: process.env.CLIENT_SERVER_INBOX_EMAIL,
        to: newUser.email,
        subject: "Welcome to N ou B",
        html: `<h1>Hi ${newUser.firstName} ${newUser.lastName}</h1>
        <p>Thank you for joining N ou B</p>
        <p>Here is your verification link:<a href="${process.env.CLIENT_SERVER_URL}/${newUser._id}/${newUser.verificationKey}">verification link</a> </p>
        <p>Best regards</p>
        <p>N ou B team</p>`,
      });
      return res.status(201).json({
        message: "User created",
        status: "success",
        data: { user: newUser, tokens: response.data },
      });
    } else {
      return res
        .status(400)
        .json({ message: "User not created", status: "fail" });
    }
  } catch (err) {
    res.status(500).send({
      message: "could not process request",
      status: "fail",
    });
  }
};

exports.Login = async (req, res) => {
  try {
    const { email, password } = req.body;
    const user = await UserModel.findOne({
      email: { $regex: new RegExp(email, "i") },
    });
    if (!user) {
      res.json({ message: "User not found", status: "fail" });
    }
    const authUser = {
      id: user._id.toString(),
      password: password,
    };
    const response = await axios.post(
      process.env.AUTH_SERVER_URL + "/user/login",
      authUser
    );
    if (response.status === 200) {
      res.json({
        message: "User logged in successfully",
        status: "success",
        data: { user: user, tokens: response.data },
      });
    } else {
      res.json({
        message: "wrong credentials invalid username or password",
        status: "fail",
      });
    }
  } catch (err) {
    res.status(500).send({ message: "something went wrong", status: "fail" });
  }
};

exports.VerifyAccount = async (req, res) => {
  try {
    const { phoneNumber, verificationKey } = req.body;
    const user = await UserModel.findOne({ phoneNumber });
    if (!user) {
      return res
        .status(404)
        .json({ message: "User not found", status: "fail" });
    }
    if (user.verificationKey !== verificationKey) {
      return res
        .status(400)
        .json({ message: "Code is not correct", status: "fail" });
    }
    user.verified = true;
    await user.save();
    return res
      .status(200)
      .json({ message: "Account verified", status: "success" });
  } catch (error) {
    return res
      .status(500)
      .json({ message: "Internal server error", status: "fail" });
  }
};

exports.EmailVerification = async (req, res) => {
  try {
    const userId = req.params.userId;
    const verificationKey = req.params.VerificationKey;
    const user = await UserModel.findOne({ _id: userId });
    if (!user) {
      return res
        .status(404)
        .json({ message: "User not found", status: "fail" });
    }
 
    if (user.verificationKey !== (parseInt(verificationKey))) {
      return res.status(400).send("code is not correct");
    }
    user.verified = true;
    await user.save();
    return res.status(200).send("Account verified");
  } catch (error) {
    return res.status(500).send("Something went wrong");
  }
};

exports.SendVerificationSMS = async (req, res) => {
  try {
    const { phoneNumber } = req.body;
    const user = await UserModel.findOne({ phoneNumber });
    if (!user) {
      return res
        .status(404)
        .json({ message: "User not found", status: "fail" });
    }
    const verificationKey = Math.floor(Math.random() * 1000000);
    let messageDelivered = true;
    const url = `${process.env.SEND_SMS_URL}&mobile=216${phoneNumber}&sms=${verificationKey}&sender=N+ou+B`;
    const response = await axios.get(`${url}`);
    const data = JSON.parse(
      XmlToJson.xml2json(response.data, { compact: true, spaces: 4 })
    );

    messageDelivered = data.response.status.status_code._text === "200";
    if (messageDelivered) {
      user.verificationKey = verificationKey;
      await user.save();
      return res
        .status(200)
        .json({ message: "Verification code sent", status: "success" });
    }

    return res.status(400).json({ message: "SMS not sent", status: "fail" });
  } catch (error) {
    return res
      .status(500)
      .json({ message: "Internal server error", status: "fail" });
  }
};

exports.Refresh = async (req, res) => {
  try {
    UserModel.findOne(
      { refresh_token: req.body.refresh_token },
      async (err, user) => {
        if (err) {
          res.json({ message: err, status: "fail" });
        }
        if (!user) {
          res.json({ message: "User not found", status: "fail" });
        } else {
          await axios
            .post(`${process.env.AUTH_SERVER}/token/refresh`, user)
            .then((response) => {
              res.json({
                accessToken: response.data.accessToken,
                status: "success",
              });
            })
            .catch((error) => {
              res.json({ message: error, status: "fail" });
            });
        }
      }
    );
  } catch (err) {
    res
      .status(500)
      .send({ message: "could not process request", status: "fail" });
  }
};

exports.UpdateFirebaseToken = async (req, res) => {
  try {
    UserModel.findOneAndUpdate(
      { phoneNumber: req.user.phoneNumber },
      { firebase_token: req.body.firebase_token },
      { new: true },
      async (err, data) => {
        if (err) {
          res.json({ message: err, status: "fail" });
        }
        if (!data) {
          res.json({ message: "User not found", status: "fail" });
        }
        await axios
          .post(`${process.env.AUTH_SERVER}/token/refresh`, data)
          .then((response) => {
            const { accessToken } = response.data;
            res.json({ access_token: accessToken, status: "success" });
          })
          .catch((error) => {
            res.json({ message: error, status: "fail" });
          });
      }
    );
  } catch (err) {
    res
      .status(500)
      .send({ message: "could not process request", status: "fail" });
  }
};

exports.GetAll = async (req, res) => {
  try {
    const x = await UserModel.find({}).lean();
    res.json({ message: x, status: "success" });
  } catch (err) {
    res
      .status(500)
      .send({ message: "could not process request", status: "fail" });
  }
};

exports.GetById = async (req, res) => {
  try {
    UserModel.findOne({ id: req.user._id }, (err, data) => {
      if (err) {
        res.send(err);
      }
      res.json(data);
    });
  } catch (err) {
    res
      .status(500)
      .send({ message: "could not process request", status: "fail" });
  }
};

exports.Update = async (req, res) => {
  try {
    if (req.body.verified) {
      return res.json({
        message: "user cannot alter his verification status",
        status: "fail",
      });
    }
    if (req.body.password) {
      return res.json({
        message: "password updates are not allowed in this version of the app",
        status: "fail",
      });
    }
    if (req.body.phoneNumber !== req.user.phoneNumber) {
      req.body.verified = false;
    }
    const data = await UserModel.findOneAndUpdate(
      { phoneNumber: req.body.phoneNumber },
      req.body,
      { new: true }
    );
    if (data) {
      await data.save();
      return res.json({ message: data, status: "success" });
    }
    return res.json({ message: "User not found", status: "fail" });
  } catch (err) {
    res
      .status(500)
      .send({ message: "could not process request", status: "fail" });
  }
};

exports.ForgotPassword = async (req, res) => {
  try {
    const user = await UserModel.findOne({ phoneNumber: req.body.phoneNumber });
    if (!user) {
      return res.json({ message: "User not found", status: "fail" });
    }
    let messageDelivered = true;
    const code = Math.floor(Math.random() * (9999 - 1000) + 1000);
    const url = `${process.env.SEND_SMS_URL}&mobile=216${user.phoneNumber}&sms=${code}&sender=N+ou+B`;
    const response = await axios.get(`${url}`);
    const data = JSON.parse(
      XmlToJson.xml2json(response.data, { compact: true, spaces: 4 })
    );

    messageDelivered = data.response.status.status_code._text === "200";
    if (messageDelivered) {
      user.password_reset_code = code;
      await user.save();
      return res
        .status(200)
        .json({ message: "Verification code sent", status: "success" });
    }

    return res.status(400).json({ message: "SMS not sent", status: "fail" });
  } catch (err) {
    res
      .status(500)
      .send({ message: "could not process request", status: "fail" });
  }
};

exports.ResetPassword = async (req, res) => {
  try {
    const user = await UserModel.findOne({ phoneNumber: req.body.phoneNumber });
    if (!user) {
      return res.json({ message: "User not found", status: "fail" });
    }
    if (user.password_reset_code !== req.body.code) {
      return res.json({ message: "Invalid code", status: "fail" });
    }
    const hashedPassword = await bcrypt.hash(req.body.password, 10);
    user.password = hashedPassword;
    user.password_reset_code = null;
    await user.save();
    return res.json({
      message: "Password reset successfully",
      status: "success",
    });
  } catch (err) {
    res
      .status(500)
      .send({ message: "could not process request", status: "fail" });
  }
};
