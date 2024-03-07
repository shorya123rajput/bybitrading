const Copysubscription = require('../models/Copysubscription');
const OrderClose = require('../models/OrderClose');
const OrderPlace = require('../models/OrderPlace');
const Strategies = require('../models/Strategies');
const User = require('../models/User');
const {
    InverseClient,
    LinearClient,
    InverseFuturesClient,
    SpotClientV3,
    UnifiedMarginClient,
    USDCOptionClient,
    USDCPerpetualClient,
    AccountAssetClient,
    CopyTradingClient,
    RestClientV5,
} = require('bybit-api');
require("dotenv").config();

/**
 * @api {POST} /api/v1/add
 * @apiGroup Strategies
 * @apiDiscription add strategy
 * @param {*} req 
 * @param {*} res 
 * @param {*} next 
 */

const add = async (req, res, next) => {
    try {
        req.body.user = req.user.userId;
        const strategiesCheck = await Strategies.findOne({ 'user': req.user.userId });
        if (strategiesCheck) {
            return res.status(200).send({
                success: false,
                message: 'Only One strategies allowed!',
            })
        }


        const strategies = await Strategies.create(req.body);
        if (strategies) {
            const user = await User.findById({ _id: req.user.userId });
            user.strategies.push(strategies.id);
            await user.save();
            return res.status(200).send({
                success: true,
                message: 'Strategies add successfully',
                data: strategies
            })
        }
    } catch (e) {
        res.status(400).send(e);
    }

}


/**
 * @api {GET} /api/v1/strategies/list
 * @apiGroup Bitbyaccount
 * @apiDiscription get strategies api data
 * @param {*} req 
 * @param {*} res 
 * @param {*} next 
 */
const publicList = async (req, res, next) => {
    try {
        const strategiesData = await Strategies.find({ user: { $ne: req.user.userId } }).populate('bybitaccount');
        let walletData = [];
        if (strategiesData.length > 0) {
            for (let item in strategiesData) {
                const client = new RestClientV5({
                    key: strategiesData[item].bybitaccount.apiKey,
                    secret: strategiesData[item].bybitaccount.secretKey,
                    testnet: process.env.USE_TESTNET
                },);
                try {
                    const getWalletBalance = await client.getWalletBalance({ accountType: 'UNIFIED', coin: 'USDT' });
                    if (getWalletBalance.retMsg == 'OK') {
                        const result = Object.assign({}, strategiesData[item].toJSON(), ...getWalletBalance.result.list);
                        walletData.push(result);
                    }
                } catch (e) {
                    const data = strategiesData[item];
                    walletData.push(data);
                }
            }
            return res.status(200).send({
                success: true,
                data: walletData
            });
        }
        return res.status(200).send({
            success: false,
            message: 'Data not found'
        });
    } catch (e) {
        res.send(e);
    }

}


/**
 * @api {GET} /api/v1/strategies/list
 * @apiGroup Bitbyaccount
 * @apiDiscription get strategies api data
 * @param {*} req 
 * @param {*} res 
 * @param {*} next 
 */
const list = async (req, res, next) => {
    try {
        const strategiesData = await Strategies.find({ 'user': req.user.userId }).populate('bybitaccount');

        let walletData = [];

        if (strategiesData.length > 0) {
            for (let item in strategiesData) {
                const client = new RestClientV5({
                    key: strategiesData[item].bybitaccount.apiKey,
                    secret: strategiesData[item].bybitaccount.secretKey,
                    testnet: process.env.USE_TESTNET
                },);
                try {
                    const getWalletBalance = await client.getWalletBalance({ accountType: 'UNIFIED' });
                    if (getWalletBalance.retMsg == 'OK') {
                        const result = Object.assign({}, strategiesData[item].toJSON(), ...getWalletBalance.result.list);
                        walletData.push(result);
                    }
                } catch (e) {
                    const data = strategiesData[item];
                    walletData.push(data);
                }
            }
            return res.status(200).send({
                success: true,
                data: walletData
            });
        }
        return res.status(200).send({
            success: false,
            message: 'Data not found'
        });
    } catch (e) {
        res.send(e);
    }

}
/**
 * @api {GET} /api/v1/strategies/delete:/strategyId
 * @apiGroup Strategy
 * @apiDiscription delte strategies data
 * @param {*} req 
 * @param {*} res 
 * @param {*} next 
 */
const deleteStrategy = async (req, res, next) => {
    try {
        const strategiesData = await Strategies.findOne({ '_id': req.params.strategyId, 'user': req.user.userId });
        if (strategiesData) {
            const closeOrderDelete = await OrderClose.deleteMany({ strategies: strategiesData.id });
            const placetheOrderDelete = await OrderPlace.deleteMany({ strategies: strategiesData.id });
            const copyTradingDelete = await Copysubscription.deleteMany({ strategies: strategiesData.id });
            const userstrategyUpdate = await User.findByIdAndUpdate(req.user.userId, { $pull: { strategies: strategiesData.id } });
            const strategiesDelete = await Strategies.deleteMany({ _id: strategiesData.id });
            return res.status(200).send({
                success: true,
                closeOrderDelete: closeOrderDelete,
                placetheOrderDelete: placetheOrderDelete,
                copyTradingDelete: copyTradingDelete,
                userstrategyUpdate: userstrategyUpdate,
                strategiesDelete: strategiesDelete,
            });
        }
        return res.status(200).send({
            success: true,
            message: "Data not found!"
        });

    } catch (e) {
        res.status(400).send(e);
    }
}

module.exports = { add, publicList, list, deleteStrategy };