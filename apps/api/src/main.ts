import { ValidationPipe } from "@nestjs/common";
import { NestFactory } from "@nestjs/core";
import { AppModule } from "./app.module";

function normalizeOrigin(value: string) {
  return value.trim().replace(/\/+$/, "");
}

function parseAllowedOrigins(rawValue: string | undefined) {
  return (rawValue ?? "")
    .split(",")
    .map((value) => value.trim())
    .filter(Boolean)
    .map(normalizeOrigin);
}

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  const nodeEnv = process.env.NODE_ENV ?? "development";
  const allowedOrigins = parseAllowedOrigins(process.env.CORS_ORIGIN);

  if (nodeEnv === "production" && allowedOrigins.length === 0) {
    throw new Error(
      "CORS_ORIGIN is required in production. Set it to your deployed web origin, for example https://your-app.vercel.app."
    );
  }

  app.enableCors({
    origin(origin, callback) {
      if (!origin) {
        callback(null, true);
        return;
      }

      if (allowedOrigins.length === 0) {
        callback(null, true);
        return;
      }

      const normalizedOrigin = normalizeOrigin(origin);
      const isAllowed = allowedOrigins.includes(normalizedOrigin);

      callback(
        isAllowed
          ? null
          : new Error(`CORS blocked for origin: ${normalizedOrigin}`),
        isAllowed
      );
    }
  });
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      transform: true
    })
  );

  const port = process.env.PORT ? Number(process.env.PORT) : 3001;
  await app.listen(port);
}

void bootstrap();
