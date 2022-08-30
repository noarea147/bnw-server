const nodemailer = require('nodemailer');

const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: 'heelpmee433@gmail.com',
    pass: 'gloriousapp',
  },
});

// this function is used to send email to the user to reset the password
exports.ResetPassword = async (email, resetCode) => {
  try {
    const mailOptions = {
      from: 'heelpmee433@gmail.com',
      to: email,
      subject: 'reset password',
      text: `use this code to reset password ${resetCode}`,
    };
    transporter.sendMail(mailOptions, (error, info) => {
      if (error) return error;
      return info.response;
    });
  } catch (err) {
    return err;
  }
};
