express = require('express')

const QrController = require('../controller/QrController')

var router = express.Router();

// router.post('/scan/add-details',QrController.AddScanning)
// Route to generate the QR code
router.get('/api/qr', QrController.Qrcode);

// Route to handle scan details
router.post('/api/scan/new/:slug', QrController.ScanDetails);
router.get("/api/scan/:slug", QrController.ScanDetailsGet);
// New route to get scan details by slug
router.get('/api/scan/details/:slug', QrController.GetScanDetailsBySlug);


module.exports = router