import "reflect-metadata";
import { NestFactory } from "@nestjs/core";
import { Logger, VersioningType } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { DocumentBuilder, SwaggerModule } from "@nestjs/swagger";
import { AppModule } from "./app.module";
import { HttpExceptionFilter } from "./common/filters/http-exception.filter";
import type { AppConfig } from "./config/configuration";

async function bootstrap() {
  const app = await NestFactory.create(AppModule, { bufferLogs: false });
  const config = app.get(ConfigService<AppConfig, true>);

  // URI versioning namespaces the JSON API under /v1/* (e.g. /v1/links). The
  // public redirect ("/:code") and health probe are VERSION_NEUTRAL, so they
  // sit at the root — which keeps short links clean (https://host/abc123) and
  // avoids the greedy-exclude collision a global "/api" prefix would create
  // (a "/:code" exclude would also match /v1-less single-segment routes).
  app.enableVersioning({ type: VersioningType.URI, defaultVersion: "1" });

  app.enableCors({
    origin: config.get("web.origin", { infer: true }),
    credentials: true,
  });

  app.useGlobalFilters(new HttpExceptionFilter());

  // Swagger — disabled in production to avoid leaking the schema.
  if (config.get("nodeEnv", { infer: true }) !== "production") {
    const swaggerConfig = new DocumentBuilder()
      .setTitle("LinkForge API")
      .setDescription("URL shortener with analytics")
      .setVersion("1.0")
      .addBearerAuth()
      .build();
    const document = SwaggerModule.createDocument(app, swaggerConfig);
    SwaggerModule.setup("docs", app, document);
  }

  const port = config.get("port", { infer: true });
  await app.listen(port, "0.0.0.0");
  new Logger("Bootstrap").log(`API ready on http://localhost:${port}`);
}

void bootstrap();
