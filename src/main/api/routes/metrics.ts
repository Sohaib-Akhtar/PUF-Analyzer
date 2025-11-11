import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { JavaCliService } from '../services/javaCliService';
import { FileService } from '../services/fileService';
import { MetricsRequestDto } from '../dto/requests';
import { ApiResponseDto, PufAnalysisResultDto } from '../dto/responses';

interface MetricsRouteBody {
  files: Array<{
    name: string;
    data: string;
    size: number;
  }>;
  onlyTotal?: boolean;
  findComma?: boolean;
  startIndicator?: string;
  initValue?: string;
  jobs?: number;
}

export async function metricsRoutes(fastify: FastifyInstance) {
  const javaCliService = new JavaCliService();
  const fileService = new FileService();

  fastify.post<{ Body: MetricsRouteBody }>('/analyze', {
    schema: {
      summary: 'Analyze PUF metrics from binary files',
      description: 'Performs PUF metrics analysis on uploaded binary files using the Java CLI',
      body: {
        type: 'object',
        properties: {
          files: {
            type: 'array',
            description: 'Array of binary files to analyze',
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
          onlyTotal: { 
            type: 'boolean', 
            description: 'Return only total metrics',
            default: false
          },
          findComma: { 
            type: 'boolean', 
            description: 'Find comma delimiter in data',
            default: false
          },
          startIndicator: { 
            type: 'string', 
            description: 'Start character indicator',
            default: ','
          },
          initValue: { 
            type: 'string', 
            description: 'Init value (hex)',
            default: '00000000'
          },
          jobs: { 
            type: 'number', 
            description: 'Number of parallel jobs',
            minimum: 1,
            maximum: 16,
            default: 4
          }
        },
        required: ['files']
      }
    }
  }, async (request: FastifyRequest<{ Body: MetricsRouteBody }>, reply: FastifyReply) => {
    try {
      const { files: rawFiles, onlyTotal = false, findComma = false, startIndicator = ',', initValue = '00000000', jobs = 4 } = request.body;

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

      const metricsRequest: MetricsRequestDto = {
        files,
        onlyTotal,
        findComma,
        startIndicator,
        initValue,
        jobs
      };

      const result = await javaCliService.executeMetrics(metricsRequest);

      return reply.status(200).send({
        success: true,
        data: result,
        timestamp: new Date().toISOString()
      } as ApiResponseDto<PufAnalysisResultDto>);

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
      summary: 'Health check for metrics service',
      description: 'Returns health status of the metrics analysis service'
    }
  }, async (_, reply: FastifyReply) => {
    return reply.status(200).send({
      success: true,
      data: {
        service: 'metrics',
        status: 'healthy',
        timestamp: new Date().toISOString()
      },
      timestamp: new Date().toISOString()
    } as ApiResponseDto);
  });
}