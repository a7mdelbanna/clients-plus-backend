# Clients+ Backend API

A comprehensive Node.js backend API for client management system built with TypeScript, Express.js, and Prisma.

## Features

- **Authentication & Authorization**: JWT-based auth with refresh tokens
- **Client Management**: Full CRUD operations for clients
- **Project Management**: Track projects and their status
- **Invoice Management**: Create, send, and manage invoices
- **File Upload**: Handle document and image uploads
- **Email Integration**: Send notifications and invoices via email
- **API Documentation**: Auto-generated Swagger/OpenAPI docs
- **Database**: PostgreSQL with Prisma ORM
- **Logging**: Structured logging with Winston
- **Security**: Helmet, CORS, rate limiting, and input validation
- **Docker Support**: Full containerization with docker-compose

## Tech Stack

- **Runtime**: Node.js 18+
- **Language**: TypeScript
- **Framework**: Express.js
- **Database**: PostgreSQL
- **ORM**: Prisma
- **Authentication**: JWT
- **Validation**: express-validator
- **Logging**: Winston
- **Documentation**: Swagger/OpenAPI
- **Testing**: Jest
- **Code Quality**: ESLint, Prettier
- **Containerization**: Docker & Docker Compose

## Prerequisites

- Node.js 18.0.0 or higher
- npm 8.0.0 or higher
- Docker and Docker Compose (for containerized development)
- PostgreSQL (if running locally without Docker)

## Installation

### Option 1: Docker Development (Recommended)

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd clients-plus-backend
   ```

2. **Create environment file**
   ```bash
   cp .env.example .env
   ```
   
   Edit `.env` with your configuration values.

3. **Start with Docker Compose**
   ```bash
   # Start all services (API, PostgreSQL, Redis, pgAdmin)
   npm run docker:up
   
   # View logs
   npm run docker:logs
   
   # Stop services
   npm run docker:down
   ```

4. **Setup database**
   ```bash
   # Generate Prisma client
   npm run db:generate
   
   # Run migrations
   npm run db:migrate
   
   # Seed database (optional)
   npm run db:seed
   ```

### Option 2: Local Development

1. **Clone and install dependencies**
   ```bash
   git clone <repository-url>
   cd clients-plus-backend
   npm install
   ```

2. **Setup PostgreSQL database**
   - Install PostgreSQL locally
   - Create database: `clientsplus_db`
   - Update `DATABASE_URL` in `.env`

3. **Setup environment**
   ```bash
   cp .env.example .env
   # Edit .env with your database credentials and other settings
   ```

4. **Setup database**
   ```bash
   npm run db:generate
   npm run db:migrate
   npm run db:seed
   ```

5. **Start development server**
   ```bash
   npm run dev
   ```

## Available Scripts

### Development
- `npm run dev` - Start development server with hot reload
- `npm run build` - Build TypeScript to JavaScript
- `npm run build:watch` - Build with watch mode
- `npm start` - Start production server

### Database
- `npm run db:generate` - Generate Prisma client
- `npm run db:migrate` - Run database migrations
- `npm run db:seed` - Seed database with sample data
- `npm run db:studio` - Open Prisma Studio

### Testing
- `npm test` - Run tests
- `npm run test:watch` - Run tests in watch mode
- `npm run test:coverage` - Run tests with coverage

### Code Quality
- `npm run lint` - Run ESLint
- `npm run lint:fix` - Fix ESLint issues
- `npm run format` - Format code with Prettier

### Docker
- `npm run docker:up` - Start Docker services
- `npm run docker:down` - Stop Docker services
- `npm run docker:logs` - View Docker logs

## Project Structure

```
src/
├── config/          # Configuration files
│   ├── database.ts  # Database configuration
│   ├── env.ts       # Environment variables
│   └── logger.ts    # Logging configuration
├── controllers/     # Route controllers
├── middleware/      # Custom middleware
│   ├── errorHandler.ts
│   ├── notFoundHandler.ts
│   └── requestLogger.ts
├── models/          # Database models (Prisma)
├── routes/          # API routes
│   ├── auth.routes.ts
│   ├── client.routes.ts
│   ├── health.routes.ts
│   ├── invoice.routes.ts
│   ├── project.routes.ts
│   └── user.routes.ts
├── services/        # Business logic
├── types/           # TypeScript type definitions
├── utils/           # Utility functions
├── app.ts           # Express app configuration
└── server.ts        # Server startup
```

## API Endpoints

### Health Check
- `GET /health` - Health status
- `GET /health/ready` - Readiness check
- `GET /health/live` - Liveness check

### Authentication
- `POST /api/v1/auth/register` - Register new user
- `POST /api/v1/auth/login` - Login user
- `POST /api/v1/auth/logout` - Logout user
- `POST /api/v1/auth/refresh` - Refresh access token

### Users
- `GET /api/v1/users/profile` - Get current user profile
- `PUT /api/v1/users/profile` - Update user profile
- `PUT /api/v1/users/change-password` - Change password

### Clients
- `GET /api/v1/clients` - Get all clients
- `POST /api/v1/clients` - Create new client
- `GET /api/v1/clients/:id` - Get client by ID
- `PUT /api/v1/clients/:id` - Update client
- `DELETE /api/v1/clients/:id` - Delete client

### Projects
- `GET /api/v1/projects` - Get all projects
- `POST /api/v1/projects` - Create new project
- `GET /api/v1/projects/:id` - Get project by ID
- `PUT /api/v1/projects/:id` - Update project
- `DELETE /api/v1/projects/:id` - Delete project

### Invoices
- `GET /api/v1/invoices` - Get all invoices
- `POST /api/v1/invoices` - Create new invoice
- `GET /api/v1/invoices/:id` - Get invoice by ID
- `PUT /api/v1/invoices/:id` - Update invoice
- `DELETE /api/v1/invoices/:id` - Delete invoice
- `POST /api/v1/invoices/:id/send` - Send invoice to client

## API Documentation

When the server is running, you can access the interactive API documentation:

- **Swagger UI**: `http://localhost:3000/api-docs`
- **Health Check**: `http://localhost:3000/health`

## Environment Variables

Key environment variables (see `.env.example` for complete list):

```env
# Server
PORT=3000
NODE_ENV=development
API_PREFIX=/api/v1

# Database
DATABASE_URL="postgresql://username:password@localhost:5432/clientsplus_db?schema=public"

# JWT
JWT_SECRET=your-super-secret-jwt-key
JWT_EXPIRES_IN=7d

# Email
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your-email@gmail.com
SMTP_PASS=your-app-password
```

## Docker Services

When using docker-compose, the following services are available:

- **API**: `http://localhost:3000` - Main application
- **PostgreSQL**: `localhost:5432` - Database
- **Redis**: `localhost:6379` - Caching (optional)
- **pgAdmin**: `http://localhost:5050` - Database management UI

### pgAdmin Access
- **URL**: http://localhost:5050
- **Email**: admin@clientsplus.com
- **Password**: admin123

## Security Features

- **Helmet**: Security headers
- **CORS**: Cross-origin resource sharing
- **Rate Limiting**: Prevent abuse
- **Input Validation**: Request validation
- **JWT Authentication**: Secure token-based auth
- **Password Hashing**: bcrypt for password security
- **Environment Variables**: Secure configuration management

## Logging

The application uses Winston for structured logging:

- **Console**: Development logging to console
- **Files**: Production logging to files
- **Levels**: error, warn, info, debug
- **Rotation**: Automatic log rotation

Log files are stored in the `logs/` directory.

## Testing

```bash
# Run all tests
npm test

# Run tests in watch mode
npm run test:watch

# Generate coverage report
npm run test:coverage
```

Test files should be placed in the `tests/` directory with `.test.ts` or `.spec.ts` extensions.

## Database Schema

The database schema is managed with Prisma. Key entities:

- **User**: Application users
- **Client**: Client information
- **Project**: Client projects
- **Invoice**: Invoice management
- **InvoiceItem**: Invoice line items

To modify the schema:

1. Edit `prisma/schema.prisma`
2. Generate migration: `npm run db:migrate`
3. Generate client: `npm run db:generate`

## Contributing

1. Fork the repository
2. Create a feature branch: `git checkout -b feature/amazing-feature`
3. Commit changes: `git commit -m 'Add amazing feature'`
4. Push to branch: `git push origin feature/amazing-feature`
5. Open a Pull Request

### Code Style

- Follow ESLint and Prettier configurations
- Use TypeScript for type safety
- Write tests for new features
- Update documentation as needed

## Deployment

### Production Build

```bash
# Build the application
npm run build

# Start production server
npm start
```

### Environment Setup

1. Set `NODE_ENV=production`
2. Configure production database
3. Set secure JWT secrets
4. Configure email settings
5. Setup monitoring and logging

### Docker Production

1. Build production image:
   ```bash
   docker build -t clientsplus-api .
   ```

2. Run with production environment:
   ```bash
   docker run -p 3000:3000 --env-file .env.production clientsplus-api
   ```

## Monitoring

- **Health Checks**: Available at `/health` endpoints
- **Logging**: Winston with multiple transports
- **Error Handling**: Centralized error handling
- **Performance**: Request/response logging

## Support

For support, please contact the development team or create an issue in the repository.

## License

This project is licensed under the MIT License - see the LICENSE file for details.

## Changelog

### v1.0.0
- Initial project setup
- Basic CRUD operations
- Authentication system
- API documentation
- Docker configuration
- Test setup