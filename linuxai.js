process.on("uncaughtException", console.error);
process.on("unhandledRejection", console.error);

require("./settings");
const fs = require("fs");
const util = require("util");
const chalk = require("chalk");
const { exec } = require("child_process");
const { LoadDataBase } = require("./src/message");
// Read Database

module.exports = linux = async (linux, m, chatUpdate, store) => {
  try {
    await LoadDataBase(linux, m);

    const botNumber = await linux.decodeJid(linux.user.id);
    const body =
      m.type === "conversation"
        ? m.message.conversation
        : m.type == "imageMessage"
        ? m.message.imageMessage.caption
        : m.type == "videoMessage"
        ? m.message.videoMessage.caption
        : m.type == "extendedTextMessage"
        ? m.message.extendedTextMessage.text
        : m.type == "buttonsResponseMessage"
        ? m.message.buttonsResponseMessage.selectedButtonId
        : m.type == "listResponseMessage"
        ? m.message.listResponseMessage.singleSelectReply.selectedRowId
        : m.type == "templateButtonReplyMessage"
        ? m.message.templateButtonReplyMessage.selectedId
        : m.type === "messageContextInfo"
        ? m.message.buttonsResponseMessage?.selectedButtonId ||
          m.message.listResponseMessage?.singleSelectReply.selectedRowId ||
          m.text
        : m.type === "editedMessage"
        ? m.message.editedMessage.message.protocolMessage.editedMessage
            .extendedTextMessage
          ? m.message.editedMessage.message.protocolMessage.editedMessage
              .extendedTextMessage.text
          : m.message.editedMessage.message.protocolMessage.editedMessage
              .conversation
        : "";
    const budy = typeof m.text == "string" ? m.text : "";
    const isCreator = (isOwner = [botNumber, ...owner]
      .map((v) => v.replace(/[^0-9]/g, "") + "@s.whatsapp.net")
      .includes(m.sender));
    const prefix = isCreator
      ? /^[°•π÷×¶∆£¢€¥®™+✓_=|~!?@()#,'"*+÷/\%^&.©^]/gi.test(body)
        ? body.match(/^[°•π÷×¶∆£¢€¥®™+✓_=|~!?@()#,'"*+÷/\%^&.©^]/gi)[0]
        : /[\uD800-\uDBFF][\uDC00-\uDFFF]/gi.test(body)
        ? body.match(/[\uD800-\uDBFF][\uDC00-\uDFFF]/gi)[0]
        : listprefix.find((a) => body.startsWith(a)) || ""
      : db.set[botNumber].multiprefix
      ? /^[°•π÷×¶∆£¢€¥®™+✓_=|~!?@()#,'"*+÷/\%^&.©^]/gi.test(body)
        ? body.match(/^[°•π÷×¶∆£¢€¥®™+✓_=|~!?@()#,'"*+÷/\%^&.©^]/gi)[0]
        : /[\uD800-\uDBFF][\uDC00-\uDFFF]/gi.test(body)
        ? body.match(/[\uD800-\uDBFF][\uDC00-\uDFFF]/gi)[0]
        : listprefix.find((a) => body.startsWith(a)) || "¿"
      : listprefix.find((a) => body.startsWith(a)) || "¿";
    const isCmd = body.startsWith(prefix);
    const args = body.trim().split(/ +/).slice(1);
    const quoted = m.quoted ? m.quoted : m;
    const command = isCreator
      ? body.replace(prefix, "").trim().split(/ +/).shift().toLowerCase()
      : isCmd
      ? body.replace(prefix, "").trim().split(/ +/).shift().toLowerCase()
      : "";
    const text = (q = args.join(" "));
    const mime = (quoted.msg || quoted).mimetype || "";
    const qmsg = quoted.msg || quoted;
    const almost = 0.72;
    const time = Date.now();
    const readmore = String.fromCharCode(8206).repeat(999);
    const FormData = require("form-data");

    // Fake
    const textf = m.body; // Mengambil pesan yang dikirim pengirim

    const fkontak = {
      key: { remoteJid: "status@broadcast", participant: "0@s.whatsapp.net" },
      message: {
        extendedTextMessage: {
          text: `${textf}`, // Menggunakan pesan yang dikirim oleh pengirim
        },
      },
    };

    // Reset Limit

    // Auto Set Bio
    if (db.set[botNumber].autobio) {
      let setbio = db.set[botNumber];
      if (new Date() * 1 - setbio.status > 60000) {
        await linux.updateProfileStatus(
          `${linux.user.name} | 🎯 Runtime : ${runtime(process.uptime())}`
        );
        setbio.status = new Date() * 1;
      }
    }

    // Set Public
    if (!linux.public) {
    }

    // Auto Read
    if (m.message && m.key.remoteJid !== "status@broadcast") {
      console.log(
        chalk.black(
          chalk.bgWhite("[ PESAN ]:"),
          chalk.bgGreen(new Date()),
          chalk.bgHex("#00EAD3")(budy || m.type) +
            "\n" +
            chalk.bgCyanBright("[ DARI ] :"),
          chalk.bgYellow(m.pushName || (isCreator ? "Bot" : "Anonim")),
          chalk.bgHex("#FF449F")(m.sender),
          chalk.bgHex("#FF5700")(
            m.isGroup
              ? m.metadata.subject
              : m.chat.endsWith("@newsletter")
              ? "Newsletter"
              : "Private Chat"
          ),
          chalk.bgBlue("(" + m.chat + ")")
        )
      );
      if (db.set[botNumber].autoread && linux.public) linux.readMessages([m.key]);
    }

    // Group Settings

    // Filter Bot
    if (m.isBot) return;

    // Mengetik
    if (db.set[botNumber].autotyping && linux.public && isCmd) {
      await linux.sendPresenceUpdate("composing", m.chat);
    }

    // Salam
    switch (command) {
      case "everyone":
      case "e":
        {
          if (!isCreator) return m.reply(mess.owner);
          if (!m.isGroup) return m.reply(mess.group);
          linux.sendMessage(
            m.chat,
            {
              text: q ? q : "",
              mentions: m.metadata.participants.map((a) => a.id),
            },
            { quoted: m },
          );
        }
      default:
        if (budy.startsWith(">")) {
          if (!isCreator) return;
          try {
            let evaled = await eval(budy.slice(2));
            if (typeof evaled !== "string")
              evaled = require("util").inspect(evaled);
            await m.reply(evaled);
          } catch (err) {
            await m.reply(String(err));
          }
        }
        const baileys = require("@whiskeysockets/baileys");

        if (m.chat.endsWith("@s.whatsapp.net")) {
          // Hapus isCmd agar semua pesan diteruskan
          this.anonymous = this.anonymous || {};

          // Cari sesi aktif
          let room = Object.values(this.anonymous).find(
            (room) =>
              [room.a, room.b].includes(m.sender) && room.state === "CHATTING"
          );

          if (room) {
            // Abaikan perintah tertentu
            if (/^.*(next|leave|start)/.test(m.text)) return;
            if (
              [
                ".next",
                ".leave",
                ".stop",
                ".start",
                "Cari Partner",
                "Keluar",
                "Lanjut",
                "Stop",
              ].includes(m.text)
            )
              return;

            // Temukan partner
            let other = room.a === m.sender ? room.b : room.a;

            if (other) {
              try {
                // Validasi pesan
                if (!m.message || Object.keys(m.message).length === 0) {
                  console.error("Pesan kosong, tidak dapat diteruskan.");
                  return;
                }

                // Kirim pesan teks langsung
                if (m.message?.conversation || m.text) {
                  const text = m.message.conversation || m.text;
                  await linux.sendMessage(other, { text });
                  console.log(
                    `Pesan teks diteruskan dari ${m.sender} ke ${other}: ${text}`
                  );
                }
                // Kirim pesan media
                else {
                  const forwardMsg = baileys.generateForwardMessageContent(
                    m.message,
                    true
                  );
                  const finalMsg = baileys.generateWAMessageFromContent(
                    other,
                    forwardMsg,
                    { userJid: other }
                  );

                  // Kirim pesan ke partner
                  await linux.relayMessage(other, finalMsg.message, {
                    messageId: finalMsg.key.id,
                  });
                  console.log(
                    `Pesan media diteruskan dari ${m.sender} ke ${other}`
                  );
                }
              } catch (error) {
                console.error(
                  `Error saat meneruskan pesan dari ${m.sender} ke ${other}:`,
                  error.message
                );
              }
            } else {
              console.error(`Partner tidak ditemukan untuk sesi ${m.sender}`);
            }
          }
          return true;
        }
        if (budy.startsWith("<")) {
          if (!isCreator) return;
          try {
            let evaled = await eval(`(async () => { ${budy.slice(2)} })()`);
            if (typeof evaled !== "string")
              evaled = require("util").inspect(evaled);
            await m.reply(evaled);
          } catch (err) {
            await m.reply(String(err));
          }
        }
        if (budy.startsWith("$")) {
          if (!isCreator) return;
          if (!text) return;
          exec(budy.slice(2), (err, stdout) => {
            if (err) return m.reply(`${err}`);
            if (stdout) return m.reply(stdout);
          });
        }
    }
  } catch (err) {
    console.log(util.format(err));
    //m.reply('*❗ Internal server error️*');
    linux.sendFromOwner(
      owner,
      "Halo sayang, sepertinya ada yang error nih, jangan lupa diperbaiki ya\n\n*Log error:*\n\n" +
        util.format(err),
      m,
      { contextInfo: { isForwarded: true } }
    );
  }
};

let file = require.resolve(__filename);
fs.watchFile(file, () => {
  fs.unwatchFile(file);
  console.log(chalk.green(`Update ${__filename}`));
  delete require.cache[file];
  require(file);
});
