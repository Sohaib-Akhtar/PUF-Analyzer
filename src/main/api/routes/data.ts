import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { JavaCliService } from '../services/javaCliService';
import { FileService } from '../services/fileService';
import { AugmentRequestDto, CorruptRequestDto, FixLFRequestDto } from '../dto/requests';
import { ApiResponseDto, AugmentResultDto, CorruptResultDto, FixLFResultDto } from '../dto/responses';

interface AugmentRouteBody {
  files: Array<{ name: string; data: string; size: number }>;
  flipChance0?: number;
  flipChance1?: number;
  augmentFactor?: number;
  bits?: number;
  regenOriginal?: boolean;
  deleteOriginal?: boolean;
  suffix?: string;
  findComma?: boolean;
}

interface CorruptRouteBody {
  files: Array<{ name: string; data: string; size: number }>;
  corruptPercentage?: number;
  bits?: number;
  regenOriginal?: boolean;
  deleteOriginal?: boolean;
  findComma?: boolean;
}

interface FixLFRouteBody {
  files: Array<{ name: string; data: string; size: number }>;
  outSuffix?: string;
}

export async function dataRoutes(fastify: FastifyInstance) {
  const javaCliService = new JavaCliService();
  const fileService = new FileService();

  fastify.post<{ Body: AugmentRouteBody }>('/augment', {
    schema: {
      summary: 'Augment PUF data for AI/ML training',
      description: 'Generates augmented training data by introducing controlled bit flips to existing PUF dumps',
      body: {
        type: 'object',
        properties: {
          files: {
            type: 'array',
            description: 'Array of binary files to augment',
            items: {
              type: 'object',
              properties: {
                name: { type: 'string', description: 'Filename' },
                data: { type: 'string', description: 'Base64 encoded file content' },
                size: { type: 'number', description: 'File size in bytes' }
              },
              required: ['name', 'data', 'size']
            }
          },
          flipChance0: { type: 'number', description: 'Inverse flip probability for 0-bits (default 8192)', default: 8192 },
          flipChance1: { type: 'number', description: 'Inverse flip probability for 1-bits (default 64)', default: 64 },
          augmentFactor: { type: 'number', description: 'Number of augmented copies per dump (default 15)', default: 15 },
          bits: { type: 'number', description: 'Number of bits to consider (default 262144)', default: 262144 },
          regenOriginal: { type: 'boolean', description: 'Regenerate the original truncated file', default: false },
          deleteOriginal: { type: 'boolean', description: 'Delete original after augmentation', default: false },
          suffix: { type: 'string', description: 'Output file suffix (default _aug)', default: '_aug' },
          findComma: { type: 'boolean', description: 'Find comma delimiter in data', default: false }
        },
        required: ['files']
      }
    }
  }, async (request: FastifyRequest<{ Body: AugmentRouteBody }>, reply: FastifyReply) => {
    try {
      const { files: rawFiles, ...options } = request.body;

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
      if (!validationResult.allValid) {
        return reply.status(400).send({
          success: false,
          error: 'File validation failed',
          data: {
            validationErrors: validationResult.results.filter(r => !r.isValid),
            globalErrors: validationResult.globalErrors
          },
          timestamp: new Date().toISOString()
        } as ApiResponseDto);
      }

      const augmentRequest: AugmentRequestDto = { files, ...options };
      const result = await javaCliService.augmentData(augmentRequest);

      return reply.status(200).send({
        success: true,
        data: result,
        timestamp: new Date().toISOString()
      } as ApiResponseDto<AugmentResultDto>);

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
      return reply.status(500).send({
        success: false,
        error: errorMessage,
        timestamp: new Date().toISOString()
      } as ApiResponseDto);
    }
  });

  fastify.post<{ Body: CorruptRouteBody }>('/corrupt', {
    schema: {
      summary: 'Generate corrupted PUF data',
      description: 'Creates corrupted versions of dumps by zeroing out a percentage of bits at top, middle, and bottom positions',
      body: {
        type: 'object',
        properties: {
          files: {
            type: 'array',
            description: 'Array of binary files to corrupt',
            items: {
              type: 'object',
              properties: {
                name: { type: 'string', description: 'Filename' },
                data: { type: 'string', description: 'Base64 encoded file content' },
                size: { type: 'number', description: 'File size in bytes' }
              },
              required: ['name', 'data', 'size']
            }
          },
          corruptPercentage: { type: 'number', description: 'Percentage to corrupt (default 15)', default: 15 },
          bits: { type: 'number', description: 'Bits to consider (default 262144)', default: 262144 },
          regenOriginal: { type: 'boolean', description: 'Regenerate original truncated file', default: false },
          deleteOriginal: { type: 'boolean', description: 'Delete original after corruption', default: false },
          findComma: { type: 'boolean', description: 'Find comma delimiter in data', default: false }
        },
        required: ['files']
      }
    }
  }, async (request: FastifyRequest<{ Body: CorruptRouteBody }>, reply: FastifyReply) => {
    try {
      const { files: rawFiles, ...options } = request.body;

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
      if (!validationResult.allValid) {
        return reply.status(400).send({
          success: false,
          error: 'File validation failed',
          data: {
            validationErrors: validationResult.results.filter(r => !r.isValid),
            globalErrors: validationResult.globalErrors
          },
          timestamp: new Date().toISOString()
        } as ApiResponseDto);
      }

      const corruptRequest: CorruptRequestDto = { files, ...options };
      const result = await javaCliService.corruptData(corruptRequest);

      return reply.status(200).send({
        success: true,
        data: result,
        timestamp: new Date().toISOString()
      } as ApiResponseDto<CorruptResultDto>);

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
      return reply.status(500).send({
        success: false,
        error: errorMessage,
        timestamp: new Date().toISOString()
      } as ApiResponseDto);
    }
  });

  fastify.post<{ Body: FixLFRouteBody }>('/fixlf', {
    schema: {
      summary: 'Fix line feed issues in binary dumps',
      description: 'Fixes CRLF to LF corruption in binary memory dumps',
      body: {
        type: 'object',
        properties: {
          files: {
            type: 'array',
            description: 'Array of binary files to fix',
            items: {
              type: 'object',
              properties: {
                name: { type: 'string', description: 'Filename' },
                data: { type: 'string', description: 'Base64 encoded file content' },
                size: { type: 'number', description: 'File size in bytes' }
              },
              required: ['name', 'data', 'size']
            }
          },
          outSuffix: { type: 'string', description: 'Suffix for fixed files (default -fixed)', default: '-fixed' }
        },
        required: ['files']
      }
    }
  }, async (request: FastifyRequest<{ Body: FixLFRouteBody }>, reply: FastifyReply) => {
    try {
      const { files: rawFiles, outSuffix } = request.body;

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

      const fixLFRequest: FixLFRequestDto = { files, outSuffix };
      const result = await javaCliService.fixLineFeeds(fixLFRequest);

      return reply.status(200).send({
        success: true,
        data: result,
        timestamp: new Date().toISOString()
      } as ApiResponseDto<FixLFResultDto>);

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
      return reply.status(500).send({
        success: false,
        error: errorMessage,
        timestamp: new Date().toISOString()
      } as ApiResponseDto);
    }
  });

  fastify.get('/health', {
    schema: {
      summary: 'Health check for data tools service',
      description: 'Returns health status of the data tools service (augment, corrupt, fixlf)'
    }
  }, async (_, reply: FastifyReply) => {
    return reply.status(200).send({
      success: true,
      data: {
        service: 'data',
        status: 'healthy',
        timestamp: new Date().toISOString()
      },
      timestamp: new Date().toISOString()
    } as ApiResponseDto);
  });
}
