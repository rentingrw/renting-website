import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import type { Response } from 'express';

const SCHEMA_HINT =
  'Database schema is outdated. Apply pending Prisma migrations on the production database (`pnpm --filter @rentingi/db exec prisma migrate deploy`), then redeploy the API.';

function isSchemaDriftError(error: unknown): boolean {
  if (error instanceof Prisma.PrismaClientKnownRequestError) {
    // P2021 table missing, P2022 column missing, P2010 raw query failed (often missing column/enum)
    return error.code === 'P2021' || error.code === 'P2022' || error.code === 'P2010';
  }
  if (
    error instanceof Prisma.PrismaClientUnknownRequestError ||
    error instanceof Prisma.PrismaClientRustPanicError ||
    error instanceof Error
  ) {
    const message = error.message.toLowerCase();
    return (
      message.includes('does not exist') ||
      (message.includes('column') && message.includes('does not exist')) ||
      (message.includes('relation') && message.includes('does not exist')) ||
      message.includes('invalid input value for enum') ||
      message.includes('undefined_column') ||
      message.includes('undefined_table')
    );
  }
  return false;
}

@Catch(
  Prisma.PrismaClientKnownRequestError,
  Prisma.PrismaClientUnknownRequestError,
  Prisma.PrismaClientRustPanicError,
)
export class PrismaExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(PrismaExceptionFilter.name);

  catch(exception: unknown, host: ArgumentsHost) {
    const response = host.switchToHttp().getResponse<Response>();

    if (isSchemaDriftError(exception)) {
      this.logger.error(
        SCHEMA_HINT,
        exception instanceof Error ? exception.stack : String(exception),
      );
      response.status(HttpStatus.SERVICE_UNAVAILABLE).json({
        statusCode: HttpStatus.SERVICE_UNAVAILABLE,
        message: SCHEMA_HINT,
        error: 'Service Unavailable',
      });
      return;
    }

    this.logger.error(
      'Prisma request failed',
      exception instanceof Error ? exception.stack : String(exception),
    );
    response.status(HttpStatus.INTERNAL_SERVER_ERROR).json({
      statusCode: HttpStatus.INTERNAL_SERVER_ERROR,
      message: 'Internal server error',
    });
  }
}
