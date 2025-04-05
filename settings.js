const fs = require("fs");
const chalk = require("chalk");

//~~~~~~~~~~~~< GLOBAL SETTINGS >~~~~~~~~~~~~\\

global.owner = ["62"]; // Isi nomer whatsapp, contoh 62xxxx 
global.author = "Linux.Ai\n\nBot number:62";  // ketik nomer yang mau dipake AI 
global.listprefix = ["@", " "];
global.tempatDB = "database.json";
global.pairing_code = true;

global.my = {
  gc: "https://chat.whatsapp.com/",
};

global.mess = {
  owner: "Khusus Developer Meta WhatsApp 👨‍💻",
  group:
    "Fitur Hanya Tersedia Di Group🎭",
};

//~~~~~~~~~~~~~~~< PROCESS >~~~~~~~~~~~~~~~\\

let file = require.resolve(__filename);
fs.watchFile(file, () => {
  fs.unwatchFile(file);
  console.log(chalk.redBright(`Update ${__filename}`));
  delete require.cache[file];
  require(file);
});
