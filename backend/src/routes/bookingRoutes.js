const express = require('express');
const router = express.Router();
const { lockSeat } = require('../controllers/bookingController');
const { protect } = require('../middlewares/authMiddleware');
const { confirmBooking , getMyTickets} = require('../controllers/bookingController');
// Protect ensures req.user is populated via JWT
router.post('/lock-seat', protect, lockSeat);
router.post('/confirm',protect,confirmBooking);
router.get('/my-tickets',protect,getMyTickets);
module.exports = router;