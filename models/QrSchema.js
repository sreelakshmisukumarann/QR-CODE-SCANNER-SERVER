const mongoose = require("mongoose");

const scanLogSchema = new mongoose.Schema({
  slug: { type: String, required: true },
  sourceIdentifier: { type: String, required: true },
  ipAddress: { type: String, required: true },
  deviceType: { type: String },
  deviceModel: { type: String },
  osName: { type: String },
  osVersion: { type: String },
  browserName: { type: String },
  browserVersion: { type: String },
  visitorId: {type: String},
  country: { type: String, default: "Unknown" },
  region: { type: String, default: "Unknown" },
  city: { type: String, default: "Unknown" },
  isp: { type: String, default: "Unknown" },
  latitude: { type: String, default: "Unknown" },
  longitude: { type: String, default: "Unknown" },
  timestamp: { type: Date, default: Date.now },
});

module.exports = mongoose.model("ScanLog", scanLogSchema);
