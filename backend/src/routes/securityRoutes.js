const express = require('express');
const router = express.Router();
const { getTicketForVerification } = require('../controllers/securityController');
const { protect } = require('../middlewares/authMiddleware');

// We use 'protect' to ensure only logged-in security staff can scan tickets
router.get('/ticket/:ticketId', protect, getTicketForVerification);

module.exports = router;