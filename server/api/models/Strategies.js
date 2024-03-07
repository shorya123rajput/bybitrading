const { Schema, model } = require("../../config/config") // import Schema & model
const User = require('../models/User');
const Bybitaccount = require('../models/Bybitaccount');
const Copysubscription = require('../models/Copysubscription');

// Strategies Schema

const StrategiesSchema = new Schema({
    strategyName: {
        type: String,
        unique: true,
        required: true
    },
    exchange: {
        type: String,
        required: true,
    },
    type: {
        type: String,
        required: true
    },
    connectedApikey: {
        type: String
    },
    baseCoin: {
        type: String
    },
    strategyDescription: {
        type: String,
    },
    copyTradingcost: {
        type: String
    },
    signalsCost: {
        type: String
    },
    riskLimitValue:{
         type:String,
         required: true
    },
    minimumBalance:{
         type:String,
         required:true
    },
    created_at: {
        type: Date,
        default: Date.now
    },
    updated_at: {
        type: Date,
        default: Date.now
    },
    user: {
        type: Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    bybitaccount: {
        type: Schema.Types.ObjectId,
        ref: 'Bybitaccount',
        required: true
    },
    copysubscription: [{
        type: Schema.Types.ObjectId,
        ref: 'Copysubscription',
        required: true
    }],
})

// User model
const Strategies = model("Strategies", StrategiesSchema)

module.exports = Strategies
