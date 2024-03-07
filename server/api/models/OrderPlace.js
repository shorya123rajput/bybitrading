const { Schema, model } = require("../../config/config") // import Schema & model
const User = require('../models/User');
const Strategies = require('../models/Strategies');
const Bybitaccount = require('../models/Bybitaccount');

// Strategies Schema

const OrderPlaceSchema = new Schema({
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
    copysubscription: {
        type: String,
    },
})

OrderPlaceSchema.statics = {

    // async orderPlaceFind(param) {

    //     const resultDatas = await OrderPlace.find(param).populate(
    //         {
    //             path: 'strategies',
    //             populate: {
    //                 path: 'bybitaccount',
    //                 model: 'Bybitaccount',
    //             }
    //         });

    //     if (resultDatas.length > 0) {
    //         return resultDatas;
    //     }
    // },

}

// OrderPlace model
const OrderPlace = model("Orderplace", OrderPlaceSchema)

module.exports = OrderPlace
