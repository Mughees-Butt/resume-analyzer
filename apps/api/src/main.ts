import { NestFactory } from '@nestjs/core'
import { ValidationPipe } from '@nestjs/common'
import { AppModule } from './app.module.js'

async function bootstrap() {
  const app = await NestFactory.create(AppModule)

  // Global API prefix — all routes will be under /api
  app.setGlobalPrefix('api')

  // Validate and strip unknown fields on all incoming request bodies
  app.useGlobalPipes(new ValidationPipe({ whitelist: true }))

  // CORS — allow the Next.js frontend to call the API in development
  app.enableCors({
    origin: process.env['FRONTEND_URL'] ?? 'http://localhost:3000',
    credentials: true,
  })

  const port = process.env['API_PORT'] ?? 4000
  await app.listen(port)

  console.log(`API running on http://localhost:${port}/api`)
}

void bootstrap()
