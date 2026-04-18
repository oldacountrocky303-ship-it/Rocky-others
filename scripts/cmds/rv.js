const axios = require("axios");
const fs = require("fs-extra");
const path = require("path");

const __AUTHOR__ = "Rocky Chowdhury";

module.exports = {
  config: {
    name: "rv",
    version: "5.0",
    author: __AUTHOR__,
    role: 0,
    shortDescription: "Send video from API",
    category: "media",
    guide: "{pn}"
  },

  onStart: async function ({ api, event }) {
    try {

      if (module.exports.config.author !== __AUTHOR__) {
        return api.sendMessage("❌ Unauthorized edit!", event.threadID, event.messageID);
      }

      const url = "https://rv-rocky-9xet.onrender.com/rv";

      // 🔁 retry system (3 times)
      for (let i = 0; i < 3; i++) {
        try {

          const response = await axios({
            method: "GET",
            url,
            responseType: "stream",
            timeout: 15000
          });

          // ❌ যদি stream না আসে
          if (!response || !response.data) throw new Error("No stream");

          const filePath = path.join(__dirname, "cache", `rv_${Date.now()}.mp4`);
          fs.ensureDirSync(path.dirname(filePath));

          const writer = fs.createWriteStream(filePath);
          response.data.pipe(writer);

          await new Promise((resolve, reject) => {
            writer.on("finish", resolve);
            writer.on("error", reject);
          });

          // ❌ empty file check
          const stats = fs.statSync(filePath);
          if (stats.size < 50000) { // 50KB এর কম মানে invalid
            fs.unlinkSync(filePath);
            throw new Error("Empty video");
          }

          // ✅ send video
          return api.sendMessage(
            {
              body: "🎬 Here's your video",
              attachment: fs.createReadStream(filePath)
            },
            event.threadID,
            () => fs.unlinkSync(filePath),
            event.messageID
          );

        } catch (err) {
          console.log(`Retry ${i + 1} failed`);
        }
      }

      // ❌ সব retry fail হলে
      return api.sendMessage(
        "❌ Video load failed! Try again...",
        event.threadID,
        event.messageID
      );

    } catch (err) {
      console.error(err);
      return api.sendMessage(
        "❌ Unexpected error!",
        event.threadID,
        event.messageID
      );
    }
  }
};
