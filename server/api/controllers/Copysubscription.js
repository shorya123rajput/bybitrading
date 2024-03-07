const Copysubscription = require('../models/Copysubscription');
const Bybitaccount = require('../models/Bybitaccount');
const Strategies = require('../models/Strategies');
const User = require('../models/User');
const Orderplace = require('../models/OrderPlace')
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
const { map, result } = require('lodash');

/**
 * @api {GET} /api/v1/copysubscription/all-coins
 * @apiGroup Bitbyaccount
 * @apiDiscription get account data
 * @param {*} req 
 * @param {*} res 
 * @param {*} next 
 */


const listCoin = async (req, res, next) => {
    try {
        const strategyList = await Strategies.findOne({ 'user': req.user.userId }).populate('bybitaccount');

        if (strategyList) {
            const client = new RestClientV5({
                key: strategyList.bybitaccount.apiKey,
                secret: strategyList.bybitaccount.secretKey,
                testnet: process.env.USE_TESTNET
            },);

            const getWalletBalance = await client.getTickers({ category: strategyList.type });
            return res.status(200).send({
                success: true,
                data: getWalletBalance.result.list
            })
        }
        return res.status(200).send({
            success: true,
            message: 'Strategy Not found!'
        })
    } catch (e) {
        res.send(e);
    }

}

const getAllorders = async (req, res, next) => {
    try {

        const client = new RestClientV5({
            key: process.env.API_KEY,
            secret: process.env.API_SECRET,
            testnet: process.env.USE_TESTNET
        },);

        const getActiveOrders = await client.getActiveOrders({ category: 'spot', symbol: "BTCUSDT", order_status: 'New', });
        return res.status(200).send({
            success: true,
            message: 'Copysubscription add successfully',
            data: getActiveOrders.result
        })
    } catch (e) {
        res.send(e);
    }
}


/**
 * @api {GET} /api/v1/copysubscription/subscription
 * @apiGroup Copysubscription
 * @apiDiscription get my subscription
 * @param {*} req 
 * @param {*} res 
 * @param {*} next 
 */

const getSubscription = async (req, res, next) => {
    try {

        const copySubscriptionData = await Copysubscription.find({ user: req.user.userId }).populate('strategies');
        if (copySubscriptionData.length > 0) {
            return res.status(200).send({
                success: true,
                data: copySubscriptionData
            });
        }
        return res.status(200).send({
            success: false,
            message: 'Data not found',
        });

    } catch (e) {
        res.status(400).send(e);
    }
}

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
        const checkCopysub = await Copysubscription.findOne({ 'user': req.user.userId, 'subscribeTo': req.body.subscribeTo });
        if (checkCopysub) {
            return res.status(200).send({
                success: true,
                message: 'Already subscribed with this strategy',
            })
        }
        const copysubscription = await Copysubscription.create(req.body);
        if (copysubscription) {
            const strategies = await Strategies.findOne({ bybitaccount: copysubscription.subscribeTo });
            strategies.copysubscription.push(copysubscription.id);
            await strategies.save();

            return res.status(200).send({
                success: true,
                message: 'Copysubscription add successfully',
                data: copysubscription
            })
        }
    } catch (e) {
        res.status(400).send(e);
    }

}

/**
 * @api {POST} /api/v1/copytrading
 * @apiGroup Strategies
 * @apiDiscription add strategy
 * @param {*} req 
 * @param {*} res 
 * @param {*} next 
 */
