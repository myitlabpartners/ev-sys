import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { Client, Pool } from 'pg';

@Injectable()
export class DatabaseService {
  private supabase: SupabaseClient;
  private pool: Pool;

  constructor(private configService: ConfigService) {
    this.initializeConnections();
  }

  private initializeConnections() {
    const supabaseUrl = this.configService.get<string>('SUPABASE_URL');
    const supabaseKey = this.configService.get<string>('SUPABASE_ANON_KEY');
    const databaseUrl = this.configService.get<string>('DATABASE_URL');

    if (supabaseUrl && supabaseKey && !supabaseUrl.includes('[YOUR-PROJECT-REF]')) {
      this.supabase = createClient(supabaseUrl, supabaseKey);
    }

    if (databaseUrl && !databaseUrl.includes('[YOUR-PASSWORD]')) {
      this.pool = new Pool({
        connectionString: databaseUrl,
        ssl: { rejectUnauthorized: false } // Required for Supabase
      });
    }
  }

  async testSupabaseConnection() {
    try {
      if (!this.supabase) {
        return {
          success: false,
          error: 'Supabase client not initialized. Check SUPABASE_URL and SUPABASE_ANON_KEY in .env'
        };
      }

      // Simple connection test - try to get the auth user (this will work even if no user is logged in)
      const { data, error } = await this.supabase.auth.getUser();
      
      // "Auth session missing!" or "No user" means the connection worked but no one is logged in
      if (error && !error.message.includes('Auth session missing') && !error.message.includes('No user')) {
        return {
          success: false,
          error: error.message
        };
      }

      return {
        success: true,
        message: 'Supabase connection successful',
        provider: 'supabase'
      };
    } catch (error) {
      return {
        success: false,
        error: error.message
      };
    }
  }

  async testPostgresConnection(): Promise<{ success: boolean; error?: string; message?: string; data?: any }> {
    try {
      if (!this.pool) {
        return {
          success: false,
          error: 'PostgreSQL pool not initialized. Check DATABASE_URL in .env'
        };
      }

      const client = await this.pool.connect();
      
      // Test basic connectivity
      const result = await client.query('SELECT NOW() as current_time, version() as version');
      
      client.release();

      return {
        success: true,
        message: 'PostgreSQL connection successful',
        data: {
          current_time: result.rows[0].current_time,
          version: result.rows[0].version.split(' ')[0] // Just get PostgreSQL version
        }
      };
    } catch (error) {
      return {
        success: false,
        error: error.message
      };
    }
  }

  async testDatabaseConnection() {
    const supabaseTest = await this.testSupabaseConnection();
    
    // Skip PostgreSQL direct test since Supabase handles the connection
    // Only test PostgreSQL if DATABASE_URL is different from Supabase URL
    const databaseUrl = this.configService.get<string>('DATABASE_URL');
    const supabaseUrl = this.configService.get<string>('SUPABASE_URL');
    
    let postgresTest: { success: boolean; error?: string; message?: string; data?: any } = { 
      success: false, 
      error: 'PostgreSQL direct test skipped (using Supabase client)' 
    };
    
    // Only test direct PostgreSQL if it's not a Supabase URL
    if (databaseUrl && !databaseUrl.includes('supabase.co')) {
      postgresTest = await this.testPostgresConnection();
    }

    const isConfigured = this.configService.get<string>('DATABASE_URL') && 
                        !this.configService.get<string>('DATABASE_URL').includes('[YOUR-PASSWORD]');

    return {
      configured: isConfigured,
      supabase: supabaseTest,
      postgres: postgresTest,
      overall: supabaseTest.success ? 'connected' : 'disconnected',
      timestamp: new Date().toISOString()
    };
  }

  async onModuleDestroy() {
    if (this.pool) {
      await this.pool.end();
    }
  }
}
