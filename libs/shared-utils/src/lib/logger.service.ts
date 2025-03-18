import { Injectable, LoggerService as NestLoggerService } from '@nestjs/common';

@Injectable()
export class LoggerService implements NestLoggerService {
  log(message: string, context?: string) {
    console.log(`[${context || 'LOG'}] ${message}`);
  }

  error(message: string, trace?: string, context?: string) {
    console.error(`[${context || 'ERROR'}] ${message}`);
    if (trace) {
      console.error(trace);
    }
  }

  warn(message: string, context?: string) {
    console.warn(`[${context || 'WARN'}] ${message}`);
  }

  debug(message: string, context?: string) {
    console.debug(`[${context || 'DEBUG'}] ${message}`);
  }

  verbose(message: string, context?: string) {
    console.info(`[${context || 'VERBOSE'}] ${message}`);
  }
}
