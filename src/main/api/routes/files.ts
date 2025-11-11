import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { FileService } from '../services/fileService';
import { ApiResponseDto } from '../dto/responses';
import { BatchValidationResultDto } from '../dto/pufMetrics';

interface FileUploadBody {
  files: Array<{
    name: string;
    data: string;
    size: number;
  }>;
}

interface FileValidationBody {
  files: Array<{
    name: string;
    data: string;
    size: number;
  }>;
}

export async function fileRoutes(fastify: FastifyInstance) {
  const fileService = new FileService();

  fastify.post<{ Body: FileUploadBody }>('/upload', {
    schema: {
      summary: 'Upload and validate PUF binary files',
      description: 'Uploads files and performs validation, returning validation results and file metadata',
      body: {
        type: 'object',
        properties: {
          files: {
            type: 'array',
            description: 'Array of files to upload and validate',
            items: {
              type: 'object',
              properties: {
                name: { 
                  type: 'string', 
                  description: 'Filename (e.g. tiva_original_26181245.txt)'
                },
                data: { 
                  type: 'string', 
                  description: 'Base64 encoded file content'
                },
                size: { 
                  type: 'number', 
                  description: 'File size in bytes'
                }
              },
              required: ['name', 'data', 'size']
            }
          }
        },
        required: ['files']
      },
      response: {
        200: {
          type: 'object',
          properties: {
            success: { type: 'boolean' },
            data: {
              type: 'object',
              properties: {
                validation: { type: 'object' },
                uploadedFiles: {
                  type: 'array',
                  items: { type: 'object' }
                }
              }
            },
            timestamp: { type: 'string' }
          }
        }
      }
    }
  }, async (request: FastifyRequest<{ Body: FileUploadBody }>, reply: FastifyReply) => {
    try {
      const { files: rawFiles } = request.body;

      if (!rawFiles || rawFiles.length === 0) {
        return reply.status(400).send({
          success: false,
          error: 'No files provided',
          timestamp: new Date().toISOString()
        } as ApiResponseDto);
      }

      const files = rawFiles.map(f => ({
        name: f.name,
        data: Buffer.from(f.data, 'base64'),
        size: f.size
      }));

      const validationResult = fileService.validateBatch(files);

      return reply.status(200).send({
        success: true,
        data: {
          validation: validationResult,
          uploadedFiles: files.map(f => ({
            name: f.name,
            size: f.size,
            sanitizedName: fileService.sanitizeFilename(f.name)
          }))
        },
        timestamp: new Date().toISOString()
      } as ApiResponseDto);

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
      
      return reply.status(500).send({
        success: false,
        error: errorMessage,
        timestamp: new Date().toISOString()
      } as ApiResponseDto);
    }
  });

  fastify.post<{ Body: FileValidationBody }>('/validate', {
    schema: {
      summary: 'Validate PUF binary files',
      description: 'Validates uploaded files against PUF format requirements (binary strings, 32 chars/line)',
      body: {
        type: 'object',
        properties: {
          files: {
            type: 'array',
            description: 'Array of files to validate',
            items: {
              type: 'object',
              properties: {
                name: { 
                  type: 'string', 
                  description: 'Filename (e.g. tiva_original_26181245.txt)' 
                },
                data: { 
                  type: 'string', 
                  description: 'Base64 encoded file content' 
                },
                size: { 
                  type: 'number', 
                  description: 'File size in bytes' 
                }
              },
              required: ['name', 'data', 'size']
            }
          }
        },
        required: ['files']
      },
      response: {
        200: {
          type: 'object',
          properties: {
            success: { type: 'boolean' },
            data: { type: 'object' },
            timestamp: { type: 'string' }
          }
        }
      }
    }
  }, async (request: FastifyRequest<{ Body: FileValidationBody }>, reply: FastifyReply) => {
    try {
      const { files: rawFiles } = request.body;

      if (!rawFiles || rawFiles.length === 0) {
        return reply.status(400).send({
          success: false,
          error: 'No files provided for validation',
          timestamp: new Date().toISOString()
        } as ApiResponseDto);
      }

      const files = rawFiles.map(f => ({
        name: f.name,
        data: Buffer.from(f.data, 'base64'),
        size: f.size
      }));

      const validationResult = fileService.validateBatch(files);

      return reply.status(200).send({
        success: true,
        data: validationResult,
        timestamp: new Date().toISOString()
      } as ApiResponseDto<BatchValidationResultDto>);

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
      
      return reply.status(500).send({
        success: false,
        error: errorMessage,
        timestamp: new Date().toISOString()
      } as ApiResponseDto);
    }
  });

  fastify.get('/formats', {
    schema: {
      summary: 'Get supported file formats',
      description: 'Returns information about supported file formats and validation rules',
      response: {
        200: {
          type: 'object',
          properties: {
            success: { type: 'boolean' },
            data: {
              type: 'object',
              properties: {
                supportedExtensions: {
                  type: 'array',
                  items: { type: 'string' }
                },
                binaryFormat: { type: 'object' },
                namingConvention: { type: 'object' },
                maxFileSize: { type: 'string' },
                validationRules: {
                  type: 'array',
                  items: { type: 'string' }
                }
              }
            },
            timestamp: { type: 'string' }
          }
        }
      }
    }
  }, async (_, reply: FastifyReply) => {
    return reply.status(200).send({
      success: true,
      data: {
        supportedExtensions: ['.txt', '.bin', '.pos'],
        binaryFormat: {
          description: 'Binary string format (0s and 1s only)',
          lineLength: 32,
          example: '10000011101011110101001001110101'
        },
        namingConvention: {
          pattern: 'devicetype_variant_timestamp.txt',
          examples: ['tiva_original_26181245.txt', 'stellaris1_26183504.txt']
        },
        maxFileSize: '5MB',
        validationRules: [
          'Binary files: only contain 0s and 1s',
          'Each line must be exactly 32 characters',
          'Minimum 10 lines of data required',
          'Files should follow naming convention',
          'All files in batch should have similar sizes'
        ]
      },
      timestamp: new Date().toISOString()
    } as ApiResponseDto);
  });

  fastify.get('/health', {
    schema: {
      summary: 'Health check for files service',
      description: 'Returns the health status of the files service',
      response: {
        200: {
          type: 'object',
          properties: {
            success: { type: 'boolean' },
            data: {
              type: 'object',
              properties: {
                service: { type: 'string' },
                status: { type: 'string' },
                timestamp: { type: 'string' }
              }
            },
            timestamp: { type: 'string' }
          }
        }
      }
    }
  }, async (_, reply: FastifyReply) => {
    return reply.status(200).send({
      success: true,
      data: {
        service: 'files',
        status: 'healthy',
        timestamp: new Date().toISOString()
      },
      timestamp: new Date().toISOString()
    } as ApiResponseDto);
  });
}