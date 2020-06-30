import { Exception } from '../exceptions/exception';
import LogLevel from './log-level.enum';

export default interface LogQueueItem {
  level: LogLevel;
  message: object | string;
  error?: Exception;
}
