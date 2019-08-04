const nodemailer = require("nodemailer");
const sendGridTransport = require("nodemailer-sendgrid-transport");
require("dotenv").config();
const {welcome} = require("./welcome_template");
const URL = process.env.NODE_ENV === "production" ? process.env.ROOT_URL : "http://localhost:3000"

const getEmailData = (to, name, token, type) => {
  let data = null;
  switch (type) {
    case "welcome":
        data = {
          to,
          from: "teplov.maximalist@yandex.ru",
          subject: `Welcome to Waves, ${name}`,
          html: welcome()
        }
      break;
      case "purchase":
          data = {
            to,
            from: "teplov.maximalist@yandex.ru",
            subject: `You purchase in Waves shop, ${name}`,
            html: `<p>Congratulations!!! Our managers contact with you a little bit later</p>`
          }
        break;
      case "reset-password":
          data = {
            to,
            from: "teplov.maximalist@yandex.ru",
            subject: "Reset password",
            html: `<p>You can reset your password by following link below</p>
                  <a href="${URL}/reset_password/${token}">Reset password</a>`
          }
        break;
    default:
      data
  }

  return data;
}

const sendEmail = (to, name, token, type) => {
  const transporter = nodemailer.createTransport({
      direct:true,
      host: 'smtp.yandex.ru',
      port: 465,
      auth: {
          user: 'teplov.maximalist@yandex.ru',
          pass: process.env.EMAIL_PASS
        },
      secure: true
  });

  const mail = getEmailData(to, name, token, type);

  transporter.sendMail(mail, (err, info) => console.log("Mailer", err, info))
}

module.exports = {
  sendEmail
}
