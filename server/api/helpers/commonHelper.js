
const { omit, pick, map } = require('lodash');
const nodemailer = require('nodemailer');
require('dotenv').config();
const commonHelper = {
    // omit obj fields
    omitObj(data, fields) {
        let result = omit(data, fields);
        return result
    },

    // omit [] fields
    omitArr(data, fields) {
        let result = [];
        data.map((obj) => {
            let omitData = omit(obj, fields);
            result.push(omitData);
        });
        return result
    },

    // pick obj fields
    pickObj(data, fields) {
        let result = pick(user, fields);
        return result
    },

    // pick [] fields
    pickArr(data, fields) {
        let result = [];
        data.map((obj) => {
            let omitData = pick(obj, fields);
            result.push(omitData);
        });
        return result
    },

   async smtpMail(mailOptions, res) {
        try {
            const smtpTransport = nodemailer.createTransport({
                host: process.env.MAIL_HOST,
                port: process.env.MAIL_PORT,
                secure: false, // true for 465, false for other ports
                auth: {
                    user: process.env.MAIL_USERNAME, // generated ethereal user
                    pass: process.env.MAIL_PASSWORD // generated ethereal password
                },
                tls: {
                    // do not fail on invalid certs
                    rejectUnauthorized: false
                }
            });
            let info = await smtpTransport.sendMail(mailOptions);
            return res.status(200).send({
                success: true,
                message:
                    "Email sent successfully! Please check your email to reset a password"
            });
        } catch (e) {
            return res.send({
                success: true,
                message: e
            });
        }
    },
}

module.exports = commonHelper;