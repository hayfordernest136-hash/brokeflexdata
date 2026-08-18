const express = require('express');
const router = express.Router();
const bundleController = require('../controllers/bundleController');

router.get('/networks', bundleController.getNetworks);
router.get('/', bundleController.getBundles);
router.get('/balance', bundleController.checkBalance);

module.exports = router;
