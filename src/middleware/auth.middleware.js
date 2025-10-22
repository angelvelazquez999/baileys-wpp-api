import { config } from "../config/env.js";

export const authenticateAPI = (req, res, next) => {
  const apiKey = req.headers["x-service-key"];
  
  if (apiKey !== config.secureKey) {
    return res.status(401).json({ error: "No autorizado" });
  }
  
  next();
};