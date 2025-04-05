require("../settings");
const fs = require("fs");
const path = require("path");
const axios = require("axios");
const chalk = require("chalk");
const FileType = require("file-type");
const PhoneNumber = require("awesome-phonenumber");
const {
  jidNormalizedUser,
  proto,
  getBinaryNodeChild,
  generateWAMessageContent,
  areJidsSameUser,
  extractMessageContent,
  downloadContentFromMessage,
  generateWAMessageFromContent,
  jidDecode,
  generateWAMessage,
  getContentType,
  getDevice,
} = require("@whiskeysockets/baileys");

async function GroupUpdate(linux, update, store) {
  try {
    for (let n of update) {
      if (store.groupMetadata[n.id]) {
        store.groupMetadata[n.id] = {
          ...(store.groupMetadata[n.id] || {}),
          ...(n || {}),
        };
      }
    }
  } catch (e) {
    throw e;
  }
}

 async function GroupParticipantsUpdate(
  linux,
  { id, participants, action },
  store
) {
  try {
    if (
      global.db.groups &&
      global.db.groups[id] &&
      store.groupMetadata &&
      store.groupMetadata[id]
    ) {
    }
  } catch (e) {
    throw e;
  }
}

async function LoadDataBase(linux, m) {
  try {
    const botNumber = await linux.decodeJid(linux.user.id);
    const isNumber = (x) => typeof x === "number" && !isNaN(x);
    const isBoolean = (x) => typeof x === "boolean" && Boolean(x);
    let user = global.db.users[m.sender];
    let setBot = global.db.set[botNumber];
    if (typeof setBot !== "object") global.db.set[botNumber] = {};
    if (setBot) {
      if (!("lang" in setBot)) setBot.lang = "id";
      if (!("uang" in setBot)) setBot.uang = 0;
      if (!("status" in setBot)) setBot.status = 0;
      if (!("anticall" in setBot)) setBot.anticall = true;
      if (!("autobio" in setBot)) setBot.autobio = false;
      if (!("autoread" in setBot)) setBot.autoread = true;
      if (!("autotyping" in setBot)) setBot.autotyping = false;
      if (!("readsw" in setBot)) setBot.readsw = false;
      if (!("multiprefix" in setBot)) setBot.multiprefix = true;
      if (!("template" in setBot)) setBot.template = "textMessage";
    } else {
      global.db.set[botNumber] = {
        lang: "id",
        status: 0,
        anticall: true,
        autobio: false,
        autoread: true,
        autotyping: false,
        readsw: false,
        multiprefix: true,
        template: "textMessage",
      };
    }

    if (m.isGroup) {
      let group = global.db.groups[m.chat];
      if (typeof group !== "object") global.db.groups[m.chat] = {};
      if (group) {
        if (!("nsfw" in group)) group.nsfw = false;
        if (!("mute" in group)) group.mute = false;
        if (!("setinfo" in group)) group.setinfo = true;
        if (!("antilink" in group)) group.antilink = false;
        if (!("antitoxic" in group)) group.antitoxic = false;
        if (!("welcome" in group)) group.welcome = true;
        if (!("antivirtex" in group)) group.antivirtex = false;
        if (!("antidelete" in group)) group.antidelete = false;
        if (!("waktusholat" in group)) group.waktusholat = false;
      } else {
        global.db.groups[m.chat] = {
          nsfw: false,
          mute: false,
          setinfo: true,
          antilink: false,
          antitoxic: false,
          welcome: true,
          antivirtex: false,
          antidelete: false,
          waktusholat: false,
        };
      }
    }
  } catch (e) {
    throw e;
  }
}

