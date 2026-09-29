import cors from "cors";
import express, { type Express } from "express";

import { env, isProduction, originAllowed } from "./config/env";
import { errorHandler, notFoundHandler } from "./http/error-handler";
import { logInfo, logWarn } from "./lib/logger";
import { apiRouter } from "./routes";
import { healthRouter } from "./routes/health";


function corsOrigin(
  origin: string | undefined,
  callback: (error: Error | null, allow?: boolean) => void,
): void {
  if (!origin) {
    callback(null, true);
    return;
  }
  if (env.corsOrigins.length === 0) {
    callback(null, !isProduction);
    return;
  }
  if (originAllowed(origin)) {
    callback(null, true);
    return;
  }
  logWarn("cors", `Refused request from unlisted origin ${origin}`);
  callback(null, false);
}

export function createApp(): Express {
  const app = express();

  app.disable("x-powered-by");


  app.set("trust proxy", 1);

  app.use((req, res, next) => {
    const started = Date.now();
    res.on("finish", () => {
      logInfo("http", `${req.method} ${req.path} → ${res.statusCode} (${Date.now() - started}ms)`);
    });
    next();
  });

  app.use((_req, res, next) => {
    res.setHeader("X-Content-Type-Options", "nosniff");
    res.setHeader("Referrer-Policy", "strict-origin-when-cross-origin");
    next();
  });

  app.use(
    cors({
      origin: corsOrigin,
      credentials: true,
      methods: ["GET", "POST", "PATCH", "DELETE", "OPTIONS"],
      allowedHeaders: ["Content-Type", "Authorization"],
      maxAge: 600,
    }),
  );


  app.use(express.json({ limit: "1mb" }));

  app.use(healthRouter);
  app.use("/api", apiRouter);

  app.use(notFoundHandler);
  app.use(errorHandler);

  return app;
}
