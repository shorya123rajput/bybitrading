const { Schema, model } = require("../../config/config") // import Schema & model
const User = require('../models/User');
const Bybitaccount = require('../models/Bybitaccount');
const Strategies = require('../models/Strategies');

// Strategies Schema

const CopysubscriptionSchema = new Schema({
    subscribeTo: {
        type: Schema.Types.ObjectId,
        required: true,
    },
    subscribeFrom: {
        type: Schema.Types.ObjectId,
        required: true,
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
    strategies: {
        type: Schema.Types.ObjectId,
        ref: 'Strategies',
        required: true
    },
})

// User model
const Copysubscription = model("Copysubscription", CopysubscriptionSchema)

module.exports = Copysubscription