const copyTrading = async (req, res, next) => {
    try {
        req.body.user = req.user.userId;

        const strategy = await Strategies.findById({ _id: req.body.strategyId }).exec();
        var strategyType = strategy.type;
        // const orderValuePercentage = req.body.orderValue / req.body.orderprice;
        // const orderValue = orderValuePercentage.toFixed(2);
        // var quantity = (req.body.qty !== '') ? req.body.qty : orderValue;

        var orderPriceValue = (req.body.orderType == 'Market') ? '' : req.body.orderprice;
        copysubscriptionData = strategy.copysubscription;

        const bybitaccount = await Bybitaccount.findOne({ '_id': strategy.bybitaccount });
        if (bybitaccount) {
            const client = new RestClientV5({
                key: bybitaccount.apiKey,
                secret: bybitaccount.secretKey,
                testnet: process.env.USE_TESTNET
            },);

            await client.setLeverage({
                category: strategyType,
                symbol: req.body.symbol,
                buyLeverage: req.body.leverage,
                sellLeverage: req.body.leverage
            });


            const getWalletBalanced = await client.getWalletBalance({ accountType: 'UNIFIED', coin: 'USDT' });
            if (getWalletBalanced.retMsg == 'OK') {
                const walletDatas = getWalletBalanced.result.hasOwnProperty('list');
                if (walletDatas == true) {
                    const walletBalances = getWalletBalanced.result.list[0].totalWalletBalance;
                    const riskLimitValues = req.body.riskLimitValue / 100;
                    const percentages = (walletBalances * riskLimitValues) / req.body.orderprice;
                    var decimalValues = percentages.toFixed(2);
                }

                var result = await client.submitOrder({
                    category: strategyType,
                    symbol: req.body.symbol,
                    side: req.body.side,
                    orderType: req.body.orderType,
                    qty: decimalValues,
                    //qty: quantity,
                    price: orderPriceValue,
                    isLeverage: 1,
                    stopLoss: req.body.stopLoss,
                    takeProfit: req.body.takeProfit,
                });

                if (result.retMsg == 'OK') {
                    const order = new Orderplace({
                        orderId: result.result.orderId,
                        orderParentId: result.result.orderId,
                        strategies: strategy.id,
                        user: strategy.user,
                        type: strategyType,
                        symbol: req.body.symbol,
                        bybitaccount: strategy.bybitaccount,
                        copysubscription: ''
                    });
                    var orderData = await order.save();

                }
            }
        }
        if (copysubscriptionData.length > 0) {
            for (let item in copysubscriptionData) {
                const copysub = await Copysubscription.findOne({ _id: copysubscriptionData[item] });
                if (copysub) {
                    const accountDatas = await Bybitaccount.findOne({ '_id': copysub.subscribeFrom });
                    if (accountDatas) {
                        const client = new RestClientV5({
                            key: accountDatas.apiKey,
                            secret: accountDatas.secretKey,
                            testnet: process.env.USE_TESTNET
                        },);

                        await client.setLeverage({
                            category: strategyType,
                            symbol: req.body.symbol,
                            buyLeverage: req.body.leverage,
                            sellLeverage: req.body.leverage
                        });

                        const getWalletBalance = await client.getWalletBalance({ accountType: 'UNIFIED', coin: 'USDT' });
                        if (getWalletBalance.retMsg == 'OK') {
                            const walletData = getWalletBalance.result.hasOwnProperty('list')
                            if (walletData == true) {
                                const walletBalance = getWalletBalance.result.list[0].totalWalletBalance;
                                const checkRisklimitValue = req.body.riskLimitValue;
                                if (checkRisklimitValue <= strategy.riskLimitValue) {
                                    var riskLimitValueCheck = checkRisklimitValue;
                                } else {
                                    var riskLimitValueCheck = strategy.riskLimitValue;
                                }
                                const riskLimitValue = riskLimitValueCheck / 100;
                                const percentage = (walletBalance * riskLimitValue) / req.body.orderprice;
                                var decimalValue = percentage.toFixed(2);
                            }

                            const resultd = await client.submitOrder({
                                category: strategyType,
                                symbol: req.body.symbol,
                                side: req.body.side,
                                orderType: req.body.orderType,
                                qty: decimalValue,
                                price: orderPriceValue,
                                isLeverage: 1,
                                stopLoss: req.body.stopLoss,
                                takeProfit: req.body.takeProfit,
                            });
                            if (resultd.retMsg == 'OK') {
                                const order = new Orderplace({
                                    orderId: resultd.result.orderId,
                                    orderParentId: orderData.orderId,
                                    strategies: strategy.id,
                                    user: accountDatas.user,
                                    type: strategyType,
                                    symbol: req.body.symbol,
                                    bybitaccount: accountDatas.id,
                                    copysubscription: copysub.id
                                });
                                order.save();
                            }
                        }
                    }
                }

            }
        }
        return res.status(200).send({
            success: true,
            message: result.retMsg,
            data: result
        })

    } catch (e) {
        res.status(400).send(e);
    }

}

