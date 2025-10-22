import app from "./src/app.js";
import whatsappService from "./src/services/whatsapp.service.js";
import { config } from "./src/config/env.js";

await whatsappService.start();

app.listen(config.port, config.host, () => {
  console.log(`\n api running\n`); 
});