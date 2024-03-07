const Strategies = require('../models/Strategies');
const User = require('../models/User');
const Orderplace = require('../models/OrderPlace');
const Orderclose = require('../models/OrderClose');
const Bybitaccount = require('../models/Bybitaccount');
const Copysubscription = require('../models/Copysubscription');
const { uniqBy, filter, map, intersectionBy, isEmpty, isEqual, find, groupBy, mapValues, sumBy, reduce } = require('lodash');
const { v4: uuidv4 } = require('uuid');
const moment = require('moment');
require("dotenv").config();
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

/**
 * @api {GET} /api/v1/analytics/main-trader:strategyid
 * @apiGroup Orderclose
 * @apiDiscription get orders position
 * @param {*} req 
 * @param {*} res 
 * @param {*} next 
 */
const maintradeList = async (req, res, next) => {
    try {

        const resultOrder = await Orderplace.find({ user: req.user.userId, strategies: req.params.strategies }).populate('bybitaccount');
        resultOrder.sort((a, b) => (a.symbol > b.symbol ? 1 : -1));
        const result = uniqBy(resultOrder, 'symbol');
        if (result.length > 0) {
            analyticOpenPosition = [];
            for (let item in result) {
                const client = new RestClientV5({
                    key: result[item].bybitaccount.apiKey,
                    secret: result[item].bybitaccount.secretKey,
                    testnet: process.env.USE_TESTNET
                },);

                // get open position
                const getOpenPosition = await client.getPositionInfo({ category: result[item].type, baseCoin: 'USDT', symbol: result[item].symbol, orderId: result[item].orderId });
                if (getOpenPosition.retMsg == 'OK') {
                    const checkOpenPositon = getOpenPosition.result.list;
                    if (checkOpenPositon.length > 0) {
                        const mergeopenPositionData = Object.assign({}, result[item].toJSON(), ...checkOpenPositon);
                        analyticOpenPosition.push(mergeopenPositionData);
                    }
                }

            }
            // const uniqueArray = uniqBy(analyticOpenPosition, 'symbol');
            const filteredDataposition = filter(analyticOpenPosition, (obj) => {
                return obj.size !== "0";
            });
            return res.status(200).send({
                success: true,
                data: filteredDataposition
            });
        }

        return res.status(200).send({
            success: true,
            message: "strategy not found!"
        });
    }
    catch (e) {
        res.status(400).send(e);
    }
}



/**
 * @api {GET} /api/v1/analytics/close-trade:strategyid
 * @apiGroup Orderclose
 * @apiDiscription get close orders
 * @param {*} req 
 * @param {*} res 
 * @param {*} next 
 */
const closetradeList = async (req, res, next) => {
    try {

        const resultClose = await Orderclose.find({ user: req.user.userId, strategies: req.params.strategies }).populate('bybitaccount');

        if (resultClose.length > 0) {
            analyticClosePosition = [];
            for (let item in resultClose) {
                const client = new RestClientV5({
                    key: resultClose[item].bybitaccount.apiKey,
                    secret: resultClose[item].bybitaccount.secretKey,
                    testnet: process.env.USE_TESTNET
                },);

                // get closed pnl
                const getclosedpnl = await client.getClosedPnL({ category: resultClose[item].type, baseCoin: 'USDT', symbol: resultClose[item].symbol });
                if (getclosedpnl.retMsg == 'OK') {
                    const checkClosePositon = getclosedpnl.result.list;
                    if (checkClosePositon.length > 0) {
                        const filters = {
                            orderId: resultClose[item].orderId,
                        };
                        var filteredData = filter(checkClosePositon, filters);
                        if (filteredData.length > 0) {
                            const mergeClosePositionData = Object.assign({}, ...filteredData);
                            analyticClosePosition.push(mergeClosePositionData);
                        };

                    }
                }

            }
            return res.status(200).send({
                success: true,
                data: analyticClosePosition
            });
        }

        return res.status(200).send({
            success: true,
            message: "strategy not found!"
        });
    }
    catch (e) {
        res.status(400).send(e);
    }
}

/**
 * @api {GET} /api/v1/analytics/withdraw
 * @apiGroup Withdraw
 * @apiDiscription get withdraw trade
 * @param {*} req 
 * @param {*} res 
 * @param {*} next 
 */
