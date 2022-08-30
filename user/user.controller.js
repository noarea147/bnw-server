require('dotenv').config();
const bcrypt = require('bcrypt');
const axios = require('axios');
const XmlToJson = require('xml-js');
const UserModel = require('./user.model');
// const noticeModel = require('../Notice/notice.model');

function isInDatabase(user) {
  return UserModel.findOne({ phoneNumber: user.phoneNumber });
}

exports.VerifyAccount = async (req, res) => {
  try {
    const { phoneNumber, verificationKey } = req.body;
    const user = await UserModel.findOne({ phoneNumber });
    if (!user) {
      return res.status(404).json({ message: 'User not found', status: 'fail' });
    }
    if (user.verificationKey !== verificationKey) {
      return res.status(400).json({ message: 'Code is not correct', status: 'fail' });
    }
    user.verified = true;
    await user.save();
    await axios.post(`${process.env.AUTH_SERVER}/token/login`, user)
      .then((response) => {
        user.refresh_token = response.data.refreshToken;
        user.save((err, data) => {
          if (err) {
            res.json({ message: err, status: 'fail' });
          }
          return res.json({
            message: 'Account verified',
            data,
            access_token: response.data.accessToken,
            refresh_token: response.data.refreshToken,
            status: 'success',
          });
        });
      }).catch((error) => {
        res.json({ message: error, status: 'fail' });
      });
  } catch (error) {
    return res.status(500).json({ message: 'Internal server error', status: 'fail' });
  }
};

exports.SendVerificationSMS = async (req, res) => {
  try {
    const { phoneNumber } = req.body;
    const user = await UserModel.findOne({ phoneNumber });
    if (!user) {
      return res.status(404).json({ message: 'User not found', status: 'fail' });
    }
    const verificationKey = Math.floor(Math.random() * 1000000);
    let messageDelivered = true;
    const url = `${process.env.SEND_SMS_URL}&mobile=216${phoneNumber}&sms=${verificationKey}&sender=N+ou+B`;
    const response = await axios.get(`${url}`);
    const data = JSON.parse(XmlToJson.xml2json(response.data, { compact: true, spaces: 4 }));

    messageDelivered = data.response.status.status_code._text === '200';
    if (messageDelivered) {
      user.verificationKey = verificationKey;
      await user.save();
      return res.status(200).json({ message: 'Verification code sent', status: 'success' });
    }

    return res.status(400).json({ message: 'SMS not sent', status: 'fail' });
  } catch (error) {
    return res.status(500).json({ message: 'Internal server error', status: 'fail' });
  }
};

exports.Register = async (req, res) => {
  try {
    const user = new UserModel(req.body);
    if (await isInDatabase(user)) {
      return res.status(400).json({
        message: 'User already exists',
      });
    }

    const hashedPassword = await bcrypt.hash(req.body.password, 10);
    user.password = hashedPassword;
    await axios.post(`${process.env.AUTH_SERVER}/token/login`, user)
      .then((response) => {
        user.refresh_token = response.data.refreshToken;
        user.save((err, data) => {
          if (err) {
            res.json({ message: err, status: 'fail' });
          }
          res.json({
            data,
            access_token: response.data.accessToken,
            refresh_token: response.data.refreshToken,
            status: 'success',
          });
        });
      }).catch((error) => {
        res.json({ message: error, status: 'fail' });
      });
  } catch (err) {
    res.status(500).send({ message: 'could not process request', status: 'fail' });
  }
};

async function getTokens(user) {
  let result = null;
  await axios.post(`${process.env.AUTH_SERVER}/token/login`, user)
    .then((response) => {
      result = response.data;
    })
    .catch((error) => {
      result = { message: error, status: 'fail' };
    });
  return result;
}

exports.Login = async (req, res) => {
  try {
    const user = await UserModel.findOne({ phoneNumber: req.body.phoneNumber });
    if (!user) {
      res.json({ message: 'User not found', status: 'fail' });
    }
    if (await bcrypt.compare(req.body.password, user.password)) {
      const tokens = await getTokens(user);
      user.refresh_token = tokens.refreshToken;
      user.firebase_token = req.body.firebase_token;
      UserModel.findOneAndUpdate({ _id: user.id }, user, { new: true });
      res.json({
        user,
        access_token: tokens.accessToken,
        refresh_token: tokens.refreshToken,
        status: 'success',
      });
    } else {
      res.send({ message: 'wrong password', status: 'fail' });
    }
  } catch (err) {
    res.status(500).send({ message: 'could not process request', status: 'fail' });
  }
};

exports.Logout = async (req, res) => {
  try {
    await axios.post(`${process.env.AUTH_SERVER}token/logout`, {
      phoneNumber: req.user.phoneNumber,
      role: req.user.role,
      refreshToken: req.user.refresh_token,
    }).then(() => {
      UserModel.findOneAndUpdate(
        { _id: req.body.id },
        { refresh_token: null },
        { new: true },
        (err, data) => {
          if (err) {
            res.send(err);
          }
          res.json({ data, status: 'success' });
        },
      );
    }).catch((error) => {
      res.json({ message: error, status: 'fail' });
    });
  } catch (err) {
    res.status(500).send({ message: 'could not process request', status: 'fail' });
  }
};

