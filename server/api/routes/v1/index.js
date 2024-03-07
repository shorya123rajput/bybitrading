const express = require('express');
const authRoutes = require('./auth');
const bybitAccount = require('./bybitaccount');
const strategies = require('./strategies');
const copysubscription = require('./copysubscription');
const orderplace = require('./orderplace');
const analytics = require('./analytics');

const router = express.Router();

/**
 * GET v1/status
 */
router.get('/status', (req, res) => res.send('OK'));

// auth routes

router.use('/auth', authRoutes);
router.use('/account', bybitAccount);
router.use('/strategies', strategies);
router.use('/copysubscription', copysubscription);
router.use('/orders', orderplace);
router.use('/analytics', analytics);

module.exports = router;