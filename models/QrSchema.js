const mongoose = require("mongoose");

const scanLogSchema = new mongoose.Schema({
  slug: { type: String, required: true },
  sourceIdentifier: { type: String, required: true },
  ipAddress: { type: String, required: true },
  timestamp: { type: Date, default: Date.now },
});

module.exports = mongoose.model("ScanLog", scanLogSchema);