async function MessagesUpsert(linux, message, store) {
  try {
    let botNumber = await linux.decodeJid(linux.user.id);
    const msg = message.messages[0];
    if (store.groupMetadata && Object.keys(store.groupMetadata).length === 0)
      store.groupMetadata = await linux.groupFetchAllParticipating();
    const type = msg.message
      ? getContentType(msg.message) || Object.keys(msg.message)[0]
      : "";
    if (!msg.key.fromMe && !msg.message && message.type === "notify") return;
    const m = await Serialize(linux, msg, store);
    require("../linuxai")(linux, m, message, store);
    if (type === "interactiveResponseMessage" && m.quoted && m.quoted.fromMe) {
      let apb = await generateWAMessage(
        m.chat,
        {
          text: JSON.parse(m.msg.nativeFlowResponseMessage.paramsJson).id,
          mentions: m.mentionedJid,
        },
        {
          userJid: linux.user.id,
          quoted: m.quoted,
        }
      );
      apb.key = msg.key;
      apb.key.fromMe = areJidsSameUser(m.sender, linux.user.id);
      if (m.isGroup) apb.participant = m.sender;
      let pbr = {
        ...msg,
        messages: [proto.WebMessageInfo.fromObject(apb)],
        type: "append",
      };
      linux.ev.emit("messages.upsert", pbr);
    }
    if (
      global.db.set &&
      global.db.set[botNumber] &&
      global.db.set[botNumber].readsw
    ) {
      if (msg.key.remoteJid === "status@broadcast") {
        await linux.readMessages([msg.key]);
        if (/protocolMessage/i.test(type))
          linux.sendFromOwner(
            global.owner,
            "Status dari @" +
              msg.key.participant.split("@")[0] +
              " Telah dihapus",
            msg,
            { mentions: [msg.key.participant] }
          );
        if (
          /(audioMessage|imageMessage|videoMessage|extendedTextMessage)/i.test(
            type
          )
        ) {
          let keke =
            type == "extendedTextMessage"
              ? `Story Teks Berisi : ${
                  msg.message.extendedTextMessage.text
                    ? msg.message.extendedTextMessage.text
                    : ""
                }`
              : type == "imageMessage"
              ? `Story Gambar ${
                  msg.message.imageMessage.caption
                    ? "dengan Caption : " + msg.message.imageMessage.caption
                    : ""
                }`
              : type == "videoMessage"
              ? `Story Video ${
                  msg.message.videoMessage.caption
                    ? "dengan Caption : " + msg.message.videoMessage.caption
                    : ""
                }`
              : type == "audioMessage"
              ? "Story Audio"
              : "\nTidak diketahui cek saja langsung";
          await linux.sendFromOwner(
            global.owner,
            `Melihat story dari @${msg.key.participant.split("@")[0]}\n${keke}`,
            msg,
            { mentions: [msg.key.participant] }
          );
        }
      }
    }
  } catch (e) {
    throw e;
  }
}

