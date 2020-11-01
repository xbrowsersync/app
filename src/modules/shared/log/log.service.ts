import angular from 'angular';
import { Injectable } from 'angular-ts-decorators';
import autobind from 'autobind-decorator';
import stackTrace from 'stacktrace-js';
import { Exception } from '../exception/exception';
import { StoreKey } from '../store/store.enum';
import { TraceLogItem } from '../store/store.interface';
import StoreService from '../store/store.service';
import { LogLevel } from './log.enum';
import { LogQueueItem } from './log.interface';

@autobind
@Injectable('LogService')
export default class LogService {
  $injector: ng.auto.IInjectorService;
  $log: ng.ILogService;
  _$q: ng.IQService;
  _storeSvc: StoreService;

  currentLogQueueItem: LogQueueItem;
  logItemQueue = [];

  static $inject = ['$injector', '$log'];
  constructor($injector: ng.auto.IInjectorService, $log: ng.ILogService) {
    this.$injector = $injector;
    this.$log = $log;
  }

  get $q(): ng.IQService {
    if (angular.isUndefined(this._$q)) {
      this._$q = this.$injector.get('$q');
    }
    return this._$q;
  }

  get storeSvc(): StoreService {
    if (angular.isUndefined(this._storeSvc)) {
      this._storeSvc = this.$injector.get('StoreService');
    }
    return this._storeSvc;
  }

  addLogItemToQueue(logItem: LogQueueItem): void {
    this.logItemQueue.push(logItem);
  }

  getLogEntries(): ng.IPromise<TraceLogItem[]> {
    return this.storeSvc.get<TraceLogItem[]>(StoreKey.TraceLog);
  }

  clear(): ng.IPromise<void> {
    return this.storeSvc.remove(StoreKey.TraceLog);
  }

  logError(error: Exception, message?: string): ng.IPromise<void> {
    // Return if no error supplied or has already been logged
    if (error.logged) {
      return;
    }

    // Mark this error as logged to prevent duplication in logs
    error.logged = true;

    // Output message to console
    this.logToConsole(message, LogLevel.Error, error);

    // Convert stack trace to show source files then add to queue and process
    return angular.isUndefined(error.stack ?? undefined)
      ? this.$q.resolve()
      : stackTrace.fromError(error).then((frames) => {
          if (frames) {
            const stack = `${error.name} (${error.constructor.name}): ${error.message}\n${frames
              .map((f) => {
                return `\tat ${f.functionName} (${f.fileName}:${f.lineNumber}:${f.columnNumber})`;
              })
              .join('\n')}`;
            error.stack = stack;
          }

          this.addLogItemToQueue({
            level: LogLevel.Error,
            message,
            error
          });
          this.processLogItemQueue();
        });
  }

  logInfo(message: object | string): void {
    if (!message) {
      return;
    }

    // Output message to console, add to queue and process
    this.logToConsole(message);
    this.addLogItemToQueue({
      level: LogLevel.Trace,
      message
    });
    this.processLogItemQueue();
  }

  logToConsole(message: object | string, level = LogLevel.Trace, exception?: Exception): void {
    switch (level) {
      case LogLevel.Error:
        this.$log.warn(exception ?? message);
        break;
      case LogLevel.Warn:
        this.$log.warn(message);
        break;
      case LogLevel.Trace:
      default:
        this.$log.info(message);
    }
  }

  logWarning(message: object | string): void {
    if (!message) {
      return;
    }

    // Output message to console, add to queue and process
    this.logToConsole(message, LogLevel.Warn);
    this.addLogItemToQueue({
      level: LogLevel.Warn,
      message
    });
    this.processLogItemQueue();
  }

  processLogItemQueue(): ng.IPromise<void> {
    // Return if currently processing or no more items to process
    if (this.currentLogQueueItem || this.logItemQueue.length === 0) {
      return this.$q.resolve();
    }

    // Get the next log item to process
    this.currentLogQueueItem = this.logItemQueue.shift();

    // Format log message
    let message = angular.isObject(this.currentLogQueueItem.message)
      ? JSON.stringify(this.currentLogQueueItem.message)
      : this.currentLogQueueItem.message ?? '';
    if (this.currentLogQueueItem.error) {
      message += `${this.currentLogQueueItem.error.stack.replace(/\s+/g, ' ')}`;
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