exports.Refresh = async (req, res) => {
  try {
    UserModel.findOne({ refresh_token: req.body.refresh_token }, async (err, user) => {
      if (err) {
        res.json({ message: err, status: 'fail' });
      }
      if (!user) {
        res.json({ message: 'User not found', status: 'fail' });
      } else {
        await axios.post(`${process.env.AUTH_SERVER}/token/refresh`, user)
          .then((response) => {
            res.json({ accessToken: response.data.accessToken, status: 'success' });
          }).catch((error) => {
            res.json({ message: error, status: 'fail' });
          });
      }
    });
  } catch (err) {
    res.status(500).send({ message: 'could not process request', status: 'fail' });
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
          res.json({ message: err, status: 'fail' });
        }
        if (!data) {
          res.json({ message: 'User not found', status: 'fail' });
        }
        await axios.post(`${process.env.AUTH_SERVER}/token/refresh`, data)
          .then((response) => {
            const { accessToken } = response.data;
            res.json({ access_token: accessToken, status: 'success' });
          }).catch((error) => {
            res.json({ message: error, status: 'fail' });
          });
      },
    );
  } catch (err) {
    res.status(500).send({ message: 'could not process request', status: 'fail' });
  }
};

exports.GetAll = async (req, res) => {
  try {
    const x = await UserModel.find({}).lean();
    res.json({ message: x, status: 'success' });
  } catch (err) {
    res.status(500).send({ message: 'could not process request', status: 'fail' });
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
    res.status(500).send({ message: 'could not process request', status: 'fail' });
  }
};

exports.Update = async (req, res) => {
  try {
    if (req.body.verified) {
      return res.json({ message: 'user cannot alter his verification status', status: 'fail' });
    }
    if (req.body.password) {
      return res.json({ message: 'password updates are not allowed in this version of the app', status: 'fail' });
    }
    if (req.body.phoneNumber !== req.user.phoneNumber) {
      req.body.verified = false;
    }
    const data = await UserModel.findOneAndUpdate(
      { phoneNumber: req.body.phoneNumber },
      req.body,
      { new: true },
    );
    if (data) {
      await data.save();
      return res.json({ message: data, status: 'success' });
    }
    return res.json({ message: 'User not found', status: 'fail' });
  } catch (err) {
    res.status(500).send({ message: 'could not process request', status: 'fail' });
  }
};

exports.ForgotPassword = async (req, res) => {
  try {
    const user = await UserModel.findOne({ phoneNumber: req.body.phoneNumber });
    if (!user) {
      return res.json({ message: 'User not found', status: 'fail' });
    }
    let messageDelivered = true;
    const code = Math.floor(Math.random() * (9999 - 1000) + 1000);
    const url = `${process.env.SEND_SMS_URL}&mobile=216${user.phoneNumber}&sms=${code}&sender=N+ou+B`;
    const response = await axios.get(`${url}`);
    const data = JSON.parse(XmlToJson.xml2json(response.data, { compact: true, spaces: 4 }));

    messageDelivered = data.response.status.status_code._text === '200';
    if (messageDelivered) {
      user.password_reset_code = code;
      await user.save();
      return res.status(200).json({ message: 'Verification code sent', status: 'success' });
    }

    return res.status(400).json({ message: 'SMS not sent', status: 'fail' });
  } catch (err) {
    res.status(500).send({ message: 'could not process request', status: 'fail' });
  }
};

exports.ResetPassword = async (req, res) => {
  try {
    const user = await UserModel.findOne({ phoneNumber: req.body.phoneNumber });
    if (!user) {
      return res.json({ message: 'User not found', status: 'fail' });
    }
    if (user.password_reset_code !== req.body.code) {
      return res.json({ message: 'Invalid code', status: 'fail' });
    }
    const hashedPassword = await bcrypt.hash(req.body.password, 10);
    user.password = hashedPassword;
    user.password_reset_code = null;
    await user.save();
    return res.json({ message: 'Password reset successfully', status: 'success' });
  } catch (err) {
    res.status(500).send({ message: 'could not process request', status: 'fail' });
  }
};



exports.SetAsAdmin = async (req, res) => {
  try {
    UserModel.findOneAndUpdate({ phoneNumber: req.body.phoneNumber }, { role: 'admin' }, { new: true }, (err, data) => {
      if (err) {
        res.send(err);
      }
      res.json(data);
    });
  } catch (err) {
    res.status(500).send({ message: 'could not process request', status: 'fail' });
  }
};

exports.SetAsStaff = async (req, res) => {
  try {
    UserModel.findOneAndUpdate({ phoneNumber: req.body.phoneNumber }, { role: 'staff' }, { new: true }, (err, data) => {
      if (err) {
        res.send(err);
      }
      res.json(data);
    });
  } catch (err) {
    res.status(500).send({ message: 'could not process request', status: 'fail' });
  }
};

exports.DeleteById = async (req, res) => {
  try {
    UserModel.findOneAndDelete({ _id: req.body.id }, (err, data) => {
      if (err) {
        res.send(err);
      }
      res.json(data);
    });
  } catch (err) {
    res.status(500).send({ message: 'could not process request', status: 'fail' });
  }
};

exports.DeleteByphoneNumber = async (req, res) => {
  try {
    UserModel.findOneAndDelete({ phoneNumber: req.body.phoneNumber }, (err, data) => {
      if (err) {
        res.send(err);
      }
      if (!data) {
        res.json({ message: 'User not found', status: 'fail' });
      }
      res.json(data);
    });
  } catch (err) {
    res.status(500).send({ message: 'could not process request', status: 'fail' });
  }
};

exports.DeleteByRole = async (req, res) => {
  try {
    UserModel.deleteMany({ role: req.body.role }, (err, data) => {
      if (err) {
        res.send(err);
      }
      res.json(data);
    });
  } catch (err) {
    res.status(500).send({ message: 'could not process request', status: 'fail' });
  }
};