async function Solving(linux, store) {
  linux.public = true;

  linux.serializeM = (m) => MessagesUpsert(linux, m, store);

  linux.decodeJid = (jid) => {
    if (!jid) return jid;
    if (/:\d+@/gi.test(jid)) {
      let decode = jidDecode(jid) || {};
      return (
        (decode.user && decode.server && decode.user + "@" + decode.server) ||
        jid
      );
    } else return jid;
  };

  linux.getName = (jid, withoutContact = false) => {
    const id = linux.decodeJid(jid);
    if (id.endsWith("@g.us")) {
      const groupInfo = store.contacts[id] || linux.groupMetadata(id) || {};
      return Promise.resolve(
        groupInfo.name ||
          groupInfo.subject ||
          PhoneNumber("+" + id.replace("@g.us", "")).getNumber("international")
      );
    } else {
      if (id === "0@s.whatsapp.net") {
        return "WhatsApp";
      }
      const contactInfo = store.contacts[id] || {};
      return withoutContact
        ? ""
        : contactInfo.name ||
            contactInfo.subject ||
            contactInfo.verifiedName ||
            PhoneNumber("+" + id.replace("@s.whatsapp.net", "")).getNumber(
              "international"
            );
    }
  };

  linux.sendContact = async (jid, kon, quoted = "", opts = {}) => {
    let list = [];
    for (let i of kon) {
      list.push({
        displayName: await linux.getName(i + "@s.whatsapp.net"),
        vcard: `BEGIN:VCARD\nVERSION:3.0\nN:${await linux.getName(
          i + "@s.whatsapp.net"
        )}\nFN:${await linux.getName(
          i + "@s.whatsapp.net"
        )}\nitem1.TEL;waid=${i}:${i}\nitem1.X-ABLabel:Ponsel\nitem2.ADR:;;Indonesia;;;;\nitem2.X-ABLabel:Region\nEND:VCARD`, //vcard: `BEGIN:VCARD\nVERSION:3.0\nN:${await linux.getName(i + '@s.whatsapp.net')}\nFN:${await linux.getName(i + '@s.whatsapp.net')}\nitem1.TEL;waid=${i}:${i}\nitem1.X-ABLabel:Ponsel\nitem2.EMAIL;type=INTERNET:whatsapp@gmail.com\nitem2.X-ABLabel:Email\nitem3.URL:https://instagram.com/linux_dev\nitem3.X-ABLabel:Instagram\nitem4.ADR:;;Indonesia;;;;\nitem4.X-ABLabel:Region\nEND:VCARD`
      });
    }
    linux.sendMessage(
      jid,
      {
        contacts: { displayName: `${list.length} Kontak`, contacts: list },
        ...opts,
      },
      { quoted }
    );
  };

  linux.profilePictureUrl = async (jid, type = "image", timeoutMs) => {
    const result = await linux.query(
      {
        tag: "iq",
        attrs: {
          target: jidNormalizedUser(jid),
          to: "@s.whatsapp.net",
          type: "get",
          xmlns: "w:profile:picture",
        },
        content: [
          {
            tag: "picture",
            attrs: {
              type,
              query: "url",
            },
          },
        ],
      },
      timeoutMs
    );
    const child = getBinaryNodeChild(result, "picture");
    return child?.attrs?.url;
  };

  linux.setStatus = (status) => {
    linux.query({
      tag: "iq",
      attrs: {
        to: "@s.whatsapp.net",
        type: "set",
        xmlns: "status",
      },
      content: [
        {
          tag: "status",
          attrs: {},
          content: Buffer.from(status, "utf-8"),
        },
      ],
    });
    return status;
  };

  linux.sendPoll = (jid, name = "", values = [], selectableCount = 1) => {
    return linux.sendMessage(jid, { poll: { name, values, selectableCount } });
  };

  linux.sendFileUrl = async (jid, url, caption, quoted, options = {}) => {
    async function getFileUrl(res, mime) {
      if (mime && mime.includes("gif")) {
        return linux.sendMessage(
          jid,
          { video: res.data, caption: caption, gifPlayback: true, ...options },
          { quoted }
        );
      } else if (mime && mime === "application/pdf") {
        return linux.sendMessage(
          jid,
          {
            document: res.data,
            mimetype: "application/pdf",
            caption: caption,
            ...options,
          },
          { quoted }
        );
      } else if (mime && mime.includes("image")) {
        return linux.sendMessage(
          jid,
          { image: res.data, caption: caption, ...options },
          { quoted }
        );
      } else if (mime && mime.includes("video")) {
        return linux.sendMessage(
          jid,
          {
            video: res.data,
            caption: caption,
            mimetype: "video/mp4",
            ...options,
          },
          { quoted }
        );
      } else if (mime && mime.includes("audio")) {
        return linux.sendMessage(
          jid,
          { audio: res.data, mimetype: "audio/mpeg", ...options },
          { quoted }
        );
      }
    }

    const res = await axios.get(url, { responseType: "arraybuffer" });
    let mime = res.headers["content-type"];
    if (!mime || mime.includes("octet-stream")) {
      const fileType = await FileType.fromBuffer(res.data);
      mime = fileType ? fileType.mime : null;
    }
    const hasil = await getFileUrl(res, mime);
    return hasil;
  };

  linux.sendFakeLink = async (
    jid,
    text,
    title,
    body,
    thumbnail,
    myweb,
    options = {}
  ) => {
    await linux.sendMessage(
      jid,
      {
        text: text,
        contextInfo: {
          externalAdReply: {
            title: title,
            body: body,
            previewType: "PHOTO",
            thumbnailUrl: myweb,
            thumbnail: thumbnail,
            sourceUrl: myweb,
          },
        },
      },
      { ...options }
    );
  };

  linux.sendFromOwner = async (jid, text, quoted, options = {}) => {
    for (const a of jid) {
      await linux.sendMessage(
        a.replace(/[^0-9]/g, "") + "@s.whatsapp.net",
        { text, ...options },
        { quoted }
      );
    }
  };

  linux.sendTextMentions = async (jid, text, quoted, options = {}) =>
    linux.sendMessage(
      jid,
      {
        text: text,
        mentions: [...text.matchAll(/@(\d{0,16})/g)].map(
          (v) => v[1] + "@s.whatsapp.net"
        ),
        ...options,
      },
      { quoted }
    );

  linux.sendAsSticker = async (jid, path, quoted, options = {}) => {
    const buff = Buffer.isBuffer(path)
      ? path
      : /^data:.*?\/.*?;base64,/i.test(path)
      ? Buffer.from(path.split`,`[1], "base64")
      : /^https?:\/\//.test(path)
      ? await await getBuffer(path)
      : fs.existsSync(path)
      ? fs.readFileSync(path)
      : Buffer.alloc(0);
    const result = await writeExif(buff, options);
    await linux.sendMessage(
      jid,
      { sticker: { url: result }, ...options },
      { quoted }
    );
    return buff;
  };

  linux.downloadAndSaveMediaMessage = async (
    message,
    filename,
    attachExtension = true
  ) => {
    const quoted = message.msg || message;
    const mime = quoted.mimetype || "";
    const messageType = (message.mtype || mime.split("/")[0]).replace(
      /Message/gi,
      ""
    );
    const stream = await downloadContentFromMessage(quoted, messageType);
    let buffer = Buffer.from([]);
    for await (const chunk of stream) {
      buffer = Buffer.concat([buffer, chunk]);
    }
    const type = await FileType.fromBuffer(buffer);
    const trueFileName = attachExtension
      ? `./database/sampah/${filename ? filename : Date.now()}.${type.ext}`
      : filename;
    await fs.promises.writeFile(trueFileName, buffer);
    return trueFileName;
  };

  linux.getFile = async (PATH, save) => {
    let res;
    let data = Buffer.isBuffer(PATH)
      ? PATH
      : /^data:.*?\/.*?;base64,/i.test(PATH)
      ? Buffer.from(PATH.split`,`[1], "base64")
      : /^https?:\/\//.test(PATH)
      ? await (res = await getBuffer(PATH))
      : fs.existsSync(PATH)
      ? ((filename = PATH), fs.readFileSync(PATH))
      : typeof PATH === "string"
      ? PATH
      : Buffer.alloc(0);
    let type = (await FileType.fromBuffer(data)) || {
      mime: "application/octet-stream",
      ext: ".bin",
    };
    filename = path.join(
      __filename,
      "../database/sampah/" + new Date() * 1 + "." + type.ext
    );
    if (data && save) fs.promises.writeFile(filename, data);
    return {
      res,
      filename,
      size: await getSizeMedia(data),
      ...type,
      data,
    };
  };

  linux.sendMedia = async (
    jid,
    path,
    fileName = "",
    caption = "",
    quoted = "",
    options = {}
  ) => {
    const { mime, data, filename } = await linux.getFile(path, true);
    const isWebpSticker = options.asSticker || /webp/.test(mime);
    let type = "document",
      mimetype = mime,
      pathFile = filename;
    if (isWebpSticker) {
      const { writeExif } = require("../lib/exif");
      const media = { mimetype: mime, data };
      pathFile = await writeExif(media, {
        packname: options.packname || global.packname,
        author: options.author || global.author,
        categories: options.categories || [],
      });
      await fs.promises.unlink(filename);
      type = "sticker";
      mimetype = "image/webp";
    } else if (/image|video|audio/.test(mime)) {
      type = mime.split("/")[0];
    }
    await linux.sendMessage(
      jid,
      { [type]: { url: pathFile }, caption, mimetype, fileName, ...options },
      { quoted, ...options }
    );
    return fs.promises.unlink(pathFile);
  };

  linux.sendButtonMsg = async (
    jid,
    body = "",
    footer = "",
    title = "",
    media,
    buttons = [],
    quoted,
    options = {}
  ) => {
    const { type, data, url, ...rest } = media || {};
    const msg = await generateWAMessageFromContent(
      jid,
      {
        viewOnceMessage: {
          message: {
            messageContextInfo: {
              deviceListMetadata: {},
              deviceListMetadataVersion: 2,
            },
            interactiveMessage: proto.Message.InteractiveMessage.create({
              body: proto.Message.InteractiveMessage.Body.create({
                text: body,
              }),
              footer: proto.Message.InteractiveMessage.Footer.create({
                text: footer,
              }),
              header: proto.Message.InteractiveMessage.Header.fromObject({
                title,
                hasMediaAttachment: !!media,
                ...(media
                  ? await generateWAMessageContent(
                      {
                        [type]: url ? { url } : data,
                        ...rest,
                      },
                      {
                        upload: linux.waUploadToServer,
                      }
                    )
                  : {}),
              }),
              nativeFlowMessage:
                proto.Message.InteractiveMessage.NativeFlowMessage.create({
                  buttons: buttons.map((a) => {
                    return {
                      name: a.name,
                      buttonParamsJson: JSON.stringify(
                        a.buttonParamsJson
                          ? typeof a.buttonParamsJson === "string"
                            ? JSON.parse(a.buttonParamsJson)
                            : a.buttonParamsJson
                          : ""
                      ),
                    };
                  }),
                }),
              contextInfo: {
                forwardingScore: 10,
                isForwarded: true,
                forwardedNewsletterMessageInfo: {
                  newsletterJid: global.my.ch,
                  serverMessageId: null,
                  newsletterName: "Join For More Info",
                },
                mentionedJid: options.mentions || [],
                ...options.contextInfo,
                ...(quoted
                  ? {
                      stanzaId: quoted.key.id,
                      remoteJid: quoted.key.remoteJid,
                      participant:
                        quoted.key.participant || quoted.key.remoteJid,
                      fromMe: quoted.key.fromMe,
                      quotedMessage: quoted.message,
                    }
                  : {}),
              },
            }),
          },
        },
      },
      {}
    );
    const hasil = await linux.relayMessage(msg.key.remoteJid, msg.message, {
      messageId: msg.key.id,
    });
    return hasil;
  };

  linux.sendCarouselMsg = async (
    jid,
    body = "",
    footer = "",
    cards = [],
    options = {}
  ) => {
    async function getImageMsg(url) {
      const { imageMessage } = await generateWAMessageContent(
        { image: { url } },
        { upload: linux.waUploadToServer }
      );
      return imageMessage;
    }
    const cardPromises = cards.map(async (a) => {
      const imageMessage = await getImageMsg(a.url);
      return {
        header: {
          imageMessage: imageMessage,
          hasMediaAttachment: true,
        },
        body: { text: a.body },
        footer: { text: a.footer },
        nativeFlowMessage: {
          buttons: a.buttons.map((b) => ({
            name: b.name,
            buttonParamsJson: JSON.stringify(
              b.buttonParamsJson ? JSON.parse(b.buttonParamsJson) : ""
            ),
          })),
        },
      };
    });

    const cardResults = await Promise.all(cardPromises);
    const msg = await generateWAMessageFromContent(
      jid,
      {
        viewOnceMessage: {
          message: {
            messageContextInfo: {
              deviceListMetadata: {},
              deviceListMetadataVersion: 2,
            },
            interactiveMessage: proto.Message.InteractiveMessage.create({
              body: proto.Message.InteractiveMessage.Body.create({
                text: body,
              }),
              footer: proto.Message.InteractiveMessage.Footer.create({
                text: footer,
              }),
              carouselMessage:
                proto.Message.InteractiveMessage.CarouselMessage.create({
                  cards: cardResults,
                  messageVersion: 1,
                }),
            }),
          },
        },
      },
      {}
    );
    const hasil = await linux.relayMessage(msg.key.remoteJid, msg.message, {
      messageId: msg.key.id,
    });
    return hasil;
  };

  return linux;
}

async function Serialize(linux, m, store) {
  const botNumber = linux.decodeJid(linux.user.id);
  if (!m) return m;
  if (m.key) {
    m.id = m.key.id;
    m.chat = m.key.remoteJid;
    m.fromMe = m.key.fromMe;
    m.isBot =
      ["HSK", "BAE", "B1E", "3EB0", "WA"].some(
        (a) => m.id.startsWith(a) && [12, 16, 20, 22, 40].includes(m.id.length)
      ) || false;
    m.isGroup = m.chat.endsWith("@g.us");
    m.sender = linux.decodeJid(
      (m.fromMe && linux.user.id) ||
        m.participant ||
        m.key.participant ||
        m.chat ||
        ""
    );
    if (m.isGroup) {
      m.metadata =
        store.groupMetadata[m.chat] || (await linux.groupMetadata(m.chat));
      m.admins = m.metadata.participants.reduce(
        (a, b) =>
          (b.admin ? a.push({ id: b.id, admin: b.admin }) : [...a]) && a,
        []
      );
      m.isAdmin = m.admins.some((b) => b.id === m.sender);
      m.participant = m.key.participant;
      m.isBotAdmin = !!m.admins.find((member) => member.id === botNumber);
    }
  }
  if (m.message) {
    m.type = getContentType(m.message) || Object.keys(m.message)[0];
    m.msg = /viewOnceMessage/i.test(m.type)
      ? m.message[m.type].message[getContentType(m.message[m.type].message)]
      : extractMessageContent(m.message[m.type]) || m.message[m.type];
    m.body =
      m.message?.conversation ||
      m.msg?.text ||
      m.msg?.conversation ||
      m.msg?.caption ||
      m.msg?.selectedButtonId ||
      m.msg?.singleSelectReply?.selectedRowId ||
      m.msg?.selectedId ||
      m.msg?.contentText ||
      m.msg?.selectedDisplayText ||
      m.msg?.title ||
      m.msg?.name ||
      "";
    m.mentionedJid = m.msg.contextInfo ? m.msg.contextInfo.mentionedJid : [];
    m.text =
      m.msg?.text ||
      m.msg?.caption ||
      m.message?.conversation ||
      m.msg?.contentText ||
      m.msg?.selectedDisplayText ||
      m.msg?.title ||
      "";
    m.prefix = /^[°•π÷×¶∆£¢€¥®™+✓_=|~!?@#$%^&.©^]/gi.test(m.body)
      ? m.body.match(/^[°•π÷×¶∆£¢€¥®™+✓_=|~!?@#$%^&.©^]/gi)[0]
      : /[\uD800-\uDBFF][\uDC00-\uDFFF]/gi.test(m.body)
      ? m.body.match(/[\uD800-\uDBFF][\uDC00-\uDFFF]/gi)[0]
      : "";
    m.command =
      m.body && m.body.replace(m.prefix, "").trim().split(/ +/).shift();
    m.args =
      m.body
        ?.trim()
        .replace(
          new RegExp(
            "^" + m.prefix?.replace(/[.*=+:\-?^${}()|[\]\\]|\s/g, "\\$&"),
            "i"
          ),
          ""
        )
        .replace(m.command, "")
        .split(/ +/)
        .filter((a) => a) || [];
    m.device = getDevice(m.id);
    m.expiration = m.msg?.contextInfo?.expiration || 0;
    m.timestamp =
      (typeof m.messageTimestamp === "number"
        ? m.messageTimestamp
        : m.messageTimestamp.low
        ? m.messageTimestamp.low
        : m.messageTimestamp.high) || m.msg.timestampMs * 1000;
    m.isMedia = !!m.msg?.mimetype || !!m.msg?.thumbnailDirectPath;
    if (m.isMedia) {
      m.mime = m.msg?.mimetype;
      m.size = m.msg?.fileLength;
      m.height = m.msg?.height || "";
      m.width = m.msg?.width || "";
      if (/webp/i.test(m.mime)) {
        m.isAnimated = m.msg?.isAnimated;
      }
    }
    m.quoted = m.msg?.contextInfo?.quotedMessage || null;
    if (m.quoted) {
      m.quoted.message = extractMessageContent(
        m.msg?.contextInfo?.quotedMessage
      );
      m.quoted.type =
        getContentType(m.quoted.message) || Object.keys(m.quoted.message)[0];
      m.quoted.id = m.msg.contextInfo.stanzaId;
      m.quoted.device = getDevice(m.quoted.id);
      m.quoted.chat = m.msg.contextInfo.remoteJid || m.chat;
      m.quoted.isBot = m.quoted.id
        ? ["HSK", "BAE", "B1E", "3EB0", "WA"].some(
            (a) =>
              m.quoted.id.startsWith(a) &&
              [12, 16, 20, 22, 40].includes(m.quoted.id.length)
          )
        : false;
      m.quoted.sender = linux.decodeJid(m.msg.contextInfo.participant);
      m.quoted.fromMe = m.quoted.sender === linux.decodeJid(linux.user.id);
      m.quoted.text =
        m.quoted.caption ||
        m.quoted.conversation ||
        m.quoted.contentText ||
        m.quoted.selectedDisplayText ||
        m.quoted.title ||
        "";
      m.quoted.msg =
        extractMessageContent(m.quoted.message[m.quoted.type]) ||
        m.quoted.message[m.quoted.type];
      m.quoted.mentionedJid = m.msg.contextInfo
        ? m.msg.contextInfo.mentionedJid
        : [];
      m.quoted.body =
        m.quoted.msg?.text ||
        m.quoted.msg?.caption ||
        m.quoted?.message?.conversation ||
        m.quoted.msg?.selectedButtonId ||
        m.quoted.msg?.singleSelectReply?.selectedRowId ||
        m.quoted.msg?.selectedId ||
        m.quoted.msg?.contentText ||
        m.quoted.msg?.selectedDisplayText ||
        m.quoted.msg?.title ||
        m.quoted?.msg?.name ||
        "";
      m.getQuotedObj = async () => {
        if (!m.quoted.id) return false;
        let q = await store.loadMessage(m.chat, m.quoted.id, linux);
        return await Serialize(linux, q, store);
      };
      m.quoted.key = {
        remoteJid: m.msg?.contextInfo?.remoteJid || m.chat,
        participant: m.quoted.sender,
        fromMe: areJidsSameUser(
          linux.decodeJid(m.msg?.contextInfo?.participant),
          linux.decodeJid(linux?.user?.id)
        ),
        id: m.msg?.contextInfo?.stanzaId,
      };
      m.quoted.isGroup = m.quoted.chat.endsWith("@g.us");
      m.quoted.mentions = m.quoted.msg?.contextInfo?.mentionedJid || [];
      m.quoted.body =
        m.quoted.msg?.text ||
        m.quoted.msg?.caption ||
        m.quoted?.message?.conversation ||
        m.quoted.msg?.selectedButtonId ||
        m.quoted.msg?.singleSelectReply?.selectedRowId ||
        m.quoted.msg?.selectedId ||
        m.quoted.msg?.contentText ||
        m.quoted.msg?.selectedDisplayText ||
        m.quoted.msg?.title ||
        m.quoted?.msg?.name ||
        "";
      m.quoted.prefix = /^[°•π÷×¶∆£¢€¥®™+✓_=|~!?@#$%^&.©^]/gi.test(
        m.quoted.body
      )
        ? m.quoted.body.match(/^[°•π÷×¶∆£¢€¥®™+✓_=|~!?@#$%^&.©^]/gi)[0]
        : /[\uD800-\uDBFF][\uDC00-\uDFFF]/gi.test(m.quoted.body)
        ? m.quoted.body.match(/[\uD800-\uDBFF][\uDC00-\uDFFF]/gi)[0]
        : "";
      m.quoted.command =
        m.quoted.body &&
        m.quoted.body.replace(m.quoted.prefix, "").trim().split(/ +/).shift();
      m.quoted.isMedia =
        !!m.quoted.msg?.mimetype || !!m.quoted.msg?.thumbnailDirectPath;
      if (m.quoted.isMedia) {
        m.quoted.mime = m.quoted.msg?.mimetype;
        m.quoted.size = m.quoted.msg?.fileLength;
        m.quoted.height = m.quoted.msg?.height || "";
        m.quoted.width = m.quoted.msg?.width || "";
        if (/webp/i.test(m.quoted.mime)) {
          m.quoted.isAnimated = m?.quoted?.msg?.isAnimated || false;
        }
      }
      m.quoted.fakeObj = proto.WebMessageInfo.fromObject({
        key: {
          remoteJid: m.quoted.chat,
          fromMe: m.quoted.fromMe,
          id: m.quoted.id,
        },
        message: m.quoted,
        ...(m.isGroup ? { participant: m.quoted.sender } : {}),
      });
      m.quoted.download = async () => {
        const quotednya = m.quoted.msg || m.quoted;
        const mimenya = quotednya.mimetype || "";
        const messageType = (m.quoted.type || mimenya.split("/")[0]).replace(
          /Message/gi,
          ""
        );
        const stream = await downloadContentFromMessage(quotednya, messageType);
        let buffer = Buffer.from([]);
        for await (const chunk of stream) {
          buffer = Buffer.concat([buffer, chunk]);
        }
        return buffer;
      };
      m.quoted.delete = () => {
        linux.sendMessage(m.quoted.chat, {
          delete: {
            remoteJid: m.quoted.chat,
            fromMe: m.isBotAdmins ? false : true,
            id: m.quoted.id,
            participant: m.quoted.sender,
          },
        });
      };
    }
  }

  m.download = async () => {
    const quotednya = m.msg || m.quoted;
    const mimenya = quotednya.mimetype || "";
    const messageType = (m.type || mimenya.split("/")[0]).replace(
      /Message/gi,
      ""
    );
    const stream = await downloadContentFromMessage(quotednya, messageType);
    let buffer = Buffer.from([]);
    for await (const chunk of stream) {
      buffer = Buffer.concat([buffer, chunk]);
    }
    return buffer;
  };

  m.copy = () =>
    Serialize(
      linux,
      proto.WebMessageInfo.fromObject(proto.WebMessageInfo.toObject(m))
    );

  m.reply = async (text, options = {}) => {
    const chatId = options?.chat ? options.chat : m.chat;
    const caption = options.caption || "";
    const quoted = options?.quoted ? options.quoted : m;
    try {
      if (/^https?:\/\//.test(text)) {
        const data = await axios.get(text, { responseType: "arraybuffer" });
        const mime =
          data.headers["content-type"] ||
          (await FileType.fromBuffer(data.data)).mime;
        if (/gif|image|video|audio|pdf|stream/i.test(mime)) {
          return linux.sendFileUrl(chatId, text, caption, quoted, options);
        } else {
          return linux.sendMessage(
            chatId,
            {
              text: text,
              mentions: [...text.matchAll(/@(\d{0,16})/g)].map(
                (v) => v[1] + "@s.whatsapp.net"
              ),
              ...options,
            },
            { quoted }
          );
        }
      } else {
        return linux.sendMessage(
          chatId,
          {
            text: text,
            mentions: [...text.matchAll(/@(\d{0,16})/g)].map(
              (v) => v[1] + "@s.whatsapp.net"
            ),
            ...options,
          },
          { quoted }
        );
      }
    } catch (e) {
      return linux.sendMessage(
        chatId,
        {
          text: text,
          mentions: [...text.matchAll(/@(\d{0,16})/g)].map(
            (v) => v[1] + "@s.whatsapp.net"
          ),
          ...options,
        },
        { quoted }
      );
    }
  };

  return m;
}

module.exports = {
  GroupUpdate,
  GroupParticipantsUpdate,
  LoadDataBase,
  MessagesUpsert,
  Solving,
};

let file = require.resolve(__filename);
fs.watchFile(file, () => {
  fs.unwatchFile(file);
  console.log(chalk.redBright(`Update ${__filename}`));
  delete require.cache[file];
  require(file);
});
