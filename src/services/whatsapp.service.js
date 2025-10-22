import makeWASocket, {
  useMultiFileAuthState,
  fetchLatestBaileysVersion,
} from "@whiskeysockets/baileys";
import fs from "fs";
import { config } from "../config/env.js";

class WhatsAppService {
  constructor() {
    this.sock = null;
    this.qrData = null;
    this.ready = false;
    this.messageHandlers = [];
    
    if (!fs.existsSync(config.sessionPath)) {
      fs.mkdirSync(config.sessionPath, { recursive: true });
    }
  }

  async start() {
    const { state, saveCreds } = await useMultiFileAuthState(config.sessionPath);
    const { version } = await fetchLatestBaileysVersion();

    this.sock = makeWASocket({
      version,
      printQRInTerminal: false,
      auth: state,
    });

    this.setupEventHandlers(saveCreds);
  }

  setupEventHandlers(saveCreds) {
    this.sock.ev.on("connection.update", async (update) => {
      const { connection, qr } = update;
      
      if (qr) {
        this.qrData = qr;
        console.log("📱 QR generado — escanéalo con WhatsApp Web");
      }
      
      if (connection === "open") {
        this.ready = true;
        console.log("✅ Conectado a WhatsApp!");
      }
      
      if (connection === "close") {
        this.ready = false;
        console.log("❌ Desconectado, reintentando...");
        setTimeout(() => this.start(), 3000);
      }
    });

    this.sock.ev.on("creds.update", saveCreds);

    this.sock.ev.on("messages.upsert", async (m) => {
      const msg = m.messages[0];
      if (!msg.message || msg.key.fromMe) return;

      const from = msg.key.remoteJid;
      const body =
        msg.message.conversation ||
        msg.message.extendedTextMessage?.text ||
        msg.message?.imageMessage?.caption ||
        "";

      console.log(`💬 Mensaje de ${from}: ${body}`);

      // Ejecutar handlers registrados
      for (const handler of this.messageHandlers) {
        try {
          await handler({ from, body, msg });
        } catch (err) {
          console.error("Error en message handler:", err.message);
        }
      }
    });
  }

  onMessage(handler) {
    this.messageHandlers.push(handler);
  }

  async sendMessage(to, message) {
    if (!this.ready) {
      throw new Error("Cliente no conectado");
    }

    const jid = to.includes("@s.whatsapp.net") ? to : `${to}@s.whatsapp.net`;
    const sentMsg = await this.sock.sendMessage(jid, { text: message });
    return sentMsg;
  }

  getStatus() {
    return {
      ready: this.ready,
      user: this.sock?.user || null,
    };
  }

  getQR() {
    return this.qrData;
  }

  isReady() {
    return this.ready;
  }
}

export default new WhatsAppService();