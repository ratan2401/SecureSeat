const express = require('express');
const router = express.Router();
const { addStadium, getStadiums } = require('../controllers/stadiumController');
const { protect } = require('../middlewares/authMiddleware');
const { admin } = require('../middlewares/adminMiddleware');

router.route('/')
    .post(protect, admin, addStadium)
    .get(protect, admin, getStadiums);

module.exports = router;