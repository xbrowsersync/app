import { BaseError } from '../errors/errors';
import { LogLevel } from './log.enum';

export interface LogQueueItem {
  level: LogLevel;
  message: object | string;
  error?: BaseError;
}
