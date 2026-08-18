const express = require('express');
const router = express.Router();
const orderController = require('../controllers/orderController');

router.post('/', orderController.createOrder);
router.post('/:reference/initiate-payment', orderController.initiatePayment);
router.get('/:reference/verify/:paystackReference', orderController.verifyPayment);
router.get('/:reference', orderController.getOrder);

module.exports = router;
