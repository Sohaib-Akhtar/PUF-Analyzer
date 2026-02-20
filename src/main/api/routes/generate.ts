import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { JavaCliService } from '../services/javaCliService';
import { RandomDataRequestDto, RepeatedDataRequestDto } from '../dto/requests';
import { ApiResponseDto, RandomDataResultDto, RepeatedDataResultDto } from '../dto/responses';

interface RandomRouteBody {
  filenames?: string[];
  hammingWeightMultiplier?: number;
  hammingWeight?: number;
  bits?: number;
}

interface RepeatedRouteBody {
  filename?: string;
  bits?: number;
  data?: string;
}

export async function generateRoutes(fastify: FastifyInstance) {
  const javaCliService = new JavaCliService();

  fastify.post<{ Body: RandomRouteBody }>('/random', {
    schema: {
      summary: 'Generate random binary data',
      description: 'Generates random binary data with a configurable fractional Hamming weight',
      body: {
        type: 'object',
        properties: {
          filenames: {
            type: 'array',
            description: 'Output filenames (default ["rnd.bin"])',
            items: { type: 'string' }
          },
          hammingWeightMultiplier: { type: 'number', description: 'Multiplier for FHW (default 1)', default: 1 },
          hammingWeight: { type: 'number', description: 'Inverse of FHW (default 100)', default: 100 },
          bits: { type: 'number', description: 'Number of bits to generate (default 262144)', default: 262144 }
        }
      }
    }
  }, async (request: FastifyRequest<{ Body: RandomRouteBody }>, reply: FastifyReply) => {
    try {
      const randomRequest: RandomDataRequestDto = {
        filenames: request.body.filenames,
        hammingWeightMultiplier: request.body.hammingWeightMultiplier,
        hammingWeight: request.body.hammingWeight,
        bits: request.body.bits
      };

      const result = await javaCliService.generateRandom(randomRequest);

      return reply.status(200).send({
        success: true,
        data: result,
        timestamp: new Date().toISOString()
      } as ApiResponseDto<RandomDataResultDto>);

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
      return reply.status(500).send({
        success: false,
        error: errorMessage,
        timestamp: new Date().toISOString()
      } as ApiResponseDto);
    }
  });

  fastify.post<{ Body: RepeatedRouteBody }>('/repeated', {
    schema: {
      summary: 'Generate repeated binary pattern data',
      description: 'Generates a binary dump by repeating a given bit pattern',
      body: {
        type: 'object',
        properties: {
          filename: { type: 'string', description: 'Output filename' },
          bits: { type: 'number', description: 'Total bits to generate (default 262144)', default: 262144 },
          data: { type: 'string', description: 'Bit string to repeat (default 00000000)', default: '00000000' }
        }
      }
    }
  }, async (request: FastifyRequest<{ Body: RepeatedRouteBody }>, reply: FastifyReply) => {
    try {
      const repeatedRequest: RepeatedDataRequestDto = {
        filename: request.body.filename,
        bits: request.body.bits,
        data: request.body.data
      };

      const result = await javaCliService.generateRepeated(repeatedRequest);

      return reply.status(200).send({
        success: true,
        data: result,
        timestamp: new Date().toISOString()
      } as ApiResponseDto<RepeatedDataResultDto>);

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
      summary: 'Health check for generate service',
      description: 'Returns health status of the data generation service'
    }
  }, async (_, reply: FastifyReply) => {
    return reply.status(200).send({
      success: true,
      data: {
        service: 'generate',
        status: 'healthy',
        timestamp: new Date().toISOString()
      },
      timestamp: new Date().toISOString()
    } as ApiResponseDto);
  });
}
