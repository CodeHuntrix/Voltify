const express = require('express');
const router = express.Router();
const { getProfile, updateProfile } = require('../controllers/profileController');
const { requireAuth } = require('../middleware/auth');

router.use(requireAuth);

router.get('/',       getProfile);
router.put('/update', updateProfile);

module.exports = router;
