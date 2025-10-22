import app from "./src/app.js";
import whatsappService from "./src/services/whatsapp.service.js";
import { config } from "./src/config/env.js";

await whatsappService.start();

app.listen(config.port, () => {
  console.log(`WhatsApp API corriendo en http://localhost:${config.port}`);
  console.log(`Ver QR en: http://localhost:${config.port}/api/qr`);
});