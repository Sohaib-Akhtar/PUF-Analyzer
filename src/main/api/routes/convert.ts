import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { JavaCliService } from '../services/javaCliService';
import { FileService } from '../services/fileService';
import { ConvertRequestDto } from '../dto/requests';
import { ApiResponseDto, ConversionResultDto } from '../dto/responses';

interface ConvertRouteBody {
  files?: Array<{
    name: string;
    data: string;
    size: number;
  }>;
  input?: string;
  from: 'bin' | 'txt';
  binWidth?: number;
  line?: boolean;
  findComma?: boolean;
}

export async function convertRoutes(fastify: FastifyInstance) {
  const javaCliService = new JavaCliService();
  const fileService = new FileService();

  fastify.post<{ Body: ConvertRouteBody }>('/binary', {
    schema: {
      summary: 'Convert binary data between formats',
      description: 'Converts binary data between different formats (bin/txt) using the Java CLI',
      body: {
        type: 'object',
        properties: {
          files: {
            type: 'array',
            description: 'Array of files to convert (use either files or input, not both)',
            items: {
              type: 'object',
              properties: {
                name: { 
                  type: 'string', 
                  description: 'Filename'
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
          input: {
            type: 'string',
            description: 'Input string for line mode conversion (use either files or input, not both)'
          },
          from: {
            type: 'string',
            enum: ['bin', 'txt'],
            description: 'Source format to convert from'
          },
          binWidth: {
            type: 'number',
            description: 'Binary width for conversion',
            minimum: 1,
            maximum: 8,
            default: 8
          },
          line: {
            type: 'boolean',
            description: 'Use line mode with input string',
            default: false
          },
          findComma: { 
            type: 'boolean', 
            description: 'Find comma delimiter in data',
            default: false
          }
        },
        required: ['from']
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
  }, async (request: FastifyRequest<{ Body: ConvertRouteBody }>, reply: FastifyReply) => {
    try {
      const { files: rawFiles, input, from, binWidth = 8, line = false, findComma = false } = request.body;

      if (!from || !['bin', 'txt'].includes(from)) {
        return reply.status(400).send({
          success: false,
          error: 'Parameter "from" must be either "bin" or "txt"',
          timestamp: new Date().toISOString()
        } as ApiResponseDto);
      }

      if (binWidth <= 0 || binWidth > 8) {
        return reply.status(400).send({
          success: false,
          error: 'Binary width must be between 1 and 8',
          timestamp: new Date().toISOString()
        } as ApiResponseDto);
      }

      if (line && !input) {
        return reply.status(400).send({
          success: false,
          error: 'Input string required when using line mode',
          timestamp: new Date().toISOString()
        } as ApiResponseDto);
      }

      if (!line && (!rawFiles || rawFiles.length === 0)) {
        return reply.status(400).send({
          success: false,
          error: 'Files required when not using line mode',
          timestamp: new Date().toISOString()
        } as ApiResponseDto);
      }

      let files: Array<{ name: string; data: Buffer; size: number }> | undefined;
      
      if (!line && rawFiles) {
        files = rawFiles.map(f => ({
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
      }

      const convertRequest: ConvertRequestDto = {
        files: files || undefined,
        input,
        from,
        binWidth,
        line,
        findComma
      };

      const result = await javaCliService.convertBinary(convertRequest);

      return reply.status(200).send({
        success: true,
        data: result,
        timestamp: new Date().toISOString()
      } as ApiResponseDto<ConversionResultDto>);

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
      
      return reply.status(500).send({
        success: false,
        error: errorMessage,
        timestamp: new Date().toISOString()
      } as ApiResponseDto);
    }
  });

  fastify.post<{ Body: ConvertRouteBody }>('/hex', {
    schema: {
      summary: 'Convert hexadecimal data (Not Implemented)',
      description: 'Hex conversion functionality is not yet implemented',
      response: {
        501: {
          type: 'object',
          properties: {
            success: { type: 'boolean' },
            error: { type: 'string' },
            timestamp: { type: 'string' }
          }
        }
      }
    }
  }, async (_, reply: FastifyReply) => {
    try {
      return reply.status(501).send({
        success: false,
        error: 'Hex conversion not yet implemented',
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

  fastify.get('/health', {
    schema: {
      summary: 'Health check for convert service',
      description: 'Returns the health status of the convert service',
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
        service: 'convert',
        status: 'healthy',
        timestamp: new Date().toISOString()
      },
      timestamp: new Date().toISOString()
    } as ApiResponseDto);
  });
}