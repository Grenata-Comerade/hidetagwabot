require("./settings");
const fs = require("fs");
const pino = require("pino");
const chalk = require("chalk");
const readline = require("readline");
const { Boom } = require("@hapi/boom");
const NodeCache = require("node-cache");
const { exec } = require("child_process");
const { parsePhoneNumber } = require("awesome-phonenumber");
const {
  default: WAConnection,
  useMultiFileAuthState,
  Browsers,
  DisconnectReason,
  makeInMemoryStore,
  makeCacheableSignalKeyStore,
  fetchLatestBaileysVersion,
} = require("@whiskeysockets/baileys");

const pairingCode =
  global.pairing_code || process.argv.includes("--pairing-code");
const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
});
const store = makeInMemoryStore({
  logger: pino().child({ level: "silent", stream: "store" }),
});
const question = (text) => new Promise((resolve) => rl.question(text, resolve));

global.api = (name, path = "/", query = {}, apikeyqueryname) =>
  (name in global.APIs ? global.APIs[name] : name) +
  path +
  (query || apikeyqueryname
    ? "?" +
      decodeURIComponent(
        new URLSearchParams(
          Object.entries({
            ...query,
            ...(apikeyqueryname
              ? {
                  [apikeyqueryname]:
                    global.APIKeys[
                      name in global.APIs ? global.APIs[name] : name
                    ],
                }
              : {}),
          })
        )
      )
    : "");

const DataBase = require("./src/database");
const database = new DataBase(global.tempatDB);
const msgRetryCounterCache = new NodeCache();

(async () => {
  const loadData = await database.read();
  if (loadData && Object.keys(loadData).length === 0) {
    global.db = {
      set: {},
      users: {},
      game: {},
      groups: {},
      database: {},
      ...(loadData || {}),
    };
    await database.write(global.db);
  } else {
    global.db = loadData;
  }

  setInterval(async () => {
    if (global.db) await database.write(global.db);
  }, 30000);
})();
const {
  GroupUpdate,
  GroupParticipantsUpdate,
  MessagesUpsert,
  Solving,
} = require("./src/message");

async function startLinuxAi() {
  const { state, saveCreds } = await useMultiFileAuthState("LinuxServer");
  const { version, isLatest } = await fetchLatestBaileysVersion();
  const level = pino({ level: "silent" });

  const getMessage = async (key) => {
    if (store) {
      const msg = await store.loadMessage(key.remoteJid, key.id);
      return msg?.message || "";
    }
    return {
      conversation: "LinuxAI WhatsApp Edition",
    };
  };

  const linux = WAConnection({
    //version,
    isLatest,
    logger: level,
    getMessage,
    syncFullHistory: true,
    maxMsgRetryCount: 15,
    msgRetryCounterCache,
    retryRequestDelayMs: 10,
    defaultQueryTimeoutMs: 0,
    printQRInTerminal: !pairingCode,
    browser: Browsers.ubuntu("Firefox"),
    generateHighQualityLinkPreview: true,
    transactionOpts: {
      maxCommitRetries: 10,
      delayBetweenTriesMs: 10,
    },
    appStateMacVerification: {
      patch: true,
      snapshot: true,
    },
    auth: {
      creds: state.creds,
      keys: makeCacheableSignalKeyStore(state.keys, level),
    },
  });

  if (pairingCode && !linux.authState.creds.registered) {
    let phoneNumber;
    async function getPhoneNumber() {
      phoneNumber = await question(chalk.bgHex("#4CC789")("Contoh:62xxx. Ketik nomor WhatsApp anda: "));
      phoneNumber = phoneNumber.replace(/[^0-9]/g, "");

      if (!parsePhoneNumber(phoneNumber).valid && phoneNumber.length < 6) {
        console.log(
          chalk.bgBlack(
            chalk.redBright("Start with your Country WhatsApp code") +
              chalk.whiteBright(",") +
              chalk.greenBright(" Example : 62xxx")
          )
        );
        await getPhoneNumber();
      }
    }

    setTimeout(async () => {
      await getPhoneNumber();
      await exec("rm -rf ./LinuxServer/*");
      let code = await linux.requestPairingCode(phoneNumber);
      console.log(chalk.yellowBright(`Kode OTP anda : ${code}`));
    }, 3000);
  }

  store.bind(linux.ev);

  await Solving(linux, store);

  linux.ev.on("creds.update", saveCreds);

  linux.ev.on("connection.update", async (update) => {
    const { connection, lastDisconnect, receivedPendingNotifications } = update;
    if (connection === "close") {
      const reason = new Boom(lastDisconnect?.error)?.output.statusCode;
      if (reason === DisconnectReason.connectionLost) {
        console.log("Connection to Server Lost, Attempting to Reconnect...");
        startLinuxAi();
      } else if (reason === DisconnectReason.connectionClosed) {
        console.log("Connection closed, Attempting to Reconnect...");
        startLinuxAi();
      } else if (reason === DisconnectReason.restartRequired) {
        console.log("Restart Required...");
        startLinuxAi();
      } else if (reason === DisconnectReason.timedOut) {
        console.log("Connection Timed Out, Attempting to Reconnect...");
        startLinuxAi();
      } else if (reason === DisconnectReason.badSession) {
        console.log("Delete Session and Scan again...");
        startLinuxAi();
      } else if (reason === DisconnectReason.connectionReplaced) {
        console.log("Close current Session first...");
        startLinuxAi();
      } else if (reason === DisconnectReason.loggedOut) {
        console.log("Scan again and Run...");
        exec("rm -rf ./LinuxServer/*");
        process.exit(1);
      } else if (reason === DisconnectReason.Multidevicemismatch) {
        console.log("Scan again...");
        exec("rm -rf ./LinuxServer/*");
        process.exit(0);
      } else {
        linux.end(`Unknown DisconnectReason : ${reason}|${connection}`);
      }
    }
    if (connection == "open") {
      console.log("Connected to : " + JSON.stringify(linux.user, null, 2));
      let botNumber = await linux.decodeJid(linux.user.id);
      if (db.set[botNumber] && !db.set[botNumber]?.join) {
        if (global.my.gc.length > 0 && global.my.gc.includes("whatsapp.com")) {
          await linux
            .groupAcceptInvite(
              global.my.gc?.split("https://chat.whatsapp.com/")[1]
            )
            .then(async (grupnya) => {
              await linux.chatModify({ archive: true }, grupnya, []);
              db.set[botNumber].join = true;
            });
        }
      }
    }
    if (receivedPendingNotifications == "true") {
      console.log("Please wait About 1 Minute...");
      linux.ev.flush();
    }
  });

  linux.ev.on("contacts.update", (update) => {
    for (let contact of update) {
      let id = linux.decodeJid(contact.id);
      if (store && store.contacts)
        store.contacts[id] = { id, name: contact.notify };
    }
  });

  linux.ev.on("call", async (call) => {
    let botNumber = await linux.decodeJid(linux.user.id);
    if (db.set[botNumber].anticall) {
      for (let id of call) {
        if (id.status === "offer") {
          let msg = await linux.sendMessage(id.from, {
            text: `Saat Ini, Kami Tidak Dapat Menerima Panggilan ${
              id.isVideo ? "Video" : "Suara"
            }.\nJika @${
              id.from.split("@")[0]
            } Memerlukan Bantuan, Silakan Hubungi Owner :)`,
            mentions: [id.from],
          });
          await linux.sendContact(id.from, global.owner, msg);
          await linux.rejectCall(id.id, id.from);
        }
      }
    }
  });

  linux.ev.on("groups.update", async (update) => {
    await GroupUpdate(linux, update, store);
  });

  linux.ev.on("group-participants.update", async (update) => {
    await GroupParticipantsUpdate(linux, update, store);
  });

  linux.ev.on("messages.upsert", async (message) => {
    await MessagesUpsert(linux, message, store);
  });

  return linux;
}

startLinuxAi();

let file = require.resolve(__filename);
fs.watchFile(file, () => {
  fs.unwatchFile(file);
  console.log(chalk.redBright(`Update ${__filename}`));
  delete require.cache[file];
  require(file);
});