const withdrawClosingtrade = async (req, res, next) => {
    try {
        // closed pnl
        const strategies = await Strategies.findOne({ user: req.user.userId });
        if (strategies) {
            const ordercloseData = await Orderclose.find({ user: req.user.userId });
            if (ordercloseData.length == 0) {
                return res.status(200).send({
                    success: true,
                    'message': "Order closed Not found!"
                });
            }
            const OrderAndParentIdEqual = filter(ordercloseData, ({ orderId, orderParentId }) => orderId === orderParentId);
            const orderParentIds = map(OrderAndParentIdEqual, 'orderParentId');
            const orderclsData = await Orderclose.find({ user: { $ne: req.user.userId }, orderParentId: { $in: orderParentIds }, orderStatus: false }).populate('bybitaccount');

            if (orderclsData.length > 0) {
                var withdrawData = [];
                const uniqueObjects = uniqBy(orderclsData, obj => obj.user.toString());

                for (let item in uniqueObjects) {
                    const client = new RestClientV5({
                        key: uniqueObjects[item].bybitaccount.apiKey,
                        secret: uniqueObjects[item].bybitaccount.secretKey,
                        testnet: process.env.USE_TESTNET
                    },);

                    const getclosedpnl = await client.getClosedPnL({ category: uniqueObjects[item].type, baseCoin: 'USDT' });

                    if (getclosedpnl.retMsg == 'OK') {
                        const getclosedpnlposition = getclosedpnl.result.list;
                        if (getclosedpnlposition.length > 0) {
                            const matchedOrders = intersectionBy(getclosedpnlposition, orderclsData, 'orderId');

                            const filteredOrders = matchedOrders.filter(order => parseFloat(order['closedPnl']) < 1000);
                            var sum = filteredOrders.reduce((total, order) => total + parseFloat(order['closedPnl']), 0);
                            var orderIds = filteredOrders.map(order => order.orderId);
                            if (sum < 1000) {
                                // const copyTradingcostPercentage = 14 / 100;
                                // const amountData = sum * copyTradingcostPercentage;
                                // var amountDataTofixed = amountData.toFixed(3);
                                // var uuid = uuidv4();
                                // const createTransfer = await client.createInternalTransfer(
                                //     uuid,
                                //     "USDT",
                                //     "0.005",
                                //     "UNIFIED",
                                //     "FUND",
                                // );

                                const userData = await User.findOne({ '_id': uniqueObjects[item].bybitaccount.user }).populate({ path: 'referredUsers', populate: { path: 'referredUsers', } });

                                let level1;
                                let level2;
                                if (userData.referredUsers.length > 0) {
                                    const referredUsersData = userData.referredUsers;
                                    for (let item in referredUsersData) {
                                        level1 = referredUsersData[item].email;
                                        if (referredUsersData[item].referredUsers.length > 0) {
                                            level2 = referredUsersData[item].referredUsers[0].email || '';
                                        }

                                    }
                                } else {
                                    level1 = '';
                                    level2 = ''
                                }

                                let michelTrading = 2 / 100;
                                michelTrading = sum * michelTrading;
                                michelTrading = michelTrading.toFixed(3);

                                var garblTrading;
                                var level1withdrawl;
                                var level2withdrawl;
                                if (level1 && level2) {
                                    garblTrading = 9 / 100;
                                    garblTrading = sum * garblTrading;
                                    garblTrading = garblTrading.toFixed(3);

                                    level1withdrawl = 2 / 100;
                                    level1withdrawl = sum * level1withdrawl;
                                    level1withdrawl = level1withdrawl.toFixed(3);

                                    level2withdrawl = 1 / 100;
                                    level2withdrawl = sum * level2withdrawl;
                                    level2withdrawl = level2withdrawl.toFixed(3);

                                }
                                if (level1 && level2 == '') {
                                    garblTrading = 10 / 100;

                                    garblTrading = sum * garblTrading;
                                    garblTrading = garblTrading.toFixed(3);

                                    level1withdrawl = 2 / 100;
                                    level1withdrawl = sum * level1withdrawl;
                                    level1withdrawl = level1withdrawl.toFixed(3);

                                }

                                if (level1 == '' && level2 == '') {
                                    garblTrading = 12 / 100;
                                    garblTrading = sum * garblTrading;
                                    garblTrading = garblTrading.toFixed(3);
                                }
                                const withdrawlWalletArray = [];
                                const keyValueGarblTrading = { amount: garblTrading, walletaddress: process.env.walletaddressgarbl };
                                const keyValuemichelTrading = { amount: michelTrading, walletaddress: process.env.walletaddressmicl };
                                // const keyValuelevel1withdrawl = { amount: level1withdrawl || '', walletaddress: process.env.walletaddressgarbl };
                                // const keyValuelevel2withdrawl = { amount: level2withdrawl || '', walletaddress: process.env.walletaddressgarbl };

                                withdrawlWalletArray.push(keyValueGarblTrading);
                                withdrawlWalletArray.push(keyValuemichelTrading);
                                // withdrawlWalletArray.push(keyValuelevel1withdrawl);
                                // withdrawlWalletArray.push(keyValuelevel2withdrawl);
                                
                                for (let item in withdrawlWalletArray) {
                                    if (withdrawlWalletArray[item].amount !== '') {
                                        const timestamp = moment().valueOf();
                                        const withdraw = await client.submitWithdrawal({
                                            "coin": "USDT",
                                            "chain": "ETH",
                                            "address": withdrawlWalletArray[item].walletaddress,
                                            "amount": withdrawlWalletArray[item].amount,
                                            "timestamp": timestamp,
                                            "forceChain": 0,
                                            "accountType": "FUND"

                                        });
                                        withdrawData.push(withdraw);
                                    }
                                }
                            
                                // if (withdraw.retMsg == "success") {
                                //     // const orderStatusUpdate = await Orderclose.updateMany(
                                //     //     { orderId: { $in: orderIds } },
                                //     //     { $set: { orderStatus: true } }
                                //     // ).exec();
                                //     withdrawData.push(withdraw);
                                // } else {
                                //     return res.status(200).send({
                                //         success: false,
                                //         data: withdraw
                                //     });
                                // }

                                //  withdrawData.push(orderStatusUpdate);


                            }

                        }
                    }
                    return res.status(200).send({
                        success: true,
                        data: withdrawData
                    });
                }
            }

        }
        return res.status(200).send({
            success: true,
            'message': "Strategy Not found!"
        });
    } catch (e) {
        res.status(400).send(e);
    }
}

