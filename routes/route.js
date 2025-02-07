const express = require("express");
const QrController = require("../controller/QrController");

const router = express.Router();

// Route to generate the QR code
router.get("/api/qr", QrController.Qrcode);

// Route to handle QR scan
router.get("/api/scan/:slug", QrController.ScanDetails);

router.get('/api/scan/details/:slug', QrController.GetScanDetailsBySlug);

module.exports = router;