/**
 * @api {POST} /api/v1/placeorder
 * @apiGroup Strategies
 * @apiDiscription add strategy
 * @param {*} req 
 * @param {*} res 
 * @param {*} next 
 */
const placeOrder = async (req, res, next) => {
    try {
        req.body.user = req.user.userId;

        const strategy = await Strategies.findById({ _id: req.body.strategyId }).exec();
        var strategyType = strategy.type;

        var orderPriceValue = (req.body.orderType == 'Market') ? '' : req.body.orderprice;
        copysubscriptionIds = strategy.copysubscription;

        const bybitaccount = await Bybitaccount.findOne({ '_id': strategy.bybitaccount });

        if (bybitaccount) {
            const client = new RestClientV5({
                key: bybitaccount.apiKey,
                secret: bybitaccount.secretKey,
                testnet: process.env.USE_TESTNET
            },);

            await client.setLeverage({
                category: strategyType,
                symbol: req.body.symbol,
                buyLeverage: req.body.leverage,
                sellLeverage: req.body.leverage
            });

            const getWalletBalanced = await client.getWalletBalance({ accountType: 'UNIFIED', coin: 'USDT' });
            if (getWalletBalanced.retMsg == 'OK') {
                const walletDatas = getWalletBalanced.result.hasOwnProperty('list');
                if (walletDatas == true) {
                    const walletBalances = getWalletBalanced.result.list[0].totalWalletBalance;
                    const riskLimitValues = req.body.riskLimitValue / 100;
                    const percentages = (walletBalances * riskLimitValues) / req.body.orderprice;
                    var decimalValues = percentages.toFixed(2);
                }

                var result = await client.submitOrder({
                    category: strategyType,
                    symbol: req.body.symbol,
                    side: req.body.side,
                    orderType: req.body.orderType,
                    qty: req.body.quantity,
                    price: orderPriceValue,
                    //  isLeverage: 1,
                    stopLoss: req.body.stopLoss,
                    takeProfit: req.body.takeProfit,
                });

                if (result.retMsg == 'OK') {
                    const order = new Orderplace({
                        orderId: result.result.orderId,
                        orderParentId: result.result.orderId,
                        strategies: strategy.id,
                        user: strategy.user,
                        type: strategyType,
                        symbol: req.body.symbol,
                        bybitaccount: strategy.bybitaccount,
                    });
                    var orderData = await order.save();

                } else {
                    return res.status(200).send({
                        success: false,
                        data: result
                    })
                }
            }
        }


        const copysubscriptionData = await Copysubscription.find({ _id: { $in: copysubscriptionIds } });
        if (copysubscriptionData.length > 0) {
            var copysubsIds = map(copysubscriptionData, 'subscribeFrom');
            var bybitAccountData = await Bybitaccount.find({ _id: { $in: copysubsIds } });
            let userApiKeys = map(bybitAccountData, 'apiKey');
            let userApiSecrets = map(bybitAccountData, 'secretKey');
            let userdata = map(bybitAccountData, 'user');
            let bybitAccoundId = map(bybitAccountData, '_id');
            let orderDetails = {
                strategyType: strategyType,
                body: req.body,
                riskLimitValue: strategy.riskLimitValue,
                orderData: orderData,
                strategies: strategy.id,
                orderPriceValue: orderPriceValue
            };
            let promises = [];
            if (orderData.orderId) {

                for (let i = 0; i < userApiKeys.length; i++) {
                    promises.push(bybitPlaceOrder(userApiKeys[i], userApiSecrets[i], userdata[i], bybitAccoundId[i], orderDetails));
                }
            }
            Promise.all(promises)
                .then(results => {
                    console.log(results);
                     res.status(200).send({
                        success: true,
                        data: results
                    })
                })
                .catch(error => {
                    console.error(error);
                     res.status(200).send({
                        success: true,
                        data: error
                    })
                })
        }
        // return res.status(200).send({
        //     success: true,
        //     data: result
        // })
    } catch (e) {
        res.status(400).send(e);
    }
}

// place order function
function bybitPlaceOrder(apiKey, apiSecret, user, bybitAccoundId, orderDetails) {
    const client = new RestClientV5({
        key: apiKey,
        secret: apiSecret,
        testnet: process.env.USE_TESTNET
    },);
    return new Promise((resolve) => {
        client.setLeverage({
            category: orderDetails.strategyType,
            symbol: orderDetails.body.symbol,
            buyLeverage: orderDetails.body.leverage,
            sellLeverage: orderDetails.body.leverage
        }).then(result => {
            console.log("getAccountInfo result: ", result);
        }).catch(err => {
            console.error("getAccountInfo error: ", err);
        });

        client.getWalletBalance({
            accountType: 'UNIFIED',
            coin: 'USDT'
        }).then(getWalletBalance => {
            const walletData = getWalletBalance.result.hasOwnProperty('list');

            if (walletData == true) {
                var usdtAmount = getWalletBalance.result.list;
                for (let item in usdtAmount) {
                    var usdtBalance = usdtAmount[item].coin;
                }
                client.getTickers({
                    category: orderDetails.strategyType,
                    symbol: orderDetails.body.symbol

                }).then(CoinBalance => {
                    const CoinBal = CoinBalance.result.hasOwnProperty('list');
                    if (CoinBal == true) {
                        var CoinBalanceRecord = CoinBalance.result.list[0].markPrice;

                    }
                    // const usdtWalletBal = parseInt(usdtBalance[0].walletBalance);
                    var usdtWalletBal = parseFloat(usdtAmount[0].totalAvailableBalance);
                    var CoinBalance = CoinBalanceRecord;

                    var walletBalance = usdtWalletBal;
                    console.log(walletBalance);
                    let positionsize = orderDetails.body.positionsize / 100;
                    let newwallet = (walletBalance * positionsize).toFixed(4);

                    // let newwallet = walletBalance * (orderDetails.body.positionsize / 100);

                    //Step 1 Let's say I am willing to risk 10% of the wallet balance: $145 * 10 % = $14.50
                    // let ntotal = (newwallet * (orderDetails.body.riskLimitValue / 100))
                    // let ntotalFixed = ntotal.toFixed(2);

                    //Step two 2. With 10x Leverage. We can control the position of $145*10 = $1450.
                    let leveraged = newwallet * orderDetails.body.leverage;

                    var cointp = leveraged / CoinBalance;

                    client.getInstrumentsInfo({
                        category: orderDetails.strategyType,
                        symbol: orderDetails.body.symbol

                    }).then(getInstruments => {
                        let instruments = getInstruments.result.list[0].lotSizeFilter;
                        let minQuantity = instruments.minOrderQty;
                        let decimalCount = minQuantity.toString().split('.')[1]?.length || 0;
                        const tradeUnit = cointp.toFixed(decimalCount);

                        const tradeUnitNumber = parseInt(tradeUnit);
                        const minOrderQtyNumber = parseInt(instruments.minOrderQty);
                        const maxOrderQtyNumber = parseInt(instruments.maxOrderQty);
                        if (tradeUnitNumber >= minOrderQtyNumber && tradeUnitNumber <= maxOrderQtyNumber) {

                            client.submitOrder({
                                category: orderDetails.strategyType,
                                symbol: orderDetails.body.symbol,
                                side: orderDetails.body.side,
                                orderType: orderDetails.body.orderType,
                                // qty: decimalValue,
                                qty: tradeUnit,
                                price: orderDetails.orderPriceValue,
                                // isLeverage: 1,
                                stopLoss: orderDetails.body.stopLoss,
                                takeProfit: orderDetails.body.takeProfit,
                            }).then(resultd => {
                                resolve(resultd);
                                const order = new Orderplace({
                                    orderId: resultd.result.orderId,
                                    orderParentId: orderDetails.orderData.orderId,
                                    strategies: orderDetails.strategies,
                                    user: user,
                                    type: orderDetails.strategyType,
                                    symbol: orderDetails.body.symbol,
                                    bybitaccount: bybitAccoundId,
                                    //copysubscription: copysub.id
                                });
                                order.save();

                            }).catch(err => {
                                console.error("submit error: ", err);
                                resolve(err);
                            });

                        }


                    });

                    // var diffrencePrice = ntotalFixed / tradeUnit;
                    // if (orderDetails.body.side == 'Buy') {
                    //     const stpdiff = CoinBalance - diffrencePrice;
                    //     const stoplossFixed = parseInt(stpdiff).toFixed(2);
                    //     orderDetails.body.stopLoss = stoplossFixed;
                    // } else {
                    //     const stpdiff = CoinBalance + diffrencePrice;
                    //     const stoplossFixed = parseInt(stpdiff).toFixed(2);
                    //     orderDetails.body.stopLoss = stoplossFixed;
                    // }

                });
            }
        }).catch(err => {
            console.error("getAccountInfo error: ", err);
        });
    });
}



