const Joi = require('@hapi/joi');

const schema = {
  signupUser: Joi.object({
    username: Joi.string().min(4).pattern(/^\S+$/).required(),
    email: Joi.string()
      .email()
      .required(),
    password: Joi.string()
      .min(6)
      .max(128)
      .required(),
      referralCode: Joi.string().optional().allow("")
  }).options({ abortEarly: false }),
  loginUser: Joi.object({
    email: Joi.string(),
    password: Joi.string()
      .min(6)
      .max(128)
      .required()
  }).options({ abortEarly: false }),
  forgot: Joi.object({
    email: Joi.string()
      .email()
      .required(),
  }).options({ abortEarly: false }),
  reset: Joi.object({

    password: Joi.string()
      .min(6)
      .max(128)
      .required(),
    confirmPassword: Joi.string().required().valid(Joi.ref('password')),
    resetPasswordToken: Joi.string().required()
  }).options({ abortEarly: false }),
  addAccount: Joi.object({
    connectionName: Joi.string().required(),
    apiKey: Joi.string().required(),
    secretKey: Joi.string().required()
  }).options({ abortEarly: false }),
}

module.exports = schema;

