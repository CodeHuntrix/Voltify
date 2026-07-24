const express = require('express');
const router = express.Router();
const multer = require('multer');
const { saveProfile, saveBill, saveAppliances, validate, parseBillPDF } = require('../controllers/onboardingController');
const { requireAuth } = require('../middleware/auth');

const upload = multer(); // Memory storage for PDF files

router.use(requireAuth);

router.post('/profile',    saveProfile);
router.post('/bill',       saveBill);
router.post('/appliances', saveAppliances);
router.post('/validate',   validate);
router.post('/parse-bill', upload.single('bill'), parseBillPDF);

module.exports = router;
