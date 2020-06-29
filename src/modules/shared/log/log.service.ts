import angular from 'angular';
import { autobind } from 'core-decorators';
import { Injectable } from 'angular-ts-decorators';
import stackTrace from 'stacktrace-js';
import { Exception } from '../exceptions/exception-types';
import StoreService from '../store/store.service';
import Globals from '../globals';

export enum LogLevel {
  Error,
  Trace,
  Warn
}

interface LogQueueItem {
  level: LogLevel;
  message: object | string;
  error?: Exception;
}

@autobind
@Injectable('LogService')
export default class LogService {
  $injector: ng.auto.IInjectorService;
  $log: ng.ILogService;
  _storeSvc: StoreService;

  currentLogQueueItem: LogQueueItem;
  logItemQueue = [];

  static $inject = ['$injector', '$log'];
  constructor($injector: ng.auto.IInjectorService, $log: ng.ILogService) {
    this.$injector = $injector;
    this.$log = $log;
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

  logError(error: Exception, message?: string) {
    // Return if no error supplied or has already been logged
    if (!error || error.logged) {
      return null;
    }

    // Mark this error as logged to prevent duplication in logs
    error.logged = true;

    return stackTrace.fromError(error).then((frames: stackTrace.StackFrame[]) => {
      const stack = `${error.name}: ${error.message}\n${frames
        .map((f) => {
          return `\tat ${f.functionName} (${f.fileName}:${f.lineNumber}:${f.columnNumber})`;
        })
        .join('\n')}`;
      error.stack = stack;

      // Output message to console, add to queue and process
      this.logToConsole(message, LogLevel.Error, error);
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
        this.$log.warn(exception || message);
        break;
      case LogLevel.Warn:
        this.$log.warn(message);
        break;
      case LogLevel.Trace:
      default:
        this.$log.info(message);
    }
  }

  logWarning(message: object | string) {
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

  processLogItemQueue(): angular.IPromise<void> {
    // Return if currently processing or no more items to process
    if (this.currentLogQueueItem || this.logItemQueue.length === 0) {
      return Promise.resolve();
    }

    // Get the next log item to process
    this.currentLogQueueItem = this.logItemQueue.shift();

    // Format the log item with current time stamp and log type
    let messageLogText = `${new Date().toISOString().replace(/[A-Z]/g, ' ').trim()}\t`;
    switch (this.currentLogQueueItem.level) {
      case LogLevel.Error:
        messageLogText += '[error]\t';
        break;
      case LogLevel.Warn:
        messageLogText += '[warn]\t';
        break;
      case LogLevel.Trace:
      default:
        messageLogText += '[trace]\t';
    }

    // Add message text to log item and add to end of log
    return this.storeSvc
      .get(Globals.CacheKeys.TraceLog)
      .then((debugMessageLog) => {
        debugMessageLog = debugMessageLog || [];
        messageLogText += angular.isObject(this.currentLogQueueItem.message)
          ? angular.toJson(this.currentLogQueueItem.message)
          : this.currentLogQueueItem.message || '';
        if (this.currentLogQueueItem.error) {
          messageLogText += `${this.currentLogQueueItem.error.stack.replace(/\s+/g, ' ')}`;
        }
        debugMessageLog.push(messageLogText);
        return this.storeSvc.set(Globals.CacheKeys.TraceLog, debugMessageLog);
      })
      .then(() => {
        // Process remaining messages
        this.currentLogQueueItem = undefined;
        this.processLogItemQueue();
      });
  }
}
