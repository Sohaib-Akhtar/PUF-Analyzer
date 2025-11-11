import { FastifyRequest, FastifyReply, FastifyInstance } from 'fastify';
import { ApiResponseDto } from '../dto/responses';

interface ValidationSchemas {
  [key: string]: {
    type: string;
    properties: Record<string, unknown>;
    required?: string[];
  };
}

export const schemas: ValidationSchemas = {
  fileUpload: {
    type: 'object',
    properties: {
      files: {
        type: 'array',
        items: {
          type: 'object',
          properties: {
            name: { type: 'string', minLength: 1 },
            data: { type: 'string', minLength: 1 },
            size: { type: 'number', minimum: 1 }
          },
          required: ['name', 'data', 'size']
        },
        minItems: 1
      }
    },
    required: ['files']
  },
  
  metricsAnalysis: {
    type: 'object',
    properties: {
      files: {
        type: 'array',
        items: {
          type: 'object',
          properties: {
            name: { type: 'string', minLength: 1 },
            data: { type: 'string', minLength: 1 },
            size: { type: 'number', minimum: 1 }
          },
          required: ['name', 'data', 'size']
        },
        minItems: 1
      },
      onlyTotal: { type: 'boolean' },
      findComma: { type: 'boolean' },
      startIndicator: { type: 'string', maxLength: 1 },
      initValue: { type: 'string', pattern: '^[0-9a-fA-F]+$' },
      jobs: { type: 'number', minimum: 1, maximum: 16 }
    },
    required: ['files']
  },
  
  stableGeneration: {
    type: 'object',
    properties: {
      files: {
        type: 'array',
        items: {
          type: 'object',
          properties: {
            name: { type: 'string', minLength: 1 },
            data: { type: 'string', minLength: 1 },
            size: { type: 'number', minimum: 1 }
          },
          required: ['name', 'data', 'size']
        },
        minItems: 2
      },
      keyLength: { type: 'number', minimum: 8, maximum: 1024 },
      findComma: { type: 'boolean' }
    },
    required: ['files', 'keyLength']
  },
  
  keyExtraction: {
    type: 'object',
    properties: {
      binFile: {
        type: 'object',
        properties: {
          name: { type: 'string', minLength: 1 },
          data: { type: 'string', minLength: 1 },
          size: { type: 'number', minimum: 1 }
        },
        required: ['name', 'data', 'size']
      },
      stableFile: {
        type: 'object',
        properties: {
          name: { type: 'string', pattern: '\\.pos$' },
          data: { type: 'string', minLength: 1 },
          size: { type: 'number', minimum: 1 }
        },
        required: ['name', 'data', 'size']
      },
      findComma: { type: 'boolean' }
    },
    required: ['binFile', 'stableFile']
  },
  
  binaryConversion: {
    type: 'object',
    properties: {
      files: {
        type: 'array',
        items: {
          type: 'object',
          properties: {
            name: { type: 'string', minLength: 1 },
            data: { type: 'string', minLength: 1 },
            size: { type: 'number', minimum: 1 }
          },
          required: ['name', 'data', 'size']
        }
      },
      input: { type: 'string' },
      from: { type: 'string', enum: ['bin', 'txt'] },
      binWidth: { type: 'number', minimum: 1, maximum: 8 },
      line: { type: 'boolean' },
      findComma: { type: 'boolean' }
    },
    required: ['from']
  }
};

export async function setupValidationMiddleware(fastify: FastifyInstance) {
  Object.entries(schemas).forEach(([name, schema]) => {
    fastify.addSchema({
      $id: name,
      ...schema
    });
  });

  fastify.addHook('preValidation', async (request: FastifyRequest, reply: FastifyReply) => {
    const contentType = request.headers['content-type'];
    
    if (request.method === 'POST' && (!contentType || !contentType.includes('application/json'))) {
      return reply.status(400).send({
        success: false,
        error: 'Content-Type must be application/json',
        timestamp: new Date().toISOString()
      } as ApiResponseDto);
    }
  });

  fastify.setValidatorCompiler(({ schema }) => {
    return (data) => {
      if (schema.type === 'object' && schema.properties) {
        const errors: string[] = [];
        
        if (schema.required) {
          for (const field of schema.required) {
            if (!(field in data)) {
              errors.push(`Missing required field: ${field}`);
            }
          }
        }

        if (errors.length > 0) {
          return { error: new Error(errors.join(', ')) };
        }
      }
      
      return { value: data };
    };
  });
}

export function validateBase64(data: string): boolean {
  try {
    return btoa(atob(data)) === data;
  } catch {
    return false;
  }
}

export function validateFileSize(size: number, maxSize: number = 5 * 1024 * 1024): boolean {
  return size > 0 && size <= maxSize;
}

export function validateFileName(name: string): boolean {
  const validPattern = /^[a-zA-Z0-9._-]+$/;
  return validPattern.test(name) && name.length <= 255;
}