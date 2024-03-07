const { Schema, model } = require("../../config/config") // import Schema & model
const User = require('../models/User');
const Strategies = require('../models/Strategies');
const Bybitaccount = require('../models/Bybitaccount');

// Strategies Schema

const OrderCloseSchema = new Schema({
    orderId: {
        type: String,
        required: true,
    },
    orderParentId: {
        type: String,
        required: true,
    },
    type: {
        type: String,
        required: true
    },
    symbol: {
        type: String,
        required: true
    },
    ordercreatedTime: {
        type: String,
        required: true
    },
    orderStatus: {
        type: Boolean,
        default: false
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
    bybitaccount: {
        type: Schema.Types.ObjectId,
        ref: 'Bybitaccount',
        required: true
    },
})



// Orderclose model
const OrderClose = model("Orderclose", OrderCloseSchema)

module.exports = OrderClose
