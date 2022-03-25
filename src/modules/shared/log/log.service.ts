import { Injectable } from 'angular-ts-decorators';
import stackTrace from 'stacktrace-js';
import { BaseError } from '../errors/errors';
import { StoreKey } from '../store/store.enum';
import { TraceLogItem } from '../store/store.interface';
import { StoreService } from '../store/store.service';
import { LogLevel } from './log.enum';
import { LogQueueItem } from './log.interface';

@Injectable('LogService')
export class LogService {
  private $injector: ng.auto.IInjectorService;
  private $log: ng.ILogService;
  private _$q: ng.IQService;
  private _storeSvc: StoreService;

  private currentLogQueueItem: LogQueueItem;
  private logItemQueue = [];

  static $inject = ['$injector', '$log'];
  constructor($injector: ng.auto.IInjectorService, $log: ng.ILogService) {
    this.$injector = $injector;
    this.$log = $log;
  }

  private get $q(): ng.IQService {
    if (!this._$q) {
      this._$q = this.$injector.get('$q');
    }
    return this._$q;
  }

  private get storeSvc(): StoreService {
    if (!this._storeSvc) {
      this._storeSvc = this.$injector.get('StoreService');
    }
    return this._storeSvc;
  }

  private addLogItemToQueue(logItem: LogQueueItem): void {
    this.logItemQueue.push(logItem);
  }

  getLogEntries(): ng.IPromise<TraceLogItem[]> {
    return this.storeSvc.get<TraceLogItem[]>(StoreKey.TraceLog);
  }

  clear(): ng.IPromise<void> {
    return this.storeSvc.remove(StoreKey.TraceLog);
  }

  logError(error: BaseError, message?: string): ng.IPromise<void> {
    // Return if no error supplied or has already been logged
    if (error.logged) {
      return;
    }

    // Mark this error as logged to prevent duplication in logs
    error.logged = true;

    // Output message to console
    if (message) {
      this.$log.warn(message, error);
    } else {
      this.$log.warn(error);
    }

    // Convert stack trace to show source files then add to queue and process
    return (
      !error.stack
        ? this.$q.resolve()
        : stackTrace.fromError(error).then((frames) => {
            if (frames) {
              const stack = `${error.name} (${error.constructor.name}): ${error.message}\n${frames
                .map((f) => `\tat ${f.functionName} (${f.fileName}:${f.lineNumber}:${f.columnNumber})`)
                .join('\n')}`;
              error.stack = stack;
            }
          })
    ).then(() => {
      this.addLogItemToQueue({
        level: LogLevel.Error,
        message,
        error
      });
      return this.processLogItemQueue();
    });
  }

  logInfo(message: object | string): ng.IPromise<void> {
    if (!message) {
      return;
    }

    // Output message to console, add to queue and process
    this.$log.info(message);
    this.addLogItemToQueue({
      level: LogLevel.Trace,
      message
    });
    return this.processLogItemQueue();
  }

  logWarning(message: object | string): ng.IPromise<void> {
    if (!message) {
      return;
    }

    // Output message to console, add to queue and process
    this.$log.warn(message);
    this.addLogItemToQueue({
      level: LogLevel.Warn,
      message
    });
    return this.processLogItemQueue();
  }

  private processLogItemQueue(): ng.IPromise<void> {
    // Return if currently processing or no more items to process
    if (this.currentLogQueueItem || this.logItemQueue.length === 0) {
      return this.$q.resolve();
    }

    // Get the next log item to process
    this.currentLogQueueItem = this.logItemQueue.shift();

    // Format log message
    let message =
      typeof this.currentLogQueueItem.message === 'object'
        ? JSON.stringify(this.currentLogQueueItem.message)
        : this.currentLogQueueItem.message ?? '';
    if (this.currentLogQueueItem.error) {
      message += this.currentLogQueueItem.error.stack
        ? `${this.currentLogQueueItem.error.stack.replace(/\s+/g, ' ')}`
        : '';
    }

    // Add log item to store
    const logItem: TraceLogItem = {
      level: this.currentLogQueueItem.level,
      message,
      timestamp: new Date().getTime()
    };
    return this.storeSvc.set(StoreKey.TraceLog, logItem).then(() => {
      // Process remaining messages
      this.currentLogQueueItem = undefined;
      this.processLogItemQueue();
    });
  }
}
