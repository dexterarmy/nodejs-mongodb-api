const nodemailer = require('nodemailer');

const sendEmail = async (options) => {
  // create transporter, transport configuration in nodemailer
  /*
  const transporter = nodemailer.createTransport({
    service: 'Gmail', // no need to set host or port etc.
    auth: {
      user: process.env.EMAIL_USERNAME,
      pass: process.env.EMAIL_PASSWORD,
    },
    // Then, activate "less secure app" option in Gmail
  });
*/

  // new transporter definition
  const transporter = nodemailer.createTransport({
    host: process.env.EMAIL_HOST,
    port: process.env.EMAIL_PORT,
    auth: {
      user: process.env.EMAIL_USERNAME,
      pass: process.env.EMAIL_PASSWORD,
    },
  });

  // define the email options
  const mailOptions = {
    from: 'mohit sharma <hello@mohit.io>',
    to: options.email,
    subject: options.subject,
    text: options.message,
  };
  // send the email
  await transporter.sendMail(mailOptions);
};

// export as a default from this module
module.exports = sendEmail;
