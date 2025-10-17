import express from "express";
import makeWASocket, {
  useMultiFileAuthState,
  fetchLatestBaileysVersion,
} from "@whiskeysockets/baileys";
import qrcode from "qrcode";
import fetch from "node-fetch";
import dotenv from "dotenv";
import fs from "fs";

dotenv.config();

const app = express();
app.use(express.json());

const SESSION_PATH = process.env.SESSION_FOLDER || "./session_data";
if (!fs.existsSync(SESSION_PATH)) fs.mkdirSync(SESSION_PATH, { recursive: true });

let sock;
let qrData = null;
let ready = false;

async function startSock() {
  const { state, saveCreds } = await useMultiFileAuthState(SESSION_PATH);
  const { version } = await fetchLatestBaileysVersion();

  sock = makeWASocket({
    version,
    printQRInTerminal: false, 
    auth: state,
  });

  sock.ev.on("connection.update", async (update) => {
    const { connection, qr } = update;
    if (qr) {
      qrData = qr;
      console.log("QR generado — escanéalo con WhatsApp Web");
    }
    if (connection === "open") {
      ready = true;
      console.log("✅ Conectado a WhatsApp!");
    }
    if (connection === "close") {
      ready = false;
      console.log("❌ Desconectado, reintentando...");
      startSock();
    }
  });

  sock.ev.on("creds.update", saveCreds);

  sock.ev.on("messages.upsert", async (m) => {
    const msg = m.messages[0];
    if (!msg.message || msg.key.fromMe) return;
    const from = msg.key.remoteJid;
    const body =
      msg.message.conversation ||
      msg.message.extendedTextMessage?.text ||
      msg.message?.imageMessage?.caption ||
      "";

    console.log(`💬 Mensaje de ${from}: ${body}`);

    if (process.env.LARAVEL_API) {
      try {
        await fetch(process.env.LARAVEL_API, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "x-service-key": process.env.SECURE_KEY,
          },
          body: JSON.stringify({ from, body }),
        });
      } catch (err) {
        console.error("Error al reenviar a Laravel:", err.message);
      }
    } else {
      console.warn("LARAVEL_API no está configurado; omitiendo reenvío.");
    }
  });
}

await startSock();

app.get("/status", (req, res) => {
  res.json({ ready, user: sock?.user || null });
});

app.get("/qr", async (req, res) => {
  if (ready) return res.send("<h3>✅ Ya está conectado</h3>");
  if (!qrData) return res.send("⏳ QR aún no generado");
  const dataUrl = await qrcode.toDataURL(qrData);
  res.send(`<img src="${dataUrl}" /> <p>Escanéalo con WhatsApp (Dispositivos vinculados → Vincular dispositivo)</p>`);
});

app.post("/send", async (req, res) => {
  const apiKey = req.headers["x-service-key"];
  if (apiKey !== process.env.SECURE_KEY)
    return res.status(401).json({ error: "No autorizado" });

  if (!ready) return res.status(503).json({ error: "Cliente no conectado" });

  const { to, message } = req.body;
  if (!to || !message)
    return res.status(400).json({ error: "Falta 'to' o 'message'" });

  try {
    const jid = to.includes("@s.whatsapp.net") ? to : `${to}@s.whatsapp.net`;
    const sentMsg = await sock.sendMessage(jid, { text: message });
    res.json({ success: true, id: sentMsg.key.id });
  } catch (err) {
    console.error("Error enviando mensaje:", err);
    res.status(500).json({ error: err.message });
  }
});

const port = process.env.PORT || 3001;
app.listen(port, () =>
  console.log(`🚀 WhatsApp microservice corriendo en http://localhost:${port}`)
);
