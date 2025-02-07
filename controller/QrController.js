const QRCode = require("qrcode");
const { v4: uuidv4 } = require("uuid");
const UAParser = require("ua-parser-js");
const ScanLog = require("../models/QrSchema");
const DeviceDetector = require("../device-detector/index");

// Function to extract IP address
const getIpAddress = (req) => {
  return req.headers["x-forwarded-for"]?.split(",")[0] || req.socket.remoteAddress || "Unknown IP";
};

async function getGeoLocation(ip) {
  try {
    if (!ip || ip.startsWith("192.168") || ip === "127.0.0.1") {
      return { country: "Local Network", region: "N/A", city: "N/A", isp: "N/A", lat: null, lon: null };
    }

    // Use dynamic IP for geolocation request
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
    return { country: "Unknown", region: "Unknown", city: "Unknown", isp: "Unknown", lat: null, lon: null };
  }
}

// Generate QR Code
exports.Qrcode = async (req, res) => {
  try {
    const slug = uuidv4();
    const qrUrl = `https://qr-code-scanner-server.onrender.com/api/scan/${slug}`;

    QRCode.toBuffer(qrUrl, { type: "png" }, (err, buffer) => {
      if (err) return res.status(500).json({ message: "Error generating QR code" });

      res.set("Content-Type", "image/png");
      res.send(buffer);
    });
  } catch (error) {
    console.error("Error generating QR code:", error);
    res.status(500).json({ message: "Error generating QR code" });
  }
};

// Log QR Scan Details
exports.ScanDetails = async (req, res) => {
  try {
    const sourceIdentifier = req.headers["user-agent"] || "Unknown";
    const parser = new UAParser(sourceIdentifier);
    const uaResult = parser.getResult();

    const ipAddress = getIpAddress(req);
    const ipParts = ipAddress.split(".");
    const shortIP = ipParts.length > 2 ? `${ipParts[ipParts.length - 2]}.${ipParts[ipParts.length - 1]}` : ipAddress;

    const userAgent = req.headers["user-agent"] || "Unknown UA";
    
    // Detect Device Model
    const deviceDetector = new DeviceDetector(userAgent, req.headers);
    const detectedDevice = deviceDetector.detect();
    const deviceType = uaResult.device.type || "Desktop";
    const osName = uaResult.os.name || "Unknown OS";
    const osVersion = uaResult.os.version || "Unknown Version";
    const browserName = uaResult.browser.name || "Unknown Browser";
    const browserVersion = uaResult.browser.version || "Unknown Version";

    // Get Geolocation Data
    const geoData = await getGeoLocation(ipAddress);
    console.log("Geolocation Data:", geoData); // Log location details

    const slug = `${uuidv4().slice(0, 8)}-${shortIP}-${osName}`;

    const existingScan = await ScanLog.findOne({ sourceIdentifier });

    if (existingScan) {
      existingScan.timestamp = new Date();
      await existingScan.save();

      return res.status(200).send(generateScanResponse("QR Code Scanned Again", "Your details have been updated.", {
        osName, osVersion, browserName, browserVersion, deviceType, deviceModel: detectedDevice.model, ipAddress
      }));
    }

    const scanEntry = new ScanLog({
      slug,
      sourceIdentifier,
      ipAddress,
      deviceType,
      deviceModel: detectedDevice.model || "Unknown Device",
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
      osName, osVersion, browserName, browserVersion, deviceType, deviceModel: detectedDevice.model, ipAddress
    }));
  } catch (error) {
    console.error("Error logging scan details:", error);
    res.status(500).send("Error logging scan details.");
  }
};

// Fetch Scan Details by Slug
exports.GetScanDetailsBySlug = async (req, res) => {
  try {
    const { slug } = req.params;
    const scanDetails = await ScanLog.findOne({ slug });

    if (!scanDetails) {
      return res.status(404).json({ message: "Scan details not found." });
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

// API to Update Device Model After Fetching Client Hints
exports.UpdateDeviceModel = async (req, res) => {
  try {
    const { deviceModel } = req.body;
    if (!deviceModel) {
      return res.status(400).json({ message: "Device model is required" });
    }

    // Find the last scanned record and update the device model
    const lastScan = await ScanLog.findOne().sort({ timestamp: -1 });
    if (!lastScan) {
      return res.status(404).json({ message: "No recent scans found" });
    }

    lastScan.deviceModel = deviceModel;
    await lastScan.save();

    res.status(200).json({ message: "Device model updated", deviceModel });
  } catch (error) {
    console.error("Error updating device model:", error);
    res.status(500).json({ message: "Error updating device model" });
  }
};

// Generate HTML Response with Client Hints
const generateScanResponse = (title, message, details) => {
  const { osName, osVersion, browserName, browserVersion, deviceType, deviceModel, ipAddress } = details;

  return `
    <!DOCTYPE html>
    <html lang="en">
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>${title}</title>
        <meta http-equiv="Accept-CH" content="Sec-CH-UA-Model, Sec-CH-UA-Platform, Sec-CH-UA-Mobile">
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
            <p><strong>Device:</strong> <span id="deviceModel">${deviceModel || deviceType}</span></p>
            <p><strong>OS:</strong> ${osName} ${osVersion}</p>
            <p><strong>Browser:</strong> ${browserName} ${browserVersion}</p>
          </div>
        </div>

        <script>
          async function fetchDeviceModel() {
            if (navigator.userAgentData) {
              const highEntropyValues = await navigator.userAgentData.getHighEntropyValues(["model"]);
              const model = highEntropyValues.model || "Unknown Device";
              document.getElementById("deviceModel").innerText = model;

              // Send updated device details to backend
              fetch("/api/update-device-model", {
                method: "POST",
                headers: {
                  "Content-Type": "application/json"
                },
                body: JSON.stringify({ deviceModel: model })
              });
            }
          }

          fetchDeviceModel();
        </script>
      </body>
    </html>
  `;
};
