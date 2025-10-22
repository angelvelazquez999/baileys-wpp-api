import express from "express";
import qrcode from "qrcode";
import whatsappService from "../services/whatsapp.service.js";
import { authenticateAPI } from "../middleware/auth.middleware.js";

const router = express.Router();

router.get("/status", (req, res) => {
  res.json(whatsappService.getStatus());
});

router.get("/qr", async (req, res) => {
  if (whatsappService.isReady()) {
    return res.send(`
      <!DOCTYPE html>
      <html lang="es">
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>WhatsApp conectado</title>
        <style>
          body {
            font-family: system-ui, -apple-system, sans-serif;
            display: flex;
            justify-content: center;
            align-items: center;
            min-height: 100vh;
            margin: 0;
            background: linear-gradient(135deg, #48b018ff 0%, #add7b0ff 100%);
          }
          .container {
            background: white;
            padding: 3rem;
            border-radius: 1rem;
            box-shadow: 0 20px 60px rgba(0,0,0,0.3);
            text-align: center;
          }
          .status {
            font-size: 3rem;
            margin-bottom: 1rem;
          }
          h2 {
            color: #25D366;
            margin: 0;
          }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="status">✅</div>
          <h2>WhatsApp Conectado</h2>
          <p>El servicio está funcionando correctamente</p>
        </div>
      </body>
      </html>
    `);
  }

  const qrData = whatsappService.getQR();
  
  if (!qrData) {
    return res.send(`
      <!DOCTYPE html>
      <html lang="es">
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Generando QR...</title>
        <style>
          body {
            font-family: system-ui, -apple-system, sans-serif;
            display: flex;
            justify-content: center;
            align-items: center;
            min-height: 100vh;
            margin: 0;
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
          }
          .container {
            background: white;
            padding: 3rem;
            border-radius: 1rem;
            box-shadow: 0 20px 60px rgba(0,0,0,0.3);
            text-align: center;
          }
          .spinner {
            border: 4px solid #f3f3f3;
            border-top: 4px solid #667eea;
            border-radius: 50%;
            width: 50px;
            height: 50px;
            animation: spin 1s linear infinite;
            margin: 0 auto 1rem;
          }
          @keyframes spin {
            0% { transform: rotate(0deg); }
            100% { transform: rotate(360deg); }
          }
        </style>
        <script>
          setTimeout(() => location.reload(), 2000);
        </script>
      </head>
      <body>
        <div class="container">
          <div class="spinner"></div>
          <h2>Generando código QR...</h2>
          <p>Espera un momento</p>
        </div>
      </body>
      </html>
    `);
  }

  const dataUrl = await qrcode.toDataURL(qrData);
  
  res.send(`
    <!DOCTYPE html>
    <html lang="es">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Escanear QR - WhatsApp</title>
      <style>
        body {
          font-family: system-ui, -apple-system, sans-serif;
          display: flex;
          justify-content: center;
          align-items: center;
          min-height: 100vh;
          margin: 0;
          background: linear-gradient(135deg, #b2edc7ff 0%, #0cb11cff 100%);
        }
        .container {
          background: white;
          padding: 3rem;
          border-radius: 1rem;
          box-shadow: 0 20px 60px rgba(0,0,0,0.3);
          text-align: center;
          max-width: 500px;
        }
        h1 {
          color: #333;
          margin-top: 0;
        }
        .qr-container {
          background: #f9f9f9;
          padding: 2rem;
          border-radius: 0.5rem;
          margin: 2rem 0;
        }
        img {
          max-width: 100%;
          height: auto;
        }
        .instructions {
          text-align: left;
          background: #f0f0f0;
          padding: 1.5rem;
          border-radius: 0.5rem;
          margin-top: 2rem;
        }
        .instructions ol {
          margin: 0.5rem 0 0 0;
          padding-left: 1.5rem;
        }
        .instructions li {
          margin: 0.5rem 0;
        }
      </style>
      <script>
        setTimeout(() => location.reload(), 30000);
      </script>
    </head>
    <body>
      <div class="container">
        <h1>Vincular WhatsApp</h1>
        <div class="qr-container">
          <img src="${dataUrl}" alt="Código QR de WhatsApp" />
        </div>
        <div class="instructions">
          <strong>Cómo escanear:</strong>
          <ol>
            <li>Abre WhatsApp en tu teléfono</li>
            <li>Ve a <strong>Configuración</strong> o <strong>Ajustes</strong></li>
            <li>Toca <strong>Dispositivos vinculados</strong></li>
            <li>Toca <strong>Vincular un dispositivo</strong></li>
            <li>Escanea este código QR</li>
          </ol>
        </div>
      </div>
    </body>
    </html>
  `);
});

router.post("/send", authenticateAPI, async (req, res) => {
  if (!whatsappService.isReady()) {
    return res.status(503).json({ error: "Cliente no conectado" });
  }

  const { to, message } = req.body;
  
  if (!to || !message) {
    return res.status(400).json({ error: "Falta 'to' o 'message'" });
  }

  try {
    const sentMsg = await whatsappService.sendMessage(to, message);
    res.json({ success: true, id: sentMsg.key.id });
  } catch (err) {
    console.error("Error enviando mensaje:", err);
    res.status(500).json({ error: err.message });
  }
});

export default router;