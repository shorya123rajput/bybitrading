const Bybitaccount = require("../models/Bybitaccount"); // import user model
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
const { omitArr, pickArr } = require("../helpers/commonHelper");
const { omit, pick, map, concat, merge } = require('lodash');
const Copysubscription = require("../models/Copysubscription");
require("dotenv").config();

/**
 * @api {POST} /api/v1/account/add-account
 * @apiGroup Bybitaccount
 * @apiDiscription add account
 * @param {*} req 
 * @param {*} res 
 * @param {*} next 
 */
const addAccount = async (req, res, next) => {
  try {
    const client = new RestClientV5({
      key: req.body.apiKey,
      secret: req.body.secretKey,
      testnet: process.env.USE_TESTNET
    },);

    const getApiInfo = await client.getQueryApiKey();


    const checkReadOnly = getApiInfo.result.readOnly;
    const checkUta = getApiInfo.result.uta;
    const checkIps = getApiInfo.result.ips;

    if (checkReadOnly == 1) {
      return res.status(200).send({
        success: true,
        message: "Api key has not Read-Write data permission!",
      });
    }

    if (checkUta == 0) {
      return res.status(200).send({
        success: false,
        message: "Account upgrade to unified trade account!",
      });
    }

    const getWalletBalance = await client.getWalletBalance({ accountType: 'UNIFIED', coin: 'USDT' });
    const walletData = getWalletBalance.result.hasOwnProperty('list');

    if (walletData == true) {
      req.body.user = req.user.userId;
      req.body.balance = getWalletBalance.result.list[0].totalWalletBalance;
      const bybitaccount = await Bybitaccount.create(req.body);
      if (bybitaccount) {
        const user = await User.findById({ _id: req.user.userId });
        user.bybitaccount.push(bybitaccount.id);
        await user.save();
        return res.status(200).send({
          success: true,
          message: "Account add successfully",
          data: bybitaccount
        })
      }
    }
    return res.send({
      success: false,
      message: getWalletBalance
    });

  } catch (e) {
    res.send({
      success: false,
      message: e.message
    });
  }
};

/**
 * @api {GET} /api/v1/account/list
 * @apiGroup Bitbyaccount
 * @apiDiscription get account data
 * @param {*} req 
 * @param {*} res 
 * @param {*} next 
 */
const listAccount = async (req, res, next) => {
  try {
    const userData = await User.findById(req.user.userId).populate('bybitaccount').populate('strategies');
    return res.status(200).send({
      success: true,
      data: userData
    });

  } catch (e) {
    res.send(e);
  }

}

/**
 * @api {GET} /api/v1/account/api-data
 * @apiGroup Bitbyaccount
 * @apiDiscription get account api data
 * @param {*} req 
 * @param {*} res 
 * @param {*} next 
 */
const apiAccountdata = async (req, res, next) => {
  try {
    const accountData = await Bybitaccount.find({ 'user': req.user.userId });
    let walletData = [];
    let TotalBalance = [];
    if (accountData.length > 0) {
      for (let item in accountData) {
        const client = new RestClientV5({
          key: accountData[item].apiKey,
          secret: accountData[item].secretKey,
          testnet: process.env.USE_TESTNET
        },);
        try {
          const getWalletBalance = await client.getWalletBalance({ accountType: 'UNIFIED', coin: 'USDT' });
          if (getWalletBalance.retMsg == 'OK') {
            const result = Object.assign({}, accountData[item].toJSON(), ...getWalletBalance.result.list);
            walletData.push(result);
          }

          const getTotalBalance = await client.getWalletBalance({ accountType: 'UNIFIED' });
          if (getTotalBalance.retMsg == 'OK') {
            const totalBalanceData = getTotalBalance.result.list;
            TotalBalance.push(totalBalanceData);
          }
        } catch (e) {
          const data = accountData[item];
          walletData.push(data);

        }
      }
      return res.status(200).send({
        success: true,
        data: walletData,
        total: TotalBalance[0]
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
 * @api {PUT} /api/v1/bybitaccount/edit
 * @apiGroup Bybitaccount
 * @apiDiscription edit bybit data
 * @param {*} req 
 * @param {*} res 
 * @param {*} next 
 */
const updateBybitaccount = async (req, res, next) => {
  try {
    const bybitaccountData = await Bybitaccount.findOne({ '_id': req.body.bybitId, 'user': req.user.userId });
    if (bybitaccountData) {
      const client = new RestClientV5({
        key: req.body.apiKey,
        secret: req.body.secretKey,
        testnet: process.env.USE_TESTNET
      },);

      const getApiInfo = await client.getQueryApiKey();

      const checkReadOnly = getApiInfo.result.readOnly;
      const checkUta = getApiInfo.result.uta;

      if (checkReadOnly == 1) {
        return res.status(200).send({
          success: true,
          message: "Api key has not Read-Write data permission!",
        });
      }

      if (checkUta == 0) {
        return res.status(200).send({
          success: false,
          message: "Account upgrade to unified trade account!",
        });
      }

      const getWalletBalance = await client.getWalletBalance({ accountType: 'UNIFIED', coin: 'USDT' });
      const walletData = getWalletBalance.result.hasOwnProperty('list');
      if (walletData == true) {
        req.body.balance = getWalletBalance.result.list[0].totalWalletBalance;
        const updateData = await Bybitaccount.findOneAndUpdate({ _id: req.body.bybitId }, req.body, { new: true });
        return res.status(200).send({
          success: true,
          message: "Account update successfully!",
          data: updateData
        });
      }
    }

  } catch (e) {
    res.send({
      success: false,
      message: e.message
    });
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
const deleteBybitaccount = async (req, res, next) => {
  try {
    const bybitaccountData = await Bybitaccount.findOne({ '_id': req.params.bybitaccountId, 'user': req.user.userId });
    if (bybitaccountData) {
      const copyData = await Copysubscription.find({
        $or: [
          { subscribeFrom: bybitaccountData.id },
          { subscribeTo: bybitaccountData.id }
        ]
      });
      if (copyData.length == 0) {
        const userstrategyUpdate = await User.findByIdAndUpdate(req.user.userId, { $pull: { bybitaccount: bybitaccountData.id } });
        const bybitAccountDelete = await Bybitaccount.deleteOne({ '_id': bybitaccountData.id });
        return res.status(200).send({
          success: true,
          data: bybitAccountDelete,
        });
      }
      return res.status(200).send({
        success: true,
        message: "This account connected with strategy!"
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


module.exports = { addAccount, listAccount, apiAccountdata, updateBybitaccount, deleteBybitaccount };
