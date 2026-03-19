import '../../../../test/mock-angular';
import { $q } from '../../../../test/mock-services';
import {
  DailyNewSyncLimitReachedError,
  DataOutOfSyncError,
  InvalidServiceError,
  NetworkConnectionError,
  NotAcceptingNewSyncsError,
  RequestEntityTooLargeError,
  ServiceOfflineError,
  SyncNotFoundError,
  TooManyRequestsError
} from '../../errors/errors';
import { ApiXbrowsersyncService } from './api-xbrowsersync.service';

describe('ApiXbrowsersyncService', () => {
  let apiSvc: ApiXbrowsersyncService;
  const mock$injector = {
    get: jest.fn(),
    annotate: jest.fn(),
    has: jest.fn(),
    instantiate: jest.fn(),
    invoke: jest.fn(),
    loadNewModules: jest.fn(),
    modules: {},
    strictDi: false
  } as any;
  const mock$httpFn = jest.fn();
  const mock$http = Object.assign(mock$httpFn, {
    get: jest.fn(),
    post: jest.fn(),
    put: jest.fn()
  }) as any;
  const mockNetworkSvc = { isNetworkConnected: jest.fn(), getErrorFromHttpResponse: jest.fn() } as any;
  const mockStoreSvc = { get: jest.fn(), set: jest.fn() } as any;
  const mockUtilitySvc = {
    checkSyncCredentialsExist: jest.fn(),
    compareVersions: jest.fn()
  } as any;

  beforeEach(() => {
    apiSvc = new ApiXbrowsersyncService(mock$injector, mock$http, $q, mockNetworkSvc, mockStoreSvc, mockUtilitySvc);
  });

  afterEach(() => jest.restoreAllMocks());

  test('apiRequestSucceeded: Returns resolved promise with response', async () => {
    const testResponse = { data: 'test' };

    const result = await apiSvc.apiRequestSucceeded(testResponse);

    expect(result).toStrictEqual(testResponse);
  });

  test('checkNetworkConnection: Resolves when network is connected', async () => {
    mockNetworkSvc.isNetworkConnected.mockReturnValue(true);

    await expect(apiSvc.checkNetworkConnection()).resolves.toBeUndefined();
  });

  test('checkNetworkConnection: Rejects with NetworkConnectionError when not connected', async () => {
    mockNetworkSvc.isNetworkConnected.mockReturnValue(false);

    await expect(apiSvc.checkNetworkConnection()).rejects.toThrow(NetworkConnectionError);
  });

  test('getServiceUrl: Returns service URL from store', async () => {
    mockStoreSvc.get.mockResolvedValue({ serviceUrl: 'https://api.example.com' });

    const result = await apiSvc.getServiceUrl();

    expect(result).toBe('https://api.example.com');
  });

  // getErrorFromHttpResponse tests
  test('getErrorFromHttpResponse: Returns SyncNotFoundError for 401', () => {
    const response = { status: 401, data: { message: 'Not found' } } as any;

    const result = apiSvc.getErrorFromHttpResponse(response);

    expect(result).toBeInstanceOf(SyncNotFoundError);
  });

  test('getErrorFromHttpResponse: Returns InvalidServiceError for 404', () => {
    const response = { status: 404, data: {} } as any;

    const result = apiSvc.getErrorFromHttpResponse(response);

    expect(result).toBeInstanceOf(InvalidServiceError);
  });

  test('getErrorFromHttpResponse: Returns NotAcceptingNewSyncsError for 405', () => {
    const response = { status: 405, data: {} } as any;

    const result = apiSvc.getErrorFromHttpResponse(response);

    expect(result).toBeInstanceOf(NotAcceptingNewSyncsError);
  });

  test('getErrorFromHttpResponse: Returns DailyNewSyncLimitReachedError for 406', () => {
    const response = { status: 406, data: {} } as any;

    const result = apiSvc.getErrorFromHttpResponse(response);

    expect(result).toBeInstanceOf(DailyNewSyncLimitReachedError);
  });

  test('getErrorFromHttpResponse: Returns DataOutOfSyncError for 409', () => {
    const response = { status: 409, data: {} } as any;

    const result = apiSvc.getErrorFromHttpResponse(response);

    expect(result).toBeInstanceOf(DataOutOfSyncError);
  });

  test('getErrorFromHttpResponse: Returns RequestEntityTooLargeError for 413', () => {
    const response = { status: 413, data: {} } as any;

    const result = apiSvc.getErrorFromHttpResponse(response);

    expect(result).toBeInstanceOf(RequestEntityTooLargeError);
  });

  test('getErrorFromHttpResponse: Returns TooManyRequestsError for 429', () => {
    const response = { status: 429, data: {} } as any;

    const result = apiSvc.getErrorFromHttpResponse(response);

    expect(result).toBeInstanceOf(TooManyRequestsError);
  });

  test('getErrorFromHttpResponse: Returns ServiceOfflineError for 500+', () => {
    const response = { status: 500, data: {} } as any;

    const result = apiSvc.getErrorFromHttpResponse(response);

    expect(result).toBeInstanceOf(ServiceOfflineError);
  });

  test('getErrorFromHttpResponse: Returns ServiceOfflineError for 503', () => {
    const response = { status: 503, data: {} } as any;

    const result = apiSvc.getErrorFromHttpResponse(response);

    expect(result).toBeInstanceOf(ServiceOfflineError);
  });

  test('getErrorFromHttpResponse: Delegates to networkSvc for other status codes', () => {
    const response = { status: 400, data: {} } as any;
    const mockError = new Error('network error');
    mockNetworkSvc.getErrorFromHttpResponse.mockReturnValue(mockError);

    const result = apiSvc.getErrorFromHttpResponse(response);

    expect(result).toBe(mockError);
  });

  test('handleFailedRequest: Throws error from getErrorFromHttpResponse', () => {
    const response = { status: 401, data: { message: 'Unauthorized' } } as any;

    expect(() => apiSvc.handleFailedRequest(response)).toThrow(SyncNotFoundError);
  });

  test('checkServiceStatus: Rejects when not connected', async () => {
    mockNetworkSvc.isNetworkConnected.mockReturnValue(false);

    await expect(apiSvc.checkServiceStatus('https://api.example.com')).rejects.toThrow(NetworkConnectionError);
  });

  test('checkServiceStatus: Validates service response', async () => {
    mockNetworkSvc.isNetworkConnected.mockReturnValue(true);
    mockUtilitySvc.compareVersions.mockReturnValue(false);
    mock$httpFn.mockResolvedValue({
      data: { status: 1, version: '1.1.13' }
    });

    const result = await apiSvc.checkServiceStatus('https://api.example.com');

    expect(result.status).toBe(1);
    expect(result.version).toBe('1.1.13');
  });

  test('checkServiceStatus: Throws InvalidServiceError for invalid response', async () => {
    mockNetworkSvc.isNetworkConnected.mockReturnValue(true);
    mock$httpFn.mockResolvedValue({
      data: {}
    });

    await expect(apiSvc.checkServiceStatus('https://api.example.com')).rejects.toThrow(InvalidServiceError);
  });

  test('checkServiceStatus: Throws UnsupportedApiVersionError for old API version', async () => {
    mockNetworkSvc.isNetworkConnected.mockReturnValue(true);
    mockUtilitySvc.compareVersions.mockReturnValue(true);
    mock$httpFn.mockResolvedValue({
      data: { status: 1, version: '1.0.0' }
    });

    const { UnsupportedApiVersionError } = require('../../errors/errors');
    await expect(apiSvc.checkServiceStatus('https://api.example.com')).rejects.toThrow(UnsupportedApiVersionError);
  });

  test('formatServiceInfo: Returns undefined for no input', () => {
    const result = apiSvc.formatServiceInfo(undefined);

    expect(result).toBeUndefined();
  });

  test('formatServiceInfo: Converts maxSyncSize from bytes to KB', () => {
    const result = apiSvc.formatServiceInfo({
      status: 1,
      version: '1.1.13',
      maxSyncSize: 524288
    } as any);

    expect(result.maxSyncSize).toBe(512);
  });
});
