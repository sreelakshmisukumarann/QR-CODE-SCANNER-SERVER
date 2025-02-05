const QRCode = require("qrcode"); // QR code generation library
const { v4: uuidv4 } = require("uuid"); // Import UUID generator
const ScanLog = require("../models/QrSchema"); // Adjust the path to your model

const getIpAddress = (req) => {
  return req.headers["x-forwarded-for"]?.split(",")[0] || req.socket.remoteAddress || "Unknown IP";
};

exports.Qrcode = async (req, res) => {
//  console.log('inside qr');
 try {
  const slug = uuidv4(); 
  const qrUrl = `http://192.168.134.56:5000/api/scan/${slug}`; // Include slug in the URL

  // Generate QR code as a PNG image buffer
  QRCode.toBuffer(qrUrl, { type: "png" }, (err, buffer) => {
    if (err) {
      return res.status(500).json({ message: "Error generating QR code" });
    }

    res.set("Content-Type", "image/png");
    res.send(buffer);
  });
} catch (error) {
  console.error("Error generating QR code:", error);
  res.status(500).json({ message: "Error generating QR code" });
}
};

exports.ScanDetails = async (req, res) => {
  try {
    const sourceIdentifier = req.headers["user-agent"]; // Get User-Agent
    const ipAddress = req.headers["x-forwarded-for"]?.split(",")[0] || req.socket.remoteAddress;
    
    // Extract only the last two parts of the IP address (e.g., "192.168.21.77" → "21.77")
    const ipParts = ipAddress.split(".");
    const shortIP = ipParts.length > 2 ? `${ipParts[ipParts.length - 2]}.${ipParts[ipParts.length - 1]}` : ipAddress;

    // Extract key details from User-Agent (e.g., "Android 10 - Chrome")
    let shortUA = sourceIdentifier.match(/(Android|Windows|Mac|iPhone|iPad|Linux)[^;)]*/i);
    shortUA = shortUA ? shortUA[0].replace(/[^a-zA-Z0-9]/g, "") : "Generic";

    // Generate a shorter unique slug
    const deviceSlug = `${uuidv4().slice(0, 8)}-${shortIP}-${shortUA}`;

    // Check if a scan record exists
    const existingScan = await ScanLog.findOne({ sourceIdentifier });

    if (existingScan) {
      // Update timestamp of the existing entry
      existingScan.timestamp = new Date();
      await existingScan.save();

      // Push event to GTM Data Layer (only if it's a new scan attempt)
      return res.status(200).send(`
        <html>
          <head><title>QR Code Scanned Again</title></head>
          <body style="text-align: center; font-family: Arial, sans-serif;">
            <h1>QR Code Scanned Again</h1>
            <p>Your details have been updated. Thank you!</p>
            <script>
              window.dataLayer = window.dataLayer || [];
              window.dataLayer.push({
                event: "qr_scan_success",
                scan_source: "QR Code",
                device_info: "${sourceIdentifier}",
                user_ip: "${ipAddress}"
              });
            </script>
          </body>
        </html>
      `);
    }

    // If no existing scan is found, save a new entry
    const scanEntry = new ScanLog({
      slug: deviceSlug,
      sourceIdentifier,
      ipAddress,
    });

    await scanEntry.save();

    res.status(200).send(`
      <html>
        <head><title>QR Code Scanned</title></head>
        <body style="text-align: center; font-family: Arial, sans-serif;">
          <h1>QR Code Scanned Successfully</h1>
          <p>Thank you for scanning the QR code!</p>
          <script>
            window.dataLayer = window.dataLayer || [];
            window.dataLayer.push({
              event: "qr_scan_success",
              scan_source: "QR Code",
              device_info: "${sourceIdentifier}",
              user_ip: "${ipAddress}"
            });
          </script>
        </body>
      </html>
    `);
  } catch (error) {
    console.error("Error logging scan details:", error);
    res.status(500).send("Error logging scan details.");
  }
};


exports.ScanDetailsGet = async (req, res) => {
  try {
    const sourceIdentifier = req.headers["user-agent"];
    const ipAddress = req.headers["x-forwarded-for"]?.split(",")[0] || req.socket.remoteAddress;

    
    // Extract only the last two parts of the IP address (e.g., "192.168.21.77" → "21.77")
    const ipParts = ipAddress.split(".");
    const shortIP = ipParts.length > 2 ? `${ipParts[ipParts.length - 2]}.${ipParts[ipParts.length - 1]}` : ipAddress;

    // Extract key details from User-Agent (e.g., "Android 10 - Chrome")
    let shortUA = sourceIdentifier.match(/(Android|Windows|Mac|iPhone|iPad|Linux)[^;)]*/i);
    shortUA = shortUA ? shortUA[0].replace(/[^a-zA-Z0-9]/g, "") : "Generic";

    // Generate a shorter unique slug
    const deviceSlug = `${uuidv4().slice(0, 8)}-${shortIP}-${shortUA}`;

    // Check if the source has already scanned
    const existingScan = await ScanLog.findOne({ sourceIdentifier });

    if (existingScan) {
      // Update timestamp if source has already scanned
      existingScan.timestamp = new Date();
      await existingScan.save();

      return res.status(200).send(`
        <html>
          <head><title>QR Code Scanned</title></head>
          <body style="text-align: center; font-family: Arial, sans-serif;">
            <h1>QR Code Scanned Again</h1>
            <p>Your details have been updated. Thank you!</p>
          </body>
        </html>
      `);
    }

    // Save a new scan entry if not found
    const scanEntry = new ScanLog({
      slug:deviceSlug,
      sourceIdentifier,
      ipAddress,
    });

    await scanEntry.save();

    res.status(200).send(`
      <html>
        <head><title>QR Code Scanned</title></head>
        <body style="text-align: center; font-family: Arial, sans-serif;">
          <h1>QR Code Scanned Successfully</h1>
          <p>Thank you for scanning the QR code!</p>
        </body>
      </html>
    `);
  } catch (error) {
    console.error("Error logging scan details:", error);
    res.status(500).send("Error logging scan details.");
  }
};

exports.GetScanDetailsBySlug = async (req, res) => {
  try {
    const { slug } = req.params; 

    const scanDetails = await ScanLog.findOne({ slug });

    // If no scan details are found, return a 404 response
    if (!scanDetails) {
      return res.status(404).json({ message: "Scan details not found for this slug." });
    }

    // Return the scan details as a response
    res.status(200).json({
      message: "Scan details fetched successfully",
      data: scanDetails,
    });
  } catch (error) {
    console.error("Error fetching scan details:", error);
    res.status(500).json({ message: "Error fetching scan details" });
  }
};

