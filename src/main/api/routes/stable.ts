import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { JavaCliService } from '../services/javaCliService';
import { FileService } from '../services/fileService';
import { StableRequestDto } from '../dto/requests';
import { ApiResponseDto, StableGenerationResultDto } from '../dto/responses';

interface StableRouteBody {
  files: Array<{
    name: string;
    data: string;
    size: number;
  }>;
  keyLength: number;
}

export async function stableRoutes(fastify: FastifyInstance) {
  const javaCliService = new JavaCliService();
  const fileService = new FileService();

  fastify.post<{ Body: StableRouteBody }>('/generate', {
    schema: {
      summary: 'Generate stable positions for PUF key extraction',
      description: 'Generates stable bit positions from multiple memory dumps for consistent key extraction',
      body: {
        type: 'object',
        properties: {
          files: {
            type: 'array',
            description: 'Array of binary files (minimum 2 required)',
            minItems: 2,
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
          },
          keyLength: {
            type: 'number',
            description: 'Desired key length in bits',
            minimum: 8,
            maximum: 1024,
            default: 128
          }
        },
        required: ['files', 'keyLength']
      }
    }
  }, async (request: FastifyRequest<{ Body: StableRouteBody }>, reply: FastifyReply) => {
    try {
      const { files: rawFiles, keyLength } = request.body;

      if (!rawFiles || rawFiles.length === 0) {
        return reply.status(400).send({
          success: false,
          error: 'No files provided',
          timestamp: new Date().toISOString()
        } as ApiResponseDto);
      }

      if (!keyLength || keyLength <= 0) {
        return reply.status(400).send({
          success: false,
          error: 'Key length must be a positive integer',
          timestamp: new Date().toISOString()
        } as ApiResponseDto);
      }

      if (keyLength > 1024) {
        return reply.status(400).send({
          success: false,
          error: 'Key length cannot exceed 1024 bits',
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

      const stableRequest: StableRequestDto = {
        files,
        keyLength
      };

      const result = await javaCliService.generateStable(stableRequest);

      return reply.status(200).send({
        success: true,
        data: result,
        timestamp: new Date().toISOString()
      } as ApiResponseDto<StableGenerationResultDto>);

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
      
      return reply.status(500).send({
        success: false,
        error: errorMessage,
        timestamp: new Date().toISOString()
      } as ApiResponseDto);
    }
  });

  fastify.get('/health', async (_, reply: FastifyReply) => {
    return reply.status(200).send({
      success: true,
      data: {
        service: 'stable',
        status: 'healthy',
        timestamp: new Date().toISOString()
      },
      timestamp: new Date().toISOString()
    } as ApiResponseDto);
  });
}