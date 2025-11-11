import { FastifyInstance, FastifyRequest, FastifyReply, FastifyError } from 'fastify';
import { ApiResponseDto } from '../dto/responses';

interface ErrorContext {
  request: FastifyRequest;
  reply: FastifyReply;
}

export class ApiError extends Error {
  public statusCode: number;
  public code: string;

  constructor(message: string, statusCode: number = 500, code: string = 'INTERNAL_ERROR') {
    super(message);
    this.name = 'ApiError';
    this.statusCode = statusCode;
    this.code = code;
  }
}

export class ValidationError extends ApiError {
  constructor(message: string, field?: string) {
    const errorMessage = field ? `Validation error for field '${field}': ${message}` : `Validation error: ${message}`;
    super(errorMessage, 400, 'VALIDATION_ERROR');
    this.name = 'ValidationError';
  }
}

export class FileError extends ApiError {
  constructor(message: string, filename?: string) {
    const errorMessage = filename ? `File error for '${filename}': ${message}` : `File error: ${message}`;
    super(errorMessage, 400, 'FILE_ERROR');
    this.name = 'FileError';
  }
}

export class JavaExecutionError extends ApiError {
  constructor(message: string, command?: string, exitCode?: number) {
    const errorMessage = command 
      ? `Java execution failed for command '${command}' with exit code ${exitCode}: ${message}`
      : `Java execution failed: ${message}`;
    super(errorMessage, 500, 'JAVA_EXECUTION_ERROR');
    this.name = 'JavaExecutionError';
  }
}

export async function setupErrorHandler(fastify: FastifyInstance) {
  try {
    fastify.setErrorHandler(async (error: FastifyError, request: FastifyRequest, reply: FastifyReply) => {
      const context: ErrorContext = { request, reply };
      
      if (error instanceof ApiError) {
        return handleApiError(error, context);
      }

      if (error.validation) {
        return handleValidationError(error, context);
      }

      if (error.statusCode && error.statusCode < 500) {
        return handleClientError(error, context);
      }

      return handleServerError(error, context);
    });

    fastify.setNotFoundHandler(async (request: FastifyRequest, reply: FastifyReply) => {
      return reply.status(404).send({
        success: false,
        error: `Route ${request.method} ${request.url} not found`,
        timestamp: new Date().toISOString()
      } as ApiResponseDto);
    });
  } catch (error) {
    console.warn('Error handlers already set, skipping setup');
  }
}

function handleApiError(error: ApiError, { request, reply }: ErrorContext) {
  logError(error, request);
  
  return reply.status(error.statusCode).send({
    success: false,
    error: error.message,
    data: {
      code: error.code,
      statusCode: error.statusCode
    },
    timestamp: new Date().toISOString()
  } as ApiResponseDto);
}

function handleValidationError(error: FastifyError, { request, reply }: ErrorContext) {
  logError(error, request);
  
  const validationMessage = error.validation 
    ? error.validation.map(v => `${v.instancePath || 'root'}: ${v.message}`).join(', ')
    : 'Request validation failed';

  return reply.status(400).send({
    success: false,
    error: validationMessage,
    data: {
      code: 'VALIDATION_ERROR',
      validation: error.validation
    },
    timestamp: new Date().toISOString()
  } as ApiResponseDto);
}

function handleClientError(error: FastifyError, { request, reply }: ErrorContext) {
  logError(error, request);
  
  return reply.status(error.statusCode || 400).send({
    success: false,
    error: error.message || 'Bad request',
    data: {
      code: 'CLIENT_ERROR',
      statusCode: error.statusCode
    },
    timestamp: new Date().toISOString()
  } as ApiResponseDto);
}

function handleServerError(error: FastifyError, { request, reply }: ErrorContext) {
  logError(error, request, true);
  
  const isDev = process.env.NODE_ENV !== 'production';
  
  return reply.status(error.statusCode || 500).send({
    success: false,
    error: 'Internal server error',
    data: {
      code: 'INTERNAL_ERROR',
      ...(isDev && { 
        details: error.message,
        stack: error.stack 
      })
    },
    timestamp: new Date().toISOString()
  } as ApiResponseDto);
}

function logError(error: FastifyError | ApiError, request: FastifyRequest, isServerError: boolean = false) {
  const logLevel = isServerError ? 'error' : 'warn';
  const logMessage = {
    level: logLevel,
    error: {
      name: error.name,
      message: error.message,
      stack: error.stack
    },
    request: {
      method: request.method,
      url: request.url,
      headers: request.headers,
      body: request.body
    },
    timestamp: new Date().toISOString()
  };

  console[logLevel](JSON.stringify(logMessage, null, 2));
}

export function createRequestLogger() {
  return async (request: FastifyRequest, reply: FastifyReply) => {
    const start = Date.now();
    
    reply.raw.on('finish', () => {
      const duration = Date.now() - start;
      const logData = {
        method: request.method,
        url: request.url,
        statusCode: reply.statusCode,
        duration: `${duration}ms`,
        timestamp: new Date().toISOString()
      };
      
      console.log(`${request.method} ${request.url} - ${reply.statusCode} - ${duration}ms`);
    });
  };
}