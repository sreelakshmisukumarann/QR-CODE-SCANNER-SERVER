const QRCode = require("qrcode"); // QR code generation library
const { v4: uuidv4 } = require("uuid"); // Import UUID generator
const UAParser = require("ua-parser-js"); // Import UA Parser
const ScanLog = require("../models/QrSchema"); // Adjust the path to your model

// Function to get the IP address from the request
const getIpAddress = (req) => {
  return req.headers["x-forwarded-for"]?.split(",")[0] || req.socket.remoteAddress || "Unknown IP";
};

// Function to get geolocation from IP address
async function getGeoLocation(ip) {
  try {
    if (!ip || ip.startsWith("192.168") || ip === "127.0.0.1") {
      return { country: "Local Network", region: "N/A", city: "N/A", isp: "N/A" };
    }

    const response = await fetch(`https://ipinfo.io/${ip}/json?token=cec3a0a6f57f93`);
    
    if (!response.ok) {
      throw new Error(`HTTP error! Status: ${response.status}`);
    }

    const data = await response.json();
    
    return {
      country: data.country || "Unknown",
      region: data.region || "Unknown",
      city: data.city || "Unknown",
      isp: data.org || "Unknown",
      lat: data.loc ? data.loc.split(",")[0] : null,
      lon: data.loc ? data.loc.split(",")[1] : null,
    };
  } catch (error) {
    console.error("Error fetching geolocation:", error);
    return { country: "Unknown", region: "Unknown", city: "Unknown", isp: "Unknown" };
  }
}

// Function to extract device model from request headers
const getDeviceModel = (req, uaResult) => {
  const deviceModel = req.headers['sec-ch-ua-model'] || uaResult.device.model || 'Unknown Device';
  return deviceModel;
};

// QR Code generation
exports.Qrcode = async (req, res) => {
  try {
    const slug = uuidv4(); 
    const qrUrl = `https://qr-code-scanner-server.onrender.com/api/scan/${slug}`; // Include slug in the URL

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

// Handle QR Code Scanning and Device Logging
exports.ScanDetails = async (req, res) => {
  try {
    const sourceIdentifier = req.headers["user-agent"] || "Unknown"; 
    const parser = new UAParser(sourceIdentifier);
    const uaResult = parser.getResult();

    const ipAddress = getIpAddress(req);
    const ipParts = ipAddress.split(".");
    const shortIP = ipParts.length > 2 ? `${ipParts[ipParts.length - 2]}.${ipParts[ipParts.length - 1]}` : ipAddress;

    const deviceType = uaResult.device.type || "Desktop";
    const osName = uaResult.os.name || "Unknown OS";
    const osVersion = uaResult.os.version || "Unknown Version";
    const browserName = uaResult.browser.name || "Unknown Browser";
    const browserVersion = uaResult.browser.version || "Unknown Version";

    // Get an accurate device model
    const deviceModel = getDeviceModel(req, uaResult);

    // Get geolocation data
    const geoData = await getGeoLocation(ipAddress);

    const slug = `${uuidv4().slice(0, 8)}-${shortIP}-${osName}`;

    const existingScan = await ScanLog.findOne({ sourceIdentifier });

    if (existingScan) {
      existingScan.timestamp = new Date();
      await existingScan.save();

      return res.status(200).send(generateScanResponse("QR Code Scanned Again", "Your details have been updated.", {
        osName, osVersion, browserName, browserVersion, deviceType, deviceModel, ipAddress, geoData
      }));
    }

    const scanEntry = new ScanLog({
      slug,
      sourceIdentifier,
      ipAddress,
      deviceType,
      deviceModel,
      osName,
      osVersion,
      browserName,
      browserVersion,
      country: geoData.country,
      region: geoData.region,
      city: geoData.city,
      isp: geoData.isp,
      latitude: geoData.lat,
      longitude: geoData.lon,
    });

    await scanEntry.save();

    res.status(200).send(generateScanResponse("QR Code Scanned Successfully", "Thank you for scanning!", {
      osName, osVersion, browserName, browserVersion, deviceType, deviceModel, ipAddress, geoData
    }));
  } catch (error) {
    console.error("Error logging scan details:", error);
    res.status(500).send("Error logging scan details.");
  }
};

// Generate HTML Response with Scan Information
const generateScanResponse = (title, message, details) => {
  const { osName, osVersion, browserName, browserVersion, deviceType, deviceModel, ipAddress, geoData } = details;

  return `
    <!DOCTYPE html>
    <html lang="en">
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>${title}</title>
        <style>
          body {
            font-family: 'Segoe UI', Roboto, sans-serif;
            text-align: center;
            padding: 20px;
            background-color: #f5f5f5;
          }
          .container {
            background-color: white;
            padding: 20px;
            border-radius: 8px;
            box-shadow: 0 2px 4px rgba(0,0,0,0.1);
          }
          h1 { color: #2c3e50; }
          .info { color: #7f8c8d; }
        </style>
      </head>
      <body>
        <div class="container">
          <h1>${title}</h1>
          <p>${message}</p>
          <div class="info">
            <p><strong>Device:</strong> ${deviceModel || deviceType}</p>
            <p><strong>OS:</strong> ${osName} ${osVersion}</p>
            <p><strong>Browser:</strong> ${browserName} ${browserVersion}</p>
            <p><strong>Location:</strong> ${geoData.city}, ${geoData.region}, ${geoData.country}</p>
          </div>
        </div>
        <script>
          window.dataLayer = window.dataLayer || [];
          window.dataLayer.push({
            event: "qr_scan_success",
            scan_source: "QR Code",
            device_info: {
              model: "${deviceModel}",
              os: "${osName} ${osVersion}",
              browser: "${browserName} ${browserVersion}",
              type: "${deviceType}",
              location: {
                country: "${geoData.country}",
                region: "${geoData.region}",
                city: "${geoData.city}"
              }
            }
          });
        </script>
      </body>
    </html>
  `;
};

// Get scan details by slug
exports.GetScanDetailsBySlug = async (req, res) => {
  try {
    const { slug } = req.params; 

    const scanDetails = await ScanLog.findOne({ slug });

    if (!scanDetails) {
      return res.status(404).json({ message: "Scan details not found for this slug." });
    }

    res.status(200).json({
      message: "Scan details fetched successfully",
      data: scanDetails,
    });
  } catch (error) {
    console.error("Error fetching scan details:", error);
    res.status(500).json({ message: "Error fetching scan details" });
  }
};
