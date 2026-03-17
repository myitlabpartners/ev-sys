import { Controller, Get } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { AppService } from './app.service';
import { DatabaseService } from './database/database.service';

@Controller()
export class AppController {
  constructor(
    private readonly appService: AppService,
    private readonly configService: ConfigService,
    private readonly databaseService: DatabaseService
  ) {}

  @Get()
  getHello(): string {
    return this.appService.getHello();
  }

  @Get('api/health')
  getHealth() {
    return {
      status: 'ok',
      timestamp: new Date().toISOString(),
      message: 'NestJS backend is running successfully!',
    };
  }

  @Get('api/database/health')
  async getDatabaseHealth() {
    const databaseUrl = this.configService.get<string>('DATABASE_URL');
    const supabaseUrl = this.configService.get<string>('SUPABASE_URL');
    
    // Check if database is configured
    if (!databaseUrl || databaseUrl.includes('[YOUR-PASSWORD]') || databaseUrl.includes('[YOUR-PROJECT-REF]')) {
      return {
        status: 'disconnected',
        timestamp: new Date().toISOString(),
        database: {
          connection: 'not_configured',
          type: 'postgresql',
          host: this.configService.get<string>('DB_HOST', 'db.qmzujyrocmlnpqilxopi.supabase.co'),
          port: this.configService.get<number>('DB_PORT', 5432),
          name: this.configService.get<string>('DB_NAME', 'postgres'),
          error: 'Database connection not configured. Please update your .env file with your Supabase credentials.'
        },
        message: 'Database connection is not configured. Please set up DATABASE_URL and SUPABASE_URL in your .env file.',
        config_status: {
          database_url_set: !!databaseUrl && !databaseUrl.includes('[YOUR-PASSWORD]'),
          supabase_url_set: !!supabaseUrl && !supabaseUrl.includes('[YOUR-PROJECT-REF]'),
        }
      };
    }

    // Test actual database connection
    try {
      const connectionTest = await this.databaseService.testDatabaseConnection();
      
      if (connectionTest.overall === 'connected') {
        return {
          status: 'connected',
          timestamp: new Date().toISOString(),
          database: {
            connection: 'healthy',
            type: 'postgresql',
            host: this.configService.get<string>('DB_HOST', 'db.qmzujyrocmlnpqilxopi.supabase.co'),
            port: this.configService.get<number>('DB_PORT', 5432),
            name: this.configService.get<string>('DB_NAME', 'postgres'),
            provider: 'supabase',
            url: supabaseUrl,
            test_results: connectionTest
          },
          message: 'Database connection is working properly!',
          config_status: {
            database_url_set: true,
            supabase_url_set: true,
          }
        };
      } else {
        return {
          status: 'disconnected',
          timestamp: new Date().toISOString(),
          database: {
            connection: 'failed',
            type: 'postgresql',
            host: this.configService.get<string>('DB_HOST', 'db.qmzujyrocmlnpqilxopi.supabase.co'),
            port: this.configService.get<number>('DB_PORT', 5432),
            name: this.configService.get<string>('DB_NAME', 'postgres'),
            provider: 'supabase',
            url: supabaseUrl,
            error: 'Connection test failed',
            test_results: connectionTest
          },
          message: 'Database connection failed. Please check your credentials and network.',
          config_status: {
            database_url_set: true,
            supabase_url_set: true,
          }
        };
      }
    } catch (error) {
      return {
        status: 'error',
        timestamp: new Date().toISOString(),
        database: {
          connection: 'error',
          type: 'postgresql',
          host: this.configService.get<string>('DB_HOST', 'db.qmzujyrocmlnpqilxopi.supabase.co'),
          port: this.configService.get<number>('DB_PORT', 5432),
          name: this.configService.get<string>('DB_NAME', 'postgres'),
          error: error.message
        },
        message: 'Error testing database connection: ' + error.message,
        config_status: {
          database_url_set: true,
          supabase_url_set: !!supabaseUrl && !supabaseUrl.includes('[YOUR-PROJECT-REF]'),
        }
      };
    }
  }
}
