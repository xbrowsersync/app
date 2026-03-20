import {
  ArgumentError,
  BaseError,
  BookmarkNotFoundError,
  FailedRestoreDataError,
  HttpRequestFailedError,
  InvalidCredentialsError,
  NetworkConnectionError,
  SyncFailedError
} from './errors';

describe('Errors', () => {
  afterEach(() => jest.restoreAllMocks());

  test('BaseError: Creates error with message', () => {
    const error = new BaseError('test message');

    expect(error.message).toBe('test message');
    expect(error.logged).toBe(false);
    expect(error).toBeInstanceOf(Error);
  });

  test('BaseError: Creates error with message from error param when no message provided', () => {
    const innerError = new Error('inner error message');
    const error = new BaseError(undefined, innerError);

    expect(error.message).toBe('inner error message');
  });

  test('BaseError: Uses error param stack trace when provided', () => {
    const innerError = new Error('inner');
    const error = new BaseError(undefined, innerError);

    expect(error.stack).toContain('BaseError');
  });

  test('BaseError: Stack trace includes error class name', () => {
    const error = new BaseError('test');

    expect(error.stack).toContain('BaseError');
  });

  test('BaseError: logged property defaults to false', () => {
    const error = new BaseError();

    expect(error.logged).toBe(false);
  });

  test('ArgumentError: Is instance of BaseError', () => {
    const error = new ArgumentError('bad argument');

    expect(error).toBeInstanceOf(BaseError);
    expect(error).toBeInstanceOf(Error);
    expect(error.message).toBe('bad argument');
  });

  test('BookmarkNotFoundError: Is instance of BaseError', () => {
    const error = new BookmarkNotFoundError();

    expect(error).toBeInstanceOf(BaseError);
  });

  test('HttpRequestFailedError: Stores message', () => {
    const error = new HttpRequestFailedError('status: 500');

    expect(error.message).toBe('status: 500');
    expect(error).toBeInstanceOf(BaseError);
  });

  test('InvalidCredentialsError: Can wrap inner error', () => {
    const innerError = new Error('decrypt failed');
    const error = new InvalidCredentialsError(undefined, innerError);

    expect(error).toBeInstanceOf(BaseError);
    expect(error.message).toBe('decrypt failed');
  });

  test('NetworkConnectionError: Is instance of BaseError', () => {
    const error = new NetworkConnectionError();

    expect(error).toBeInstanceOf(BaseError);
  });

  test('SyncFailedError: Is instance of BaseError', () => {
    const error = new SyncFailedError('sync failed');

    expect(error).toBeInstanceOf(BaseError);
    expect(error.message).toBe('sync failed');
  });

  test('FailedRestoreDataError: Stores message', () => {
    const error = new FailedRestoreDataError('bad data');

    expect(error.message).toBe('bad data');
  });

  test('Error classes have correct logged default', () => {
    const errors = [
      new ArgumentError(),
      new BookmarkNotFoundError(),
      new HttpRequestFailedError(),
      new InvalidCredentialsError(),
      new NetworkConnectionError(),
      new SyncFailedError(),
      new FailedRestoreDataError()
    ];

    errors.forEach((error) => {
      expect(error.logged).toBe(false);
    });
  });
});
