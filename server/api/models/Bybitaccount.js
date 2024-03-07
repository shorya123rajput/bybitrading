const { Schema, model } = require("../../config/config") // import Schema & model
const User = require('../models/User');

// Bybitaccount Schema
const BybitaccountSchema = new Schema({
    connectionName: {
        type: String,
        required: true
    },
    apiKey: {
        type: String,
        unique: true,
        required: true,
    },
    secretKey: {
        type: String,
        required: true
    },
    status: {
        type: String
    },
    exchange: {
        type: String
    },
    connectedTradetype: [{
        type: String
    }],
    balance: {
        type: Schema.Types.Mixed
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
    }
})

// Handler **must** take 3 parameters: the error that occurred, the document
// in question, and the `next()` function
BybitaccountSchema.post('save', function (error, doc, next) {
    if (error.name === 'MongoServerError' && error.code === 11000) {
        next(new Error('There was a duplicate key error'));
    } else {
        next();
    }
});
// User model
const Bybitaccount = model("Bybitaccount", BybitaccountSchema)

module.exports = Bybitaccount
