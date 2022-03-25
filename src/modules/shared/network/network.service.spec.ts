import { $q } from '../../../test/mock-services';
import {
  BaseError,
  HttpRequestAbortedError,
  HttpRequestFailedError,
  HttpRequestTimedOutError,
  NetworkConnectionError
} from '../errors/errors';
import { NetworkService } from './network.service';

describe('NetworkService', () => {
  beforeEach(() => {
    (window as any).Connection = {
      NONE: 'NONE',
      UNKNOWN: 'UNKNOWN'
    };
  });

  afterEach(() => jest.restoreAllMocks());

  test('checkNetworkConnection: Does not throw when isNetworkConnected returns true', async () => {
    const networkSvc = new NetworkService($q);
    jest.spyOn(networkSvc, 'isNetworkConnected').mockReturnValue(true);

    await expect(networkSvc.checkNetworkConnection()).resolves;
  });

  test('checkNetworkConnection: Throws NetworkConnectionError when isNetworkConnected returns false', async () => {
    const networkSvc = new NetworkService($q);
    jest.spyOn(networkSvc, 'isNetworkConnected').mockReturnValue(false);

    await expect(networkSvc.checkNetworkConnection()).rejects.toThrow(NetworkConnectionError);
  });

  test('getErrorFromHttpResponse: Returns HttpRequestFailedError by default', () => {
    const networkSvc = new NetworkService($q);
    const testResponse = {
      status: 'TEST_STATUS'
    } as unknown as ng.IHttpResponse<unknown>;

    const result = networkSvc.getErrorFromHttpResponse(testResponse);

    expect(result).toStrictEqual(new HttpRequestFailedError('status: TEST_STATUS'));
  });

  test('getErrorFromHttpResponse: Returns HttpRequestTimedOutError when response timed out', () => {
    const networkSvc = new NetworkService($q);
    const testResponse = {
      xhrStatus: 'timeout'
    } as unknown as ng.IHttpResponse<unknown>;

    const result = networkSvc.getErrorFromHttpResponse(testResponse);

    expect(result).toStrictEqual(new HttpRequestTimedOutError());
  });

  test('getErrorFromHttpResponse: Returns HttpRequestAbortedError when response was aborted', () => {
    const networkSvc = new NetworkService($q);
    const testResponse = {
      xhrStatus: 'abort'
    } as unknown as ng.IHttpResponse<unknown>;

    const result = networkSvc.getErrorFromHttpResponse(testResponse);

    expect(result).toStrictEqual(new HttpRequestAbortedError());
  });

  test('isNetworkConnected: Returns true when navigator.Online is true', () => {
    const networkSvc = new NetworkService($q);
    jest.spyOn(window.navigator, 'onLine', 'get').mockReturnValue(true);

    const result = networkSvc.isNetworkConnected();

    expect(result).toStrictEqual(true);
  });

  test('isNetworkConnected: Returns false when navigator.Online is false', async () => {
    const networkSvc = new NetworkService($q);
    jest.spyOn(window.navigator, 'onLine', 'get').mockReturnValue(false);

    const result = networkSvc.isNetworkConnected();

    expect(result).toStrictEqual(false);
  });

  test('isNetworkConnected: Returns true when connection type is WIFI', async () => {
    const networkSvc = new NetworkService($q);
    (window.navigator as any).connection = {
      type: 'WIFI'
    };

    const result = networkSvc.isNetworkConnected();

    expect(result).toStrictEqual(true);
  });

  test('isNetworkConnected: Returns false when connection type is NONE', async () => {
    const networkSvc = new NetworkService($q);
    (window.navigator as any).connection = {
      type: 'NONE'
    };

    const result = networkSvc.isNetworkConnected();

    expect(result).toStrictEqual(false);
  });

  test('isNetworkConnected: Returns false when connection type is UNKNOWN', async () => {
    const networkSvc = new NetworkService($q);
    (window.navigator as any).connection = {
      type: 'UNKNOWN'
    };

    const result = networkSvc.isNetworkConnected();

    expect(result).toStrictEqual(false);
  });

  test('isNetworkConnectionError: Returns true for NetworkConnectionError', () => {
    const networkSvc = new NetworkService($q);

    const result = networkSvc.isNetworkConnectionError(new NetworkConnectionError());

    expect(result).toBe(true);
  });

  test('isNetworkConnectionError: Returns false for BaseError', () => {
    const networkSvc = new NetworkService($q);

    const result = networkSvc.isNetworkConnectionError(new BaseError());

    expect(result).toBe(false);
  });
});
