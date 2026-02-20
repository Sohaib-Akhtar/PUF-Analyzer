import Fastify, { FastifyInstance } from 'fastify';
import cors from '@fastify/cors';
import swagger from '@fastify/swagger';
import swaggerUi from '@fastify/swagger-ui';
import { setupErrorHandler, createRequestLogger } from './middleware/errorHandler';
import { setupValidationMiddleware } from './middleware/validation';
import { metricsRoutes } from './routes/metrics';
import { stableRoutes } from './routes/stable';
import { extractRoutes } from './routes/extract';
import { convertRoutes } from './routes/convert';
import { fileRoutes } from './routes/files';
import { dataRoutes } from './routes/data';
import { generateRoutes } from './routes/generate';
import { nistRoutes } from './routes/nist';

export interface ServerConfig {
  port: number;
  host: string;
  isDev: boolean;
}

export class PufApiServer {
  private fastify: FastifyInstance;
  private config: ServerConfig;

  constructor(config: Partial<ServerConfig> = {}) {
    this.config = {
      port: config.port || 0,
      host: config.host || 'localhost',
      isDev: config.isDev || process.env.NODE_ENV === 'development'
    };

    this.fastify = Fastify({
      logger: this.config.isDev,
      bodyLimit: 10 * 1024 * 1024
    });
  }

  private async setupServer() {
    await this.registerPlugins();
    await this.setupMiddleware();
    await this.registerRoutes();
  }

  private async registerPlugins() {
    await this.fastify.register(cors, {
      origin: ['http://localhost:3000', 'http://127.0.0.1:3000'],
      methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
      allowedHeaders: ['Content-Type', 'Authorization']
    });

    await this.fastify.register(swagger, {
      openapi: {
        openapi: '3.0.0',
        info: {
          title: 'PUF Analysis API',
          description: 'REST API for Physical Unclonable Function (PUF) analysis operations',
          version: '1.0.0'
        }
      }
    });

    await this.fastify.register(swaggerUi, {
      routePrefix: '/docs',
      uiConfig: {
        docExpansion: 'list',
        deepLinking: false,
        tryItOutEnabled: true
      },
      staticCSP: true
    });
  }

  private async setupMiddleware() {
    await setupErrorHandler(this.fastify);
    await setupValidationMiddleware(this.fastify);

    this.fastify.addHook('onRequest', createRequestLogger());

    this.fastify.addHook('onSend', async (request, reply, payload) => {
      if (request.method === 'OPTIONS') {
        return payload;
      }
      
      reply.header('X-API-Version', '1.0.0');
      
      return payload;
    });
  }

  private async registerRoutes() {
    this.fastify.get('/health', async (_, reply) => {
      return reply.send({
        success: true,
        data: {
          status: 'healthy',
          version: '1.0.0',
          timestamp: new Date().toISOString(),
          uptime: process.uptime(),
          services: ['metrics', 'stable', 'extract', 'convert', 'files', 'data', 'generate', 'nist']
        },
        timestamp: new Date().toISOString()
      });
    });

    this.fastify.get('/', async (_, reply) => {
      return reply.send({
        success: true,
        data: {
          name: 'PUF Analysis API',
          version: '1.0.0',
          documentation: '/docs',
          endpoints: {
            'POST /api/metrics/analyze': 'Analyze PUF metrics',
            'POST /api/stable/generate': 'Generate stable positions',
            'POST /api/extract/key': 'Extract key from binary data',
            'POST /api/convert/binary': 'Convert binary data',
            'POST /api/convert/hex': 'Convert hex data',
            'POST /api/convert/image': 'Convert between binary and images',
            'POST /api/data/augment': 'Augment PUF data for ML',
            'POST /api/data/corrupt': 'Generate corrupted PUF data',
            'POST /api/data/fixlf': 'Fix line feeds in binary dumps',
            'POST /api/generate/random': 'Generate random binary data',
            'POST /api/generate/repeated': 'Generate repeated pattern data',
            'POST /api/nist/average': 'Average NIST test results',
            'POST /api/files/upload': 'Upload and validate files',
            'GET /health': 'Health check',
            'GET /docs': 'API documentation'
          }
        },
        timestamp: new Date().toISOString()
      });
    });

    await this.fastify.register(metricsRoutes, { prefix: '/api/metrics' });
    await this.fastify.register(stableRoutes, { prefix: '/api/stable' });
    await this.fastify.register(extractRoutes, { prefix: '/api/extract' });
    await this.fastify.register(convertRoutes, { prefix: '/api/convert' });
    await this.fastify.register(fileRoutes, { prefix: '/api/files' });
    await this.fastify.register(dataRoutes, { prefix: '/api/data' });
    await this.fastify.register(generateRoutes, { prefix: '/api/generate' });
    await this.fastify.register(nistRoutes, { prefix: '/api/nist' });
  }

  async start(): Promise<number> {
    try {
      await this.setupServer();
      
      const address = await this.fastify.listen({ 
        port: this.config.port, 
        host: this.config.host 
      });
      
      const actualPort = this.fastify.server.address() as any;
      const port = actualPort?.port || this.config.port;
      
      console.log(`PUF API Server listening on ${address}`);
      console.log(`API Documentation: http://${this.config.host}:${port}/docs`);
      
      return port;
    } catch (error) {
      console.error('Error starting PUF API server:', error);
      throw error;
    }
  }

  async stop(): Promise<void> {
    try {
      await this.fastify.close();
      console.log('PUF API Server stopped');
    } catch (error) {
      console.error('Error stopping PUF API server:', error);
      throw error;
    }
  }

  getServer(): FastifyInstance {
    return this.fastify;
  }

  getAddress(): string | null {
    const address = this.fastify.server.address();
    if (!address) return null;
    
    if (typeof address === 'string') {
      return address;
    }
    
    return `http://${address.address}:${address.port}`;
  }

  isListening(): boolean {
    return this.fastify.server.listening;
  }
}