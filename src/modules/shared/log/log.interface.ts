import { Exception } from '../exception/exception';
import { LogLevel } from './log.enum';

export interface LogQueueItem {
  level: LogLevel;
  message: object | string;
  error?: Exception;
}