/**
 * @api {GET} /api/v1/analytics/subscriber:orderId
 * @apiGroup Orderclose
 * @apiDiscription get subscriber trade
 * @param {*} req 
 * @param {*} res 
 * @param {*} next 
 */
const subscriberTradeList = async (req, res, next) => {
    try {

        if (req.body.position == true) {
            // open position
            const subscriberData = await Orderplace.find({ user: { $ne: req.user.userId }, orderParentId: req.body.orderId, strategies: req.body.strategies }).populate('bybitaccount').populate({
                path: 'user',
                select: '_id username email'
            });
            if (subscriberData.length > 0) {
                subscriberOpenPosition = [];
                for (let item in subscriberData) {
                    const client = new RestClientV5({
                        key: subscriberData[item].bybitaccount.apiKey,
                        secret: subscriberData[item].bybitaccount.secretKey,
                        testnet: process.env.USE_TESTNET
                    },);

                    // get open position
                    const getOpenPosition = await client.getPositionInfo({ category: subscriberData[item].type, baseCoin: 'USDT', symbol: subscriberData[item].symbol, orderId: subscriberData[item].orderId });
                    if (getOpenPosition.retMsg == 'OK') {
                        const subscriberOpenPositon = getOpenPosition.result.list;
                        if (subscriberOpenPositon.length > 0) {
                            const mergesubscriberopenPositionData = Object.assign({}, subscriberData[item].toJSON(), ...subscriberOpenPositon);
                            subscriberOpenPosition.push(mergesubscriberopenPositionData);
                        }
                    }

                }
                // const uniqueArray = uniqBy(analyticOpenPosition, 'symbol');
                return res.status(200).send({
                    success: true,
                    data: subscriberOpenPosition
                });

            }
            return res.status(200).send({
                success: true,
                message: 'Data not found!'
            });

        }

        // closed pnl
        const subscribercloseData = await Orderclose.find({ user: { $ne: req.user.userId }, orderParentId: req.body.orderId, strategies: req.body.strategies }).populate('bybitaccount').populate({
            path: 'user',
            select: '_id username email'
        });
        if (subscribercloseData.length > 0) {
            subscriberClosePosition = [];
            for (let item in subscribercloseData) {
                const client = new RestClientV5({
                    key: subscribercloseData[item].bybitaccount.apiKey,
                    secret: subscribercloseData[item].bybitaccount.secretKey,
                    testnet: process.env.USE_TESTNET
                },);


                // get closed pnl
                const getclosedpnl = await client.getClosedPnL({ category: subscribercloseData[item].type, baseCoin: 'USDT', symbol: subscribercloseData[item].symbol });
                if (getclosedpnl.retMsg == 'OK') {
                    const checksubClosePositon = getclosedpnl.result.list;
                    if (checksubClosePositon.length > 0) {
                        const filters = {
                            orderId: subscribercloseData[item].orderId,
                        };
                        var filteredDatas = filter(checksubClosePositon, filters);
                        if (filteredDatas.length > 0) {
                            const mergeClosesubPositionData = Object.assign({}, subscribercloseData[item].toJSON(), ...filteredDatas);
                            subscriberClosePosition.push(mergeClosesubPositionData);
                        };

                    }
                }

            }
            return res.status(200).send({
                success: true,
                data: subscriberClosePosition
            });

        }
        return res.status(200).send({
            success: true,
            message: 'Data not found!'
        });

    }
    catch (e) {
        res.status(400).send(e);
    }
}



module.exports = { maintradeList, closetradeList, withdrawClosingtrade, subscriberTradeList };