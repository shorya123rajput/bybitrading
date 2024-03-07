const Strategies = require('../models/Strategies');
const User = require('../models/User');
const Orderplace = require('../models/OrderPlace');
const Orderclose = require('../models/OrderClose');
const Bybitaccount = require('../models/Bybitaccount');
const Copysubscription = require('../models/Copysubscription');
const { omit, pick, map, intersectionWith, intersectionBy, differenceBy, uniqBy, filter, get } = require('lodash');
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
 * @api {GET} /api/v1/orders/current
 * @apiGroup Orderplace
 * @apiDiscription get orders
 * @param {*} req 
 * @param {*} res 
 * @param {*} next 
 */
const orderCurrentList = async (req, res, next) => {
    try {
        const param = { user: req.user.userId };
        const result = await Orderplace.find(param).populate('bybitaccount');
        if (result.length > 0) {
            orderCurrent = [];
            for (let item in result) {
                const mergeData = await currentOrderBybitaccount(result[item]);
                if (mergeData.orderStatus == "New") {
                    orderCurrent.push(mergeData);
                }

            }
            return res.status(200).send({
                success: true,
                data: orderCurrent
            });
        }
        return res.status(200).send({
            success: true,
            message: "Data not found!"
        });
    }
    catch (e) {
        res.status(400).send(e);
    }
}

// bybit account get current order data
async function currentOrderBybitaccount(result) {
    const client = new RestClientV5({
        key: result.bybitaccount.apiKey,
        secret: result.bybitaccount.secretKey,
        testnet: process.env.USE_TESTNET
    },);

    const getActiveOrders = await client.getActiveOrders({ category: result.type, symbol: result.symbol, orderId: result.orderId });
    if (getActiveOrders.retMsg == 'OK') {
        const mergeData = Object.assign({}, result.toJSON(), ...getActiveOrders.result.list);
        return mergeData;
    }
}

/**
 * @api {GET} /api/v1/orders/position
 * @apiGroup Orderplace
 * @apiDiscription get orders postion
 * @param {*} req 
 * @param {*} res 
 * @param {*} next 
 */
const orderPositionList = async (req, res, next) => {
    try {
        const param = { user: req.user.userId };
        const resultOrder = await Orderplace.find(param).populate('bybitaccount')
        resultOrder.sort((a, b) => (a.symbol > b.symbol ? 1 : -1));
        const result = uniqBy(resultOrder, 'symbol');
        if (result.length > 0) {
            orderPosition = [];
            orderCurrentData = [];
            mergeTwoapiData = [];
            for (let item in result) {
                // const getPositionOrders = await positionOrderBybitaccount(result[item]);
                const client = new RestClientV5({
                    key: result[item].bybitaccount.apiKey,
                    secret: result[item].bybitaccount.secretKey,
                    testnet: process.env.USE_TESTNET
                },);

                // check position
                const getPositionOrders = await client.getPositionInfo({ category: result[item].type, baseCoin: 'USDT', symbol: result[item].symbol, orderId: result[item].orderId });
                if (getPositionOrders.retMsg == 'OK') {
                    const checkPositonOrder = getPositionOrders.result.list;
                    if (checkPositonOrder.length > 0) {
                        const mergePositionData = Object.assign({}, result[item].toJSON(), ...checkPositonOrder);
                        orderPosition.push(mergePositionData);
                    }
                }
            }
            const filteredDataposition = filter(orderPosition, (obj) => {
                return obj.size !== "0";
            });
            return res.status(200).send({
                success: true,
                data: filteredDataposition
            });
        }
        return res.status(200).send({
            success: true,
            message: "Data not found!"
        });
    }
    catch (e) {
        res.status(400).send(e);
    }
}


/**
 * @api {GET} /api/v1/orders/history
 * @apiGroup Orderplace
 * @apiDiscription get orders history
 * @param {*} req 
 * @param {*} res 
 * @param {*} next 
 */
const orderHistoryList = async (req, res, next) => {
    try {
        const param = { user: req.user.userId };
        const result = await Orderplace.find(param).populate('bybitaccount');
        if (result.length > 0) {
            orderHistory = [];
            for (let item in result) {
                const mergeData = await historyOrderBybitaccount(result[item]);
                orderHistory.push(mergeData);
            }
            return res.status(200).send({
                success: true,
                data: orderHistory
            });
        }
        return res.status(200).send({
            success: true,
            message: "Data not found!"
        });
    }
    catch (e) {
        res.status(400).send(e);
    }
}

// bybit account get position order data
async function historyOrderBybitaccount(result) {
    const client = new RestClientV5({
        key: result.bybitaccount.apiKey,
        secret: result.bybitaccount.secretKey,
        testnet: process.env.USE_TESTNET
    },);

    const getActiveOrders = await client.getHistoricOrders({ category: result.type, symbol: result.symbol, orderId: result.orderId });
    if (getActiveOrders.retMsg == 'OK') {
        const mergeData = Object.assign({}, result.toJSON(), ...getActiveOrders.result.list);
        return mergeData;
    }
}
/**
 * @api {POST} /api/v1/orders/cancel
 * @apiGroup Orderplace
 * @apiDiscription order cancel
 * @param {*} req 
 * @param {*} res 
 * @param {*} next 
 */
const orderCancel = async (req, res, next) => {
    try {
        const checkOrder = await Orderplace.findOne({ 'user': req.user.userId, 'orderId': req.body.orderId, 'strategies': req.body.strategies });
        if (checkOrder) {
            const resultDatas = await Orderplace.find({ 'orderParentId': checkOrder.orderId, 'strategies': checkOrder.strategies }).populate('bybitaccount');
            if (resultDatas.length > 0) {
                let cuserApiKeys = map(resultDatas, obj => get(obj, 'bybitaccount.apiKey'));
                let cuserApiSecrets = map(resultDatas, obj => get(obj, 'bybitaccount.secretKey'));
                let promisesCancel = [];
                for (let i = 0; i < cuserApiKeys.length; i++) {
                    promisesCancel.push(bybitPlaceCurrentOrderCancel(cuserApiKeys[i], cuserApiSecrets[i], resultDatas[i]));
                }

                Promise.all(promisesCancel)
                    .then(results => {
                        let cancelOrderids = map(results, obj => get(obj, 'result.orderId'));
                        Orderplace.deleteMany({ orderId: { $in: cancelOrderids } }).exec();
                        return res.status(200).send({
                            success: true,
                            message: 'Order cancel',
                            data: results
                        });
                    })
                    .catch(error => {
                        return res.status(200).send({
                            success: false,
                            error: error
                        });
                    });
            }
        }

    } catch (e) {
        res.status(400).send(e);
    }

}

// Bybit cance order 
function bybitPlaceCurrentOrderCancel(apiKey, apiSecret, result) {
    const client = new RestClientV5({
        key: apiKey,
        secret: apiSecret,
        testnet: process.env.USE_TESTNET
    },);
    return new Promise((resolve) => {
        const value = client.cancelOrder({ category: result.type, symbol: result.symbol, orderId: result.orderId });
        resolve(value);
    });
}

/**
 * @api {PUT} /api/v1/orders/edit
 * @apiGroup Orderplace
 * @apiDiscription order edit
 * @param {*} req 
 * @param {*} res 
 * @param {*} next 
 */
const orderEdit = async (req, res, next) => {
    try {
        const checkOrder = await Orderplace.findOne({ 'user': req.user.userId, 'orderId': req.body.orderId, 'strategies': req.body.strategies });
        if (checkOrder) {
            const orderData = await Orderplace.find({ 'orderParentId': checkOrder.orderId, 'strategies': checkOrder.strategies }).populate('bybitaccount');
            if (orderData.length > 0) {
                let userApiKeys = map(orderData, obj => get(obj, 'bybitaccount.apiKey'));
                let userApiSecrets = map(orderData, obj => get(obj, 'bybitaccount.secretKey'));
                let bodyData = req.body;
                let promises = [];
                for (let i = 0; i < userApiKeys.length; i++) {
                    promises.push(bybitPlaceOrderEdit(userApiKeys[i], userApiSecrets[i], orderData[i], bodyData));
                }
                Promise.all(promises)
                    .then(results => {
                        console.log(results);
                        return res.status(200).send({
                            success: true,
                            data: results
                        });
                    })
                    .catch(error => {
                        return res.status(200).send({
                            success: false,
                            error: error
                        });
                    });
            }
        }

    } catch (e) {
        res.status(400).send(e);
    }
}
// current place order edit function
function bybitPlaceOrderEdit(apiKey, apiSecret, result, body) {
    const client = new RestClientV5({
        key: apiKey,
        secret: apiSecret,
        testnet: process.env.USE_TESTNET
    },);
    const priceCheck = body.hasOwnProperty('price');
    if (priceCheck == true) {
        var amendData = {
            category: result.type,
            symbol: result.symbol,
            orderId: result.orderId,
            price: body.price,
        }
    } else {
        var amendData = {
            category: result.type,
            symbol: result.symbol,
            orderId: result.orderId,
            price: body.price,
            takeProfit: body.takeProfit,
            stopLoss: body.stopLoss,
            tpTriggerBy: "MarkPrice",
            slTriggerBy: "MarkPrice",
        }
    }

    return new Promise((resolve) => {
        const value = client.amendOrder(amendData)
        resolve(value);
    });
}

/**
 * @api {PUT} /api/v1/orders/position/edit
 * @apiGroup Orderplace
 * @apiDiscription order position edit
 * @param {*} req 
 * @param {*} res 
 * @param {*} next 
 */
const orderPositionEdit = async (req, res, next) => {
    try {
        const checkOrder = await Orderplace.findOne({ 'user': req.user.userId, 'orderId': req.body.orderId, 'strategies': req.body.strategies });
        if (checkOrder) {
            const orderPData = await Orderplace.find({ 'orderParentId': checkOrder.orderId, 'strategies': checkOrder.strategies }).populate('bybitaccount');
            if (orderPData.length > 0) {
                let puserApiKeys = map(orderPData, obj => get(obj, 'bybitaccount.apiKey'));
                let puserApiSecrets = map(orderPData, obj => get(obj, 'bybitaccount.secretKey'));
                let bodyData = req.body;
                let promisesPosition = [];
                for (let i = 0; i < puserApiKeys.length; i++) {
                    promisesPosition.push(bybitPlaceOrderPositionEdit(puserApiKeys[i], puserApiSecrets[i], orderPData[i], bodyData));
                }
                Promise.all(promisesPosition)
                    .then(results => {
                        return res.status(200).send({
                            success: true,
                            data: results
                        });
                    })
                    .catch(error => {
                        return res.status(200).send({
                            success: false,
                            error: error
                        });
                    });
            }

        }
    } catch (e) {
        res.status(400).send(e);
    }
}


// Bybit order edit
function bybitPlaceOrderPositionEdit(apiKey, apiSecret, result, body) {
    const client = new RestClientV5({
        key: apiKey,
        secret: apiSecret,
        testnet: process.env.USE_TESTNET
    },);

    return new Promise((resolve) => {
        const value = client.setTradingStop({
            category: result.type,
            symbol: result.symbol,
            orderId: result.orderId,
            takeProfit: body.takeProfit,
            stopLoss: body.stopLoss,
            positionIdx: body.positionIdx
        });
        resolve(value);
    });
}

/**
 * @api {PUT} /api/v1/orders/position/edit
 * @apiGroup Orderplace
 * @apiDiscription order position edit
 * @param {*} req 
 * @param {*} res 
 * @param {*} next 
 */
const orderPositionClose = async (req, res, next) => {
    try {
        const checkOrder = await Orderplace.findOne({ 'user': req.user.userId, 'orderId': req.body.orderId, 'strategies': req.body.strategies });
        if (checkOrder) {
            const orderCData = await Orderplace.find({ 'orderParentId': checkOrder.orderId, 'strategies': checkOrder.strategies }).populate('bybitaccount');
            // order id and parent id matched
            const OrderAndParentEqual = filter(orderCData, ({ orderId, orderParentId }) => orderId === orderParentId);
            for (let item in OrderAndParentEqual) {
                var orderPositionClose = await orderPositionCloseBybit(OrderAndParentEqual[item], req.body);
                if (orderPositionClose.retMsg == 'OK') {
                    const orderClosed = new Orderclose({
                        orderId: orderPositionClose.result.orderId,
                        orderParentId: orderPositionClose.result.orderId,
                        strategies: OrderAndParentEqual[item].strategies,
                        user: OrderAndParentEqual[item].user,
                        type: OrderAndParentEqual[item].type,
                        symbol: OrderAndParentEqual[item].symbol,
                        ordercreatedTime: req.body.ordercreatedTime,
                       
                        bybitaccount: OrderAndParentEqual[item].bybitaccount,
                    });
                    var orderclosedData = await orderClosed.save();
                }
            }
            // order id and parent id not matched (subscriber data)
            const OrderAndParentNotEqual = filter(orderCData, ({ orderId, orderParentId }) => orderId !== orderParentId);
            if (OrderAndParentNotEqual.length > 0) {
                let positioncloseuserApiKeys = map(OrderAndParentNotEqual, obj => get(obj, 'bybitaccount.apiKey'));
                let positioncloseuserApiSecrets = map(OrderAndParentNotEqual, obj => get(obj, 'bybitaccount.secretKey'));
                let bodyData = req.body;
                let promisesPositionclose = [];
                if (orderclosedData.orderId) {
                    for (let i = 0; i < positioncloseuserApiKeys.length; i++) {
                        promisesPositionclose.push(bybitPlaceOrderPositionClosedSubsriber(positioncloseuserApiKeys[i], positioncloseuserApiSecrets[i], OrderAndParentNotEqual[i], bodyData, orderclosedData));
                    }
                }
                Promise.all(promisesPositionclose)
                    .then(results => {
                        return res.status(200).send({
                            success: true,
                            data: results
                        });
                    })
                    .catch(error => {
                        return res.status(200).send({
                            success: false,
                            error: error
                        });
                    });
            }
         
            return res.status(200).send({
                success: true,
                data: orderPositionClose
            })
        }
    } catch (e) {
        res.status(400).send(e);
    }
}

// Bybit order edit
async function orderPositionCloseBybit(result, body) {
    const client = new RestClientV5({
        key: result.bybitaccount.apiKey,
        secret: result.bybitaccount.secretKey,
        testnet: process.env.USE_TESTNET
    },);

    // check position
    const getPositionOrders = await client.getPositionInfo({ category: result.type, baseCoin: 'USDT', symbol: result.symbol, orderId: result.orderId });
    if (getPositionOrders.retMsg == 'OK') {
        const checkPositonOrder = getPositionOrders.result.list;
        if (checkPositonOrder.length > 0) {
            const apiqty = checkPositonOrder[0].size;
            const qty = (apiqty * body.qty) / 100;
            const fixedQty = qty.toFixed(3);

            var side = body.side == 'Buy' ? 'Sell' : 'Buy';

            const getEditPositionOrders = await client.submitOrder({
                category: result.type,
                symbol: result.symbol,
                orderId: result.orderId,
                side: side,
                orderType: body.orderType,
                qty: fixedQty,
                price: body.price,
            });
            //if (getEditPositionOrders.retMsg == 'OK') {
                return getEditPositionOrders;
           // }
        }
    }
}

// Bybit order edit
function bybitPlaceOrderPositionClosedSubsriber(apiKey, apiSecret, result, body, orderclosedData) {
    const client = new RestClientV5({
        key: apiKey,
        secret: apiSecret,
        testnet: process.env.USE_TESTNET
    },);
    return new Promise((resolve) => {
        client.getPositionInfo({
            category: result.type,
            baseCoin: 'USDT',
            symbol: result.symbol,
            orderId: result.orderId
        }).then(getPositionOrders => {
            const checkPositonOrder = getPositionOrders.result.list;
            if (checkPositonOrder.length > 0) {
                const apiqty = checkPositonOrder[0].size;
                const qty = (apiqty * body.qty) / 100;
                const fixedQty = qty.toFixed(3);
                var side = body.side == 'Buy' ? 'Sell' : 'Buy';
                client.submitOrder({
                    category: result.type,
                    symbol: result.symbol,
                    orderId: result.orderId,
                    side: side,
                    orderType: body.orderType,
                    qty: fixedQty,
                    price: body.price,
                }).then(getEditPositionOrders => {
                    const orderClosed = new Orderclose({
                        orderId: getEditPositionOrders.result.orderId,
                        orderParentId: orderclosedData.orderId,
                        strategies: result.strategies,
                        user: result.user,
                        type: result.type,
                        symbol: result.symbol,
                        ordercreatedTime: body.ordercreatedTime,
                      
                        bybitaccount: result.bybitaccount,
                    });
                    orderClosed.save();
                    resolve(getEditPositionOrders);

                }).catch(err => {
                    console.error("getAccountInfo error: ", err);
                });
            }
        }).catch(err => {
            console.error("getAccountInfo error: ", err);
        })
    });
}

module.exports = { orderCurrentList, orderPositionList, orderHistoryList, orderCancel, orderEdit, orderPositionEdit, orderPositionClose };