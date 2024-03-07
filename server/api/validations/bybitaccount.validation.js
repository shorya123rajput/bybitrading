const Joi = require('@hapi/joi');

const schema = {
  addAccount: Joi.object({
    connectionName: Joi.string().required(),
    apiKey: Joi.string().required(),
    secretKey: Joi.string().required()
  }).options({ abortEarly: false }),
}

module.exports = schema;

