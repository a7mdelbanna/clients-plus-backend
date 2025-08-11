import { Server } from 'http';
import App from './app';
import { env } from './config/env';
import { logger } from './config/logger';
import { webSocketServer } from './websocket/socket.server';
// import { notificationCronService } from './cron/notification.cron';

class ServerManager {
  private app: App;
  private server: Server | null = null;

  constructor() {
    this.app = new App();
  }

  public start(): void {
    const port = env.PORT;
    
    this.server = this.app.app.listen(port, () => {
      logger.info(`🚀 Server running on port ${port}`);
      logger.info(`🌍 Environment: ${env.NODE_ENV}`);
      logger.info(`📚 API Prefix: ${env.API_PREFIX}`);
      
      if (env.ENABLE_SWAGGER) {
        logger.info(`📖 Documentation: http://localhost:${port}${env.SWAGGER_URL}`);
      }
      
      logger.info(`🔗 Server URL: http://localhost:${port}`);
      
      // Initialize WebSocket server
      webSocketServer.initialize(this.server!);
      logger.info(`🔌 WebSocket server initialized on port ${port}`);
      
      // Initialize notification cron jobs
      // notificationCronService.initializeCronJobs();
      logger.info(`⏰ Notification cron jobs initialized`);
    });

    // Handle server errors
    this.server.on('error', (error: NodeJS.ErrnoException) => {
      if (error.syscall !== 'listen') {
        throw error;
      }

      const bind = typeof port === 'string' ? `Pipe ${port}` : `Port ${port}`;

      switch (error.code) {
        case 'EACCES':
          logger.error(`${bind} requires elevated privileges`);
          process.exit(1);
          break;
        case 'EADDRINUSE':
          logger.error(`${bind} is already in use`);
          process.exit(1);
          break;
        default:
          throw error;
      }
    });

    // Handle graceful shutdown
    this.setupGracefulShutdown();
  }

  private setupGracefulShutdown(): void {
    const gracefulShutdown = async (signal: string) => {
      logger.info(`📴 Received ${signal}. Starting graceful shutdown...`);

      if (this.server) {
        this.server.close(async (err) => {
          if (err) {
            logger.error('❌ Error during server shutdown:', err);
            process.exit(1);
          }

          logger.info('🔌 Server closed');

          try {
            // Close WebSocket server
            webSocketServer.close();
            
            // Close database connection
            await this.app.close();
            logger.info('✅ Graceful shutdown completed');
            process.exit(0);
          } catch (error) {
            logger.error('❌ Error during graceful shutdown:', error);
            process.exit(1);
          }
        });

        // Force close after 30 seconds
        setTimeout(() => {
          logger.error('⏰ Forced shutdown after 30 seconds');
          process.exit(1);
        }, 30000);
      } else {
        process.exit(0);
      }
    };

    // Listen for termination signals
    process.on('SIGINT', () => gracefulShutdown('SIGINT'));
    process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));

    // Handle uncaught exceptions
    process.on('uncaughtException', (error) => {
      logger.error('💥 Uncaught Exception:', error);
      process.exit(1);
    });

    // Handle unhandled promise rejections
    process.on('unhandledRejection', (reason, promise) => {
      logger.error('🚨 Unhandled Rejection at:', promise, 'reason:', reason);
      console.error('Full error details:', reason);
      if (reason instanceof Error) {
        console.error('Stack trace:', reason.stack);
      }
      // Don't exit immediately - let's see what happens
      // process.exit(1);
    });
  }
}

// Start server if this file is run directly
if (require.main === module) {
  const serverManager = new ServerManager();
  serverManager.start();
}

export default ServerManager;
