import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { IoAdapter } from '@nestjs/platform-socket.io';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  
  // Enable CORS for production
  app.enableCors({
    origin: process.env.FRONTEND_URL || '*',
    credentials: true,
  });

  // Use WebSocket adapter
  app.useWebSocketAdapter(new IoAdapter(app));

  // Get port from environment or default to 3001
  const port = process.env.PORT || 3001;
  
  await app.listen(port);
  
  console.log(`🚀 Backend is running on port ${port}`);
  console.log(`📊 Health check: http://localhost:${port}/api/health`);
  console.log(`🗄️  Database health: http://localhost:${port}/api/database/health`);
  console.log(`🔌 WebSocket endpoints:`);
  console.log(`   - OCPP: ws://localhost:${port}/ocpp`);
  console.log(`   - Realtime: ws://localhost:${port}/realtime`);
}

bootstrap();
