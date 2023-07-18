const nodemailer = require('nodemailer');

const smtpConfig = {
    host: process.env.MAIL_HOST,
    port: 465,
    secure: true, // use SSL
    auth: {
        user: process.env.CLIENT_SERVER_INBOX_EMAIL,
        pass: process.env.CLIENT_SERVER_INBOX_PASSWORD
    }
};
const transporter = nodemailer.createTransport(smtpConfig);


// send email
const sendClientEmail = async(email) => {
    let response = await transporter.sendMail(email);
    return response;
}

module.exports = {
    sendClientEmail,
};