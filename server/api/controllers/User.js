const User = require("../models/User"); // import user model
const Copysubscription = require('../models/Copysubscription');
const OrderClose = require('../models/OrderClose');
const OrderPlace = require('../models/OrderPlace');
const Strategies = require('../models/Strategies');
const Bybitaccount = require("../models/Bybitaccount");
const authHelper = require("../helpers/authHelper");
const { smtpMail } = require("../helpers/commonHelper");
const moment = require('moment');
const { v4: uuidv4 } = require('uuid');
require("dotenv").config();


/**
 * {GET} v1/users/list
 * @param {*} req 
 * @param {*} res 
 * @param {*} next 
 * @apiDiscription Get users for global user
 */
const list = async (req, res, next) => {
  try {
    if (req.user.role == process.env.SUPERADMIN) {
      const getUserList = await User.userListField();
      const userList = await User.find({ _id: { $ne: req.user.userId } }).select(getUserList)
      if (userList.length > 0) {
        return res.status(200).send({
          success: true,
          data: userList
        })
      }
    }
  } catch (e) {
    res.status(400).send(e);
  }
}

/**
 * {GET} v1/user/:userId
 * @param {*} req 
 * @param {*} res 
 * @param {*} next 
 * @apiDiscription Get users for global user
 */
const getUser = async (req, res, next) => {
  try {
    const getUserList = await User.userListField();
    const userList = await User.find({ _id: req.params.userId }).select(getUserList)
    if (userList.length > 0) {
      return res.status(200).send({
        success: true,
        data: userList
      })
    }
  } catch (e) {
    res.status(400).send(e);
  }
}


const getUserProfile = async (req, res, next) => {
  try {
    const user = await User.findById(req.user.userId);
    return res.status(200).send({
      email: user.email,
      referralLink: `${process.env.APP_FRONTEND_URL}/#/signup?referralCode=${user.referralCode}`,
      referredCount: user.referred,
      referredUsers: user.referredUsers
    });
  } catch (e) {
    res.status(400).send(e);
  }

};

/**
 * @api {POST} /api/v1/auth/signup
 * @apiGroup User
 * @apiDiscription singup user
 */
const signup = async (req, res, next) => {
  try {
    const username = req.body.username.toLowerCase();
    const { email, referralCode } = req.body;
    if (email == process.env.USEREMAIL) {
      req.body.role = process.env.SUPERADMIN;
    }

    let referredBy;
    if (referralCode) {
      referredBy = await User.findOne({ referralCode });

      if (!referredBy) {
        return res.status(200).send('Invalid referral code');
      }
    }

    let param = { email: email };
    const userEmailCheck = await User.findOne(param);
    if (userEmailCheck) {
      return res.status(200).send({
        success: false,
        message: "Email already Exist!"
      });
    }

    let param2 = { username: username };
    const userUsernameCheck = await User.findOne(param2);
    if (userUsernameCheck) {
      return res.status(200).send({
        success: false,
        message: "Username already Exist!"
      });
    }

    // hash the password
    req.body.password = await authHelper.hashPassword(req.body.password);
    // create a new user
    let confirmationCode = await authHelper.generateToken(email);
    req.body.confirmationCode = confirmationCode.substring(confirmationCode.length - 43);



    // const user = await User.create(req.body);
    const user = new User({
      username: username,
      email: email,
      password: req.body.password,
      confirmationCode: req.body.confirmationCode,
      role: req.body.role
    });
    if (referredBy) {
      user.referredBy = referredBy._id;
      referredBy.referredUsers.push(user._id);
      referredBy.referred += 1;
      await referredBy.save();
    }
    await user.save();
    if (user) {
      return res.status(200).send({
        success: true,
        message: "User Register successfully",
        data: user
      })
    }

  } catch (e) {
    res.status(400).send({
      success: false,
      message: e.message
    });
  }
};

/**
 * @api {POST} /api/v1/auth/login
 * @apiGroup User
 * @apiDiscription login route to verify a user and get a token
 */
const authentication = async (req, res) => {
  try {
    const { email, password } = req.body;
    // check if the user exists
    // const user = await User.findOne({ email: email });
    const user = await User.findOne({ $or: [{ email: email }, { username: email.toLowerCase() }] });
    if (user) {

      // if (user.status != "Active") {
      //   return res.status(401).send({
      //     success: false,
      //     message: "Pending Account. Please Verify Your Email!",
      //   });
      // }

      //check if password matches
      const result = await authHelper.comparePassword(user.password, password);
      if (result) {
        // sign token and send it in response
        const token = await authHelper.generateToken(user.email, user.id, user.role);

        return res.status(200).send({
          success: true,
          message: "Login successfully",
          access_token: token,
          data: user,
        });
      } else {
        return res.status(200).send({
          success: false,
          message: "password doesn't match"
        });
      }
    } else {
      return res.status(200).send({
        success: false,
        message: "User doesn't exist"
      })
    }
  } catch (e) {
    res.status(400).send(e);
  }
};

/**
  * @api {POST} /api/v1/auth/forgot-password Forgot password
  * @apiGroup User
  * @apiDiscription forgot password for user
  */
const forgotPassword = async (req, res, forgot) => {
  try {
    const { email } = req.body;
    let param = { email: email };
    const user = await User.findOne(param);
    if (!user) {
      return res.status(200).send({
        success: false,
        message: "User doesn't exist"
      });
    }
    // Reset password
    let bodyData = {
      resetPasswordToken: uuidv4(),
      resetPasswordExpires: moment().add(1, "hours"),
    }
    const userData = await User.findByIdAndUpdate({ _id: user.id }, bodyData, { new: true }).exec();
    // Email send
    if (userData) {
      let data = await User.findById(user.id);
      const emailPass = emailPassword(data, res);

    }


  } catch (e) {
    return res.status(400).send(e);
  }
};

// Forgot Email send 
async function emailPassword(user, res) {

  // send mail with defined transport object
  const mailOptions = {
    from: '"Fanatic 👻" <vikram@fanaticcoders.com>', // sender address
    to: user.email, // list of receivers
    subject: "Password Reset", // Subject line
    text: "Password Reset", // plain text body
    html:
      "<h1> Hello" +
      " " +
      user.firstName + ' ' + user.lastName +
      "!</h1>" +
      "<p> If you've lost your password or wish to reset it,<br> use the link below to get started </p>" +
      "<a href=" +
      process.env.APP_FRONTEND_URL +
      "/reset-password/" +
      user.resetPasswordToken +
      " >Reset Your Password</a>" // html body
  };
  smtpMail(mailOptions, res);
};

/**
  * @api {POST} /api/v1/auth/reset Reset password
  * @apiGroup User
  * @apiDiscription Reset password for user
  */
const reset = async (req, res, next) => {
  try {
    const { password, resetPasswordToken } = req.body;

    const user = await User.findOne({ resetPasswordToken: resetPasswordToken, resetPasswordExpires: { $gt: Date.now() } });

    if (!user) {
      return res.status(200).send({
        success: false,
        message: "Password reset token is invalid or has expired."
      });
    }
    const hashPassword = authHelper.hashPassword(password);
    user.password = hashPassword;
    user.resetPasswordToken = null;
    user.save();
    return res.status(200).send({
      success: true,
      message: "Your password has been changed."
    });
  } catch (e) {
    return res.status(400).send(e);
  }
};

/**
 * {PUT} v1/user/update
 * @param {*} req 
 * @param {*} res 
 * @param {*} next 
 * @apiDiscription Get users for global user
 */
const updateUser = async (req, res, next) => {
  try {
    if (req.user.role == process.env.SUPERADMIN) {
      const getUserList = await User.userListField();
      const userData = await User.findByIdAndUpdate({ _id: req.body.userId }, { role: req.body.role }, { new: true }).select(getUserList).exec();
      if (userData) {
        return res.status(200).send({
          success: true,
          data: userData
        })
      }
    }
  } catch (e) {
    res.status(400).send(e);
  }
}

/**
 * {PUT} v1/user/updatedata
 * @param {*} req 
 * @param {*} res 
 * @param {*} next 
 * @apiDiscription Get users for global user
 */
const updateUserData = async (req, res, next) => {
  try {
      const { email, password } = req.body;

      // Find the user by ID
      const user = await User.findById(req.body.userId);

       // Update the user fields
       user.email = email;
      
      if (password) {
       
        // hash the password
        let hashPassword = await authHelper.hashPassword(password);
        user.password = hashPassword;

      }
     
      // Save the updated user
      const result = await user.save();
      if (result) {
        return res.status(200).send({
          success: true,
          data: result
        })
      }
    
  } catch (e) {
    res.status(400).send(e);
  }
}

/**
 * {DELETE} v1//user/delete/:userId
 * @param {*} req 
 * @param {*} res 
 * @param {*} next 
 * @apiDiscription Get users for global user
 */
const deleteUser = async (req, res, next) => {
  try {
    const userData = await User.findOne({ _id: req.params.userId });
    if (userData) {
      const closeOrderDelete = await OrderClose.deleteMany({ user: userData.id });
      const placetheOrderDelete = await OrderPlace.deleteMany({ user: userData.id });
      const copyTradingDelete = await Copysubscription.deleteMany({ user: userData.id });
      const strategiesDelete = await Strategies.deleteMany({ user: userData.id });
      const bybitaccountDelete = await Bybitaccount.deleteMany({ user: userData.id });
      const userReferal = await User.findOneAndUpdate({ referredUsers: userData.id }, { $pull: { referredUsers: userData.id } });
      const userDelete = await User.deleteOne({ '_id': userData.id });
      return res.status(200).send({
        success: true,
        closeOrderDelete: closeOrderDelete,
        placetheOrderDelete: placetheOrderDelete,
        copyTradingDelete: copyTradingDelete,
        strategiesDelete: strategiesDelete,
        bybitaccountDelete: bybitaccountDelete,
        userReferal: userReferal,
        userDelete: userDelete
      })
    }
    return res.status(200).send({
      success: false,
      message: 'User not found!'
    })
  } catch (e) {
    res.status(400).send(e);
  }
}


module.exports = { signup, authentication, list, updateUser, updateUserData, getUser, forgotPassword, reset, getUserProfile, deleteUser };
