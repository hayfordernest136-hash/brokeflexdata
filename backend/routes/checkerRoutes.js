const express = require('express');
const router = express.Router();
const checkerController = require('../controllers/checkerController');

router.get('/products', checkerController.getCheckerProducts);
router.post('/orders', checkerController.createCheckerOrder);
router.post('/orders/:reference/initiate-payment', checkerController.initiateCheckerPayment);
router.get('/orders/:reference/verify/:paystackReference', checkerController.verifyCheckerPayment);
router.get('/orders/:reference', checkerController.getCheckerOrder);
router.get('/orders/:reference/status', checkerController.checkCheckerStatus);

module.exports = router;
