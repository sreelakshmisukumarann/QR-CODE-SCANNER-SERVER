class DeviceDetector {
    constructor(userAgent, clientHints = {}) {
      this.userAgent = userAgent || "";
      this.clientHints = clientHints;
    }
  
    getClientHintModel() {
      return this.clientHints["sec-ch-ua-model"] || null;
    }
  
    parseUserAgent() {
      const ua = this.userAgent.toLowerCase();
      const devicePatterns = [
        { brand: "Apple", regex: /iphone|ipad|macintosh/, model: "Apple Device" },
        { brand: "Samsung", regex: /sm-\w+|gt-\w+|samsung/, model: "Samsung Device" },
        { brand: "Xiaomi", regex: /mi \w+|redmi|xiaomi/, model: "Xiaomi Device" },
        { brand: "OnePlus", regex: /oneplus/, model: "OnePlus Device" },
        { brand: "Google", regex: /pixel/, model: "Google Pixel" },
        { brand: "Huawei", regex: /huawei|honor/, model: "Huawei Device" },
        { brand: "Oppo", regex: /oppo|realme/, model: "Oppo Device" },
        { brand: "Vivo", regex: /vivo/, model: "Vivo Device" },
        { brand: "Microsoft", regex: /windows phone/, model: "Windows Phone" },
        { brand: "Sony", regex: /xperia/, model: "Sony Xperia" },
        { brand: "Motorola", regex: /moto \w+/, model: "Motorola Device" },
      ];
  
      for (const { brand, regex, model } of devicePatterns) {
        if (regex.test(ua)) {
          return model;
        }
      }
      return "Unknown Device";
    }
  
    detect() {
      return {
        model: this.getClientHintModel() || this.parseUserAgent(),
        userAgent: this.userAgent,
      };
    }
  }
  
  module.exports = DeviceDetector;
  