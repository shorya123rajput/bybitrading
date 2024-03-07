const Joi = require('@hapi/joi');

const schema = {
  addStrategy: Joi.object({
    strategyName: Joi.string().required(),
    exchange: Joi.string().required(),
    type: Joi.string().required(),
    baseCoin: Joi.string().required(),
    strategyDescription: Joi.string().optional().allow(""),
    bybitaccount: Joi.string(),
    copyTradingcost: Joi.string(),
    signalsCost: Joi.string(),
    riskLimitValue: Joi.string().required(),
    minimumBalance: Joi.string().required()

  }).options({ abortEarly: false }),
}

module.exports = schema;

