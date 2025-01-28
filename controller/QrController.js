const QRCode = require("qrcode"); // QR code generation library
const { v4: uuidv4 } = require("uuid"); // Import UUID generator
const ScanLog = require("../models/QrSchema"); // Adjust the path to your model


exports.Qrcode = async (req, res) => {
//  console.log('inside qr');
 try {
  const slug = uuidv4(); 
  const qrUrl = `http://192.168.21.56:5000/api/scan/${slug}`; // Include slug in the URL

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
    const { slug } = req.params; // Extract the slug from the request URL
    const sourceIdentifier = req.headers["user-agent"]; // Get User-Agent
    const ipAddress = req.headers["x-forwarded-for"] || req.socket.remoteAddress; // Get IP address

    // Log the request for debugging
    console.log(`Slug: ${slug}, Source: ${sourceIdentifier}, IP: ${ipAddress}`);

    // Check if a scan record exists
    const existingScan = await ScanLog.findOne({ slug });

    if (existingScan) {
      // Update timestamp of the existing entry
      existingScan.timestamp = new Date();
      await existingScan.save();

      return res.status(200).json({
        message: "Scan details updated successfully",
        data: { slug, sourceIdentifier, ipAddress },
      });
    }

    // If no existing scan is found, save a new entry
    const scanEntry = new ScanLog({
      slug,
      sourceIdentifier,
      ipAddress,
    });

    await scanEntry.save();

    res.status(200).json({
      message: "Scan details logged successfully",
      data: { slug, sourceIdentifier, ipAddress },
    });
  } catch (error) {
    console.error("Error logging scan details:", error);
    res.status(500).json({ message: "Error logging scan details" });
  }
};

exports.ScanDetailsGet = async (req, res) => {
  try {
    const { slug } = req.params;
    const sourceIdentifier = req.headers["user-agent"];
    const ipAddress = req.headers["x-forwarded-for"] || req.socket.remoteAddress;

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
      slug,
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
    const { slug } = req.params; // Get the slug from the URL parameters

    // Fetch the scan details from the database by slug
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

