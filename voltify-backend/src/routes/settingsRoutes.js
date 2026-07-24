const express = require('express');
const router = express.Router();
const {
  getAppliances, updateAppliance, deleteAppliance, addAppliance,
  getBills, uploadBill, updateNotificationSettings, deleteAccount,
} = require('../controllers/settingsController');
const { requireAuth } = require('../middleware/auth');

router.use(requireAuth);

// Appliance management
router.get('/appliances',        getAppliances);
router.post('/appliances',       addAppliance);
router.put('/appliances/:id',    updateAppliance);
router.delete('/appliances/:id', deleteAppliance);

// Bill management
router.get('/bills',             getBills);
router.post('/bills/upload',     uploadBill);

// Notification preferences
router.put('/notifications',     updateNotificationSettings);

// Account
router.delete('/account',        deleteAccount);

module.exports = router;
