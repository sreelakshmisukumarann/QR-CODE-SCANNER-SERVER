const express = require("express");
const QrController = require("../controller/QrController");

const router = express.Router();

// Route to generate the QR code
router.get("/api/qr", QrController.Qrcode);

// Route to handle QR scan
router.get("/api/scan/:slug", QrController.ScanDetails);

// Route to update device model after scanning
router.post("/api/update-device-model", QrController.UpdateDeviceModel);

module.exports = router;