/**
 * @api {POST} /api/v1/leverage
 * @apiGroup Strategies
 * @apiDiscription add strategy
 * @param {*} req 
 * @param {*} res 
 * @param {*} next 
 */
const leverage = async (req, res, next) => {
    try {

        const strategy = await Strategies.findById({ _id: req.body.strategyId, user: req.user.userId }).populate('bybitaccount').select('type user bybitaccount riskLimitValue');

        if (strategy) {
            const client = new RestClientV5({
                key: strategy.bybitaccount.apiKey,
                secret: strategy.bybitaccount.secretKey,
                testnet: process.env.USE_TESTNET
            },);
            const getWalletBal = await client.getWalletBalance({ accountType: 'UNIFIED', coin: 'USDT' });
            const walletRecord = getWalletBal.result.hasOwnProperty('list');
            if (walletRecord == true) {
                const usdtAmount = getWalletBal.result.list;
                for (let item in usdtAmount) {
                    var usdtBalance = usdtAmount[item].coin;
                }

                const CoinBalance = await client.getTickers({
                    category: strategy.type,
                    symbol: req.body.symbol

                });
                const CoinBal = CoinBalance.result.hasOwnProperty('list');
                if (CoinBal == true) {
                    const CoinBalanceRecord = CoinBalance.result.list[0].markPrice;

                    const getInstruments = await client.getInstrumentsInfo({
                        category: strategy.type,
                        symbol: req.body.symbol

                    });
                    return res.status(200).send({
                        success: true,
                        // usdtWalletBal: usdtBalance[0].walletBalance,
                        usdtWalletBal: usdtAmount[0].totalAvailableBalance,
                        CoinBalance: CoinBalanceRecord,
                        getInstruments: getInstruments.result.list[0].lotSizeFilter,
                        getWalletBal: getWalletBal

                    })
                }

            }
        }
        return res.status(200).send({
            success: true,
            message: 'Strategy not found!'
        })
    } catch (e) {
        res.status(400).send(e);
    }
}


module.exports = { add, copyTrading, listCoin, getAllorders, getSubscription, placeOrder, leverage };