import 'reflect-metadata';
import express, { Application, Request, Response, NextFunction } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import compression from 'compression';
import rateLimit from 'express-rate-limit';
import swaggerUi from 'swagger-ui-express';
import swaggerJsdoc from 'swagger-jsdoc';

import { env } from './config/env';
import { logger, loggerStream } from './config/logger';
import { database } from './config/database';

// Import middleware
import { errorHandler } from './middleware/errorHandler';
import { notFoundHandler } from './middleware/notFoundHandler';
import { requestLogger } from './middleware/requestLogger';

// Import routes
import authRoutes from './routes/auth.routes';
import companyRoutes from './routes/company.routes';
import userRoutes from './routes/user.routes';
import clientRoutes from './routes/client.routes';
import projectRoutes from './routes/project.routes';
import invoiceRoutes from './routes/invoice.routes';
import healthRoutes from './routes/health.routes';

class App {
  public app: Application;

  constructor() {
    this.app = express();
    this.initializeMiddlewares();
    this.initializeRoutes();
    this.initializeSwagger();
    this.initializeErrorHandling();
    this.connectDatabase();
  }

  private initializeMiddlewares(): void {
    // Security middleware
    this.app.use(helmet({
      contentSecurityPolicy: {
        directives: {
          defaultSrc: ["'self'"],
          styleSrc: ["'self'", "'unsafe-inline'"],
          scriptSrc: ["'self'"],
          imgSrc: ["'self'", "data:", "https:"],
        },
      },
    }));

    // CORS configuration
    this.app.use(cors({
      origin: (origin, callback) => {
        // Allow requests with no origin (mobile apps, Postman, etc.)
        if (!origin) return callback(null, true);
        
        if (env.ALLOWED_ORIGINS.includes(origin)) {
          return callback(null, true);
        }
        
        return callback(new Error('Not allowed by CORS'));
      },
      credentials: true,
      methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
      allowedHeaders: ['Content-Type', 'Authorization', 'x-api-key'],
    }));

    // Compression middleware
    this.app.use(compression());

    // Rate limiting
    const limiter = rateLimit({
      windowMs: env.RATE_LIMIT_WINDOW_MS,
      max: env.RATE_LIMIT_MAX_REQUESTS,
      message: {
        error: 'Too many requests from this IP, please try again later.',
      },
      standardHeaders: true,
      legacyHeaders: false,
    });
    this.app.use(limiter);

    // Body parsing middleware
    this.app.use(express.json({ limit: '10mb' }));
    this.app.use(express.urlencoded({ extended: true, limit: '10mb' }));

    // HTTP request logging
    this.app.use(morgan('combined', { stream: loggerStream }));

    // Custom request logger
    this.app.use(requestLogger);

    // Static files
    this.app.use('/uploads', express.static('uploads'));
  }

  private initializeRoutes(): void {
    // Health check endpoint (before API prefix)
    this.app.use('/health', healthRoutes);

    // API routes with prefix
    const apiPrefix = env.API_PREFIX;
    
    this.app.use(`${apiPrefix}/auth`, authRoutes);
    this.app.use(`${apiPrefix}/companies`, companyRoutes);
    this.app.use(`${apiPrefix}/users`, userRoutes);
    this.app.use(`${apiPrefix}/clients`, clientRoutes);
    this.app.use(`${apiPrefix}/projects`, projectRoutes);
    this.app.use(`${apiPrefix}/invoices`, invoiceRoutes);

    // Root endpoint
    this.app.get('/', (req: Request, res: Response) => {
      res.json({
        message: 'Welcome to Clients+ API',
        version: '1.0.0',
        environment: env.NODE_ENV,
        timestamp: new Date().toISOString(),
        docs: env.ENABLE_SWAGGER ? env.SWAGGER_URL : 'Documentation not available',
      });
    });
  }

  private initializeSwagger(): void {
    if (env.ENABLE_SWAGGER) {
      const options = {
        definition: {
          openapi: '3.0.0',
          info: {
            title: 'Clients+ API',
            version: '1.0.0',
            description: 'A comprehensive client management system API',
            contact: {
              name: 'API Support',
              email: 'support@clientsplus.com',
            },
          },
          servers: [
            {
              url: `http://localhost:${env.PORT}${env.API_PREFIX}`,
              description: 'Development server',
            },
          ],
          components: {
            securitySchemes: {
              bearerAuth: {
                type: 'http',
                scheme: 'bearer',
                bearerFormat: 'JWT',
              },
            },
          },
          security: [
            {
              bearerAuth: [],
            },
          ],
        },
        apis: ['./src/routes/*.ts', './src/models/*.ts', './src/controllers/*.ts'],
      };

      const specs = swaggerJsdoc(options);
      this.app.use(env.SWAGGER_URL, swaggerUi.serve, swaggerUi.setup(specs, {
        customCss: '.swagger-ui .topbar { display: none }',
        customSiteTitle: 'Clients+ API Documentation',
      }));

      logger.info(`Swagger documentation available at http://localhost:${env.PORT}${env.SWAGGER_URL}`);
    }
  }

  private initializeErrorHandling(): void {
    // 404 handler
    this.app.use(notFoundHandler);

    // Global error handler
    this.app.use(errorHandler);
  }

  private async connectDatabase(): Promise<void> {
    try {
      await database.connect();
      logger.info('Database connection established');
    } catch (error) {
      logger.error('Failed to connect to database:', error);
      process.exit(1);
    }
  }

  public async close(): Promise<void> {
    try {
      await database.disconnect();
      logger.info('Application closed gracefully');
    } catch (error) {
      logger.error('Error during application shutdown:', error);
    }
  }
}

export default App;