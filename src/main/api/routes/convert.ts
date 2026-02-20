import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { JavaCliService } from '../services/javaCliService';
import { FileService } from '../services/fileService';
import { ConvertRequestDto, HexConvertRequestDto, ImageConvertRequestDto } from '../dto/requests';
import { ApiResponseDto, ConversionResultDto, HexConversionResultDto, ImageConversionResultDto } from '../dto/responses';

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

interface HexRouteBody {
  files?: Array<{
    name: string;
    data: string;
    size: number;
  }>;
  input?: string;
  from: 'hex' | 'txt';
  line?: boolean;
  findComma?: boolean;
}

interface ImageRouteBody {
  files: Array<{
    name: string;
    data: string;
    size: number;
  }>;
  from: 'bin' | 'img';
  imageWidth?: number;
  imageHeight?: number;
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
            data: { type: 'object', additionalProperties: true },
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

  fastify.post<{ Body: HexRouteBody }>('/hex', {
    schema: {
      summary: 'Convert hexadecimal data between formats',
      description: 'Converts data between hex and txt formats using the Java CLI',
      body: {
        type: 'object',
        properties: {
          files: {
            type: 'array',
            description: 'Array of files to convert',
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
          input: { type: 'string', description: 'Input string for line mode' },
          from: { type: 'string', enum: ['hex', 'txt'], description: 'Source format' },
          line: { type: 'boolean', description: 'Use line mode with input string', default: false },
          findComma: { type: 'boolean', description: 'Find comma delimiter in data', default: false }
        },
        required: ['from']
      }
    }
  }, async (request: FastifyRequest<{ Body: HexRouteBody }>, reply: FastifyReply) => {
    try {
      const { files: rawFiles, input, from, line = false, findComma = false } = request.body;

      if (!from || !['hex', 'txt'].includes(from)) {
        return reply.status(400).send({
          success: false,
          error: 'Parameter "from" must be either "hex" or "txt"',
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

      const hexRequest: HexConvertRequestDto = {
        files: files || undefined,
        input,
        from,
        line,
        findComma
      };

      const result = await javaCliService.convertHex(hexRequest);

      return reply.status(200).send({
        success: true,
        data: result,
        timestamp: new Date().toISOString()
      } as ApiResponseDto<HexConversionResultDto>);

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
      return reply.status(500).send({
        success: false,
        error: errorMessage,
        timestamp: new Date().toISOString()
      } as ApiResponseDto);
    }
  });

  fastify.post<{ Body: ImageRouteBody }>('/image', {
    schema: {
      summary: 'Convert between binary dumps and PNG images',
      description: 'Converts binary data to/from PNG images using the Java CLI',
      body: {
        type: 'object',
        properties: {
          files: {
            type: 'array',
            description: 'Array of files to convert',
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
          from: { type: 'string', enum: ['bin', 'img'], description: 'Source format' },
          imageWidth: { type: 'number', description: 'Image width in pixels', default: 32 },
          imageHeight: { type: 'number', description: 'Image height (0 = auto)', default: 0 },
          findComma: { type: 'boolean', description: 'Find comma delimiter in data', default: false }
        },
        required: ['files', 'from']
      }
    }
  }, async (request: FastifyRequest<{ Body: ImageRouteBody }>, reply: FastifyReply) => {
    try {
      const { files: rawFiles, from, imageWidth, imageHeight, findComma = false } = request.body;

      if (!rawFiles || rawFiles.length === 0) {
        return reply.status(400).send({
          success: false,
          error: 'No files provided',
          timestamp: new Date().toISOString()
        } as ApiResponseDto);
      }

      if (!from || !['bin', 'img'].includes(from)) {
        return reply.status(400).send({
          success: false,
          error: 'Parameter "from" must be either "bin" or "img"',
          timestamp: new Date().toISOString()
        } as ApiResponseDto);
      }

      const files = rawFiles.map(f => ({
        name: f.name,
        data: Buffer.from(f.data, 'base64'),
        size: f.size
      }));

      const imageRequest: ImageConvertRequestDto = {
        files,
        from,
        imageWidth,
        imageHeight,
        findComma
      };

      const result = await javaCliService.convertImage(imageRequest);

      return reply.status(200).send({
        success: true,
        data: result,
        timestamp: new Date().toISOString()
      } as ApiResponseDto<ImageConversionResultDto>);

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