import dotenv from "dotenv";
dotenv.config();

export const config = {
  port: process.env.PORT || 3001,
  host: process.env.HOST || "0.0.0.0",
  sessionPath: process.env.SESSION_FOLDER || "./session_data",
  secureKey: process.env.SECURE_KEY,
};