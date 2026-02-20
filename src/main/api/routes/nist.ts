import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { JavaCliService } from '../services/javaCliService';
import { FileService } from '../services/fileService';
import { NistAverageRequestDto } from '../dto/requests';
import { ApiResponseDto, NistAverageResultDto } from '../dto/responses';

interface NistRouteBody {
  files: Array<{ name: string; data: string; size: number }>;
  outFile?: string;
}

export async function nistRoutes(fastify: FastifyInstance) {
  const javaCliService = new JavaCliService();
  const fileService = new FileService();

  fastify.post<{ Body: NistRouteBody }>('/average', {
    schema: {
      summary: 'Average NIST randomness test results',
      description: 'Averages results from the NIST Randomness Test Suite across multiple test result files',
      body: {
        type: 'object',
        properties: {
          files: {
            type: 'array',
            description: 'Array of NIST result files to average',
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
          outFile: { type: 'string', description: 'Output filename (default nist-avg.txt)', default: 'nist-avg.txt' }
        },
        required: ['files']
      }
    }
  }, async (request: FastifyRequest<{ Body: NistRouteBody }>, reply: FastifyReply) => {
    try {
      const { files: rawFiles, outFile } = request.body;

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

      const nistRequest: NistAverageRequestDto = { files, outFile };
      const result = await javaCliService.nistAverage(nistRequest);

      return reply.status(200).send({
        success: true,
        data: result,
        timestamp: new Date().toISOString()
      } as ApiResponseDto<NistAverageResultDto>);

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
      summary: 'Health check for NIST service',
      description: 'Returns health status of the NIST analysis service'
    }
  }, async (_, reply: FastifyReply) => {
    return reply.status(200).send({
      success: true,
      data: {
        service: 'nist',
        status: 'healthy',
        timestamp: new Date().toISOString()
      },
      timestamp: new Date().toISOString()
    } as ApiResponseDto);
  });
}
