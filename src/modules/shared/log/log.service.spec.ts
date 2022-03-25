// eslint-disable-next-line unused-imports/no-unused-imports-ts
import stackTrace from 'stacktrace-js';
import { $injector, $log, $q } from '../../../test/mock-services';
import { BaseError } from '../errors/errors';
import { StoreKey } from '../store/store.enum';
import { TraceLogItem } from '../store/store.interface';
import { StoreService } from '../store/store.service';
import { LogLevel } from './log.enum';
import { LogService } from './log.service';

jest.mock('stacktrace-js', () => {
  return {
    default: {
      fromError: jest.fn()
    }
  };
});

describe('LogService', () => {
  beforeEach(() => {
    jest.spyOn($injector, 'get').mockImplementation((name: string) => {
      const mock$q = $q;
      switch (name) {
        case '$q':
          return mock$q;
        case 'StoreService':
          return StoreService.prototype as any;
        default:
      }
    });
  });

  afterEach(() => jest.restoreAllMocks());

  test('getLogEntries: Returns log entries retrieved from store service using TraceLog store key', async () => {
    const testLogEntries: TraceLogItem[] = [
      {
        level: LogLevel.Trace,
        message: 'TEST MESSAGE',
        timestamp: 0
      }
    ];
    jest.spyOn(StoreService.prototype, 'get').mockImplementation((key) => {
      if (key === StoreKey.TraceLog) {
        return Promise.resolve(testLogEntries);
      }
    });
    const logSvc = new LogService($injector, $log);

    const result = await logSvc.getLogEntries();

    expect(result).toStrictEqual(testLogEntries);
  });

  test('clear: Removes TraceLog store key from store service', async () => {
    const storeSvcRemoveSpy = jest.spyOn(StoreService.prototype, 'remove').mockResolvedValue();
    const logSvc = new LogService($injector, $log);

    await logSvc.clear();

    expect(storeSvcRemoveSpy).toBeCalledWith(StoreKey.TraceLog);
  });

  test('logError: Does not log an error that has already been logged', async () => {
    const logSvc = new LogService($injector, $log);
    const $logWarnSpy = jest.spyOn($log, 'warn');
    const testError: Partial<BaseError> = {
      logged: true
    };

    await logSvc.logError(testError as BaseError);

    expect($logWarnSpy).not.toBeCalled();
  });

  test('logError: Logs error to console', async () => {
    const logSvc = new LogService($injector, $log);
    jest.spyOn(StoreService.prototype, 'set').mockResolvedValue();
    const $logWarnSpy = jest.spyOn($log, 'warn');
    const testError: Partial<BaseError> = {
      name: 'TEST_ERROR'
    };

    await logSvc.logError(testError as BaseError);

    expect($logWarnSpy).toBeCalledWith(
      expect.objectContaining({
        name: 'TEST_ERROR'
      })
    );
  });

  test('logError: Logs message to console if no error supplied', async () => {
    const logSvc = new LogService($injector, $log);
    jest.spyOn(StoreService.prototype, 'set').mockResolvedValue();
    const $logWarnSpy = jest.spyOn($log, 'warn');
    const testError: Partial<BaseError> = {
      name: 'TEST_ERROR'
    };
    const testMessage = 'TEST_LOG_MESSAGE';

    await logSvc.logError(testError as BaseError, testMessage);

    expect($logWarnSpy).toBeCalledWith(
      'TEST_LOG_MESSAGE',
      expect.objectContaining({
        name: 'TEST_ERROR'
      })
    );
  });

  test('logError: Adds trace log entry to store service using TraceLog store key', async () => {
    const logSvc = new LogService($injector, $log);
    const storeSvcSetSpy = jest.spyOn(StoreService.prototype, 'set').mockResolvedValue();
    const testError: Partial<BaseError> = {};

    await logSvc.logError(testError as BaseError);

    expect(storeSvcSetSpy).toBeCalledTimes(1);
    expect(storeSvcSetSpy).toBeCalledWith(
      StoreKey.TraceLog,
      expect.objectContaining({
        level: LogLevel.Error,
        message: '',
        timestamp: expect.any(Number)
      })
    );
  });

  test('logError: Adds trace log entry containing stack trace message to store service', async () => {
    jest.spyOn(stackTrace, 'fromError').mockResolvedValue([{} as any]);
    const storeSvcSetSpy = jest.spyOn(StoreService.prototype, 'set').mockResolvedValue();
    const logSvc = new LogService($injector, $log);
    const testError: Partial<BaseError> = {
      stack: 'TEST_STACK_TRACE'
    };

    await logSvc.logError(testError as BaseError);

    expect(storeSvcSetSpy).toBeCalledWith(
      expect.any(String),
      expect.not.objectContaining({
        message: ''
      })
    );
  });

  test('logInfo: Does not log anything if no message is supplied', async () => {
    const logSvc = new LogService($injector, $log);
    const $logInfoSpy = jest.spyOn($log, 'info');
    const testMessage = undefined;

    await logSvc.logInfo(testMessage);

    expect($logInfoSpy).not.toBeCalled();
  });

  test('logInfo: Logs supplied message to console', async () => {
    const logSvc = new LogService($injector, $log);
    const $logInfoSpy = jest.spyOn($log, 'info');
    jest.spyOn(StoreService.prototype, 'set').mockResolvedValue();
    const testMessage = 'TEST_LOG_MESSAGE';

    await logSvc.logInfo(testMessage);

    expect($logInfoSpy).toBeCalledWith('TEST_LOG_MESSAGE');
  });

  test('logInfo: Adds trace log entry to store service using TraceLog store key', async () => {
    const logSvc = new LogService($injector, $log);
    const storeSvcSetSpy = jest.spyOn(StoreService.prototype, 'set').mockResolvedValue();
    const testMessage = 'TEST_LOG_MESSAGE';

    await logSvc.logInfo(testMessage);

    expect(storeSvcSetSpy).toBeCalledTimes(1);
    expect(storeSvcSetSpy).toBeCalledWith(
      StoreKey.TraceLog,
      expect.objectContaining({
        level: LogLevel.Trace,
        message: 'TEST_LOG_MESSAGE',
        timestamp: expect.any(Number)
      })
    );
  });

  test('logWarning: Does not log anything if no message is supplied', async () => {
    const logSvc = new LogService($injector, $log);
    const $logWarnSpy = jest.spyOn($log, 'warn');
    const testMessage = undefined;

    await logSvc.logWarning(testMessage);

    expect($logWarnSpy).not.toBeCalled();
  });

  test('logWarning: Logs supplied message to console', async () => {
    const logSvc = new LogService($injector, $log);
    const $logWarnSpy = jest.spyOn($log, 'warn');
    jest.spyOn(StoreService.prototype, 'set').mockResolvedValue();
    const testMessage = 'TEST_LOG_MESSAGE';

    await logSvc.logWarning(testMessage);

    expect($logWarnSpy).toBeCalledWith('TEST_LOG_MESSAGE');
  });

  test('logWarning: Adds trace log entry to store service using TraceLog store key', async () => {
    const logSvc = new LogService($injector, $log);
    const storeSvcSetSpy = jest.spyOn(StoreService.prototype, 'set').mockResolvedValue();
    const testMessage = 'TEST_LOG_MESSAGE';

    await logSvc.logWarning(testMessage);

    expect(storeSvcSetSpy).toBeCalledTimes(1);
    expect(storeSvcSetSpy).toBeCalledWith(
      StoreKey.TraceLog,
      expect.objectContaining({
        level: LogLevel.Warn,
        message: 'TEST_LOG_MESSAGE',
        timestamp: expect.any(Number)
      })
    );
  });
});
