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
    jest.restoreAllMocks();
    (window as any).Connection = {
      NONE: 'NONE',
      UNKNOWN: 'UNKNOWN'
    };
  });

  it('checkNetworkConnection: Does not throw when isNetworkConnected returns true', async () => {
    const networkSvc = new NetworkService($q);
    jest.spyOn(networkSvc, 'isNetworkConnected').mockReturnValue(true);

    await expect(networkSvc.checkNetworkConnection()).resolves;
  });

  it('checkNetworkConnection: Throws NetworkConnectionError when isNetworkConnected returns false', async () => {
    const networkSvc = new NetworkService($q);
    jest.spyOn(networkSvc, 'isNetworkConnected').mockReturnValue(false);

    await expect(networkSvc.checkNetworkConnection()).rejects.toThrow(NetworkConnectionError);
  });

  it('getErrorFromHttpResponse: Returns HttpRequestFailedError by default', () => {
    const networkSvc = new NetworkService($q);
    const testResponse = {
      status: 'TEST_STATUS'
    } as unknown as ng.IHttpResponse<unknown>;

    const result = networkSvc.getErrorFromHttpResponse(testResponse);

    expect(result).toStrictEqual(new HttpRequestFailedError('status: TEST_STATUS'));
  });

  it('getErrorFromHttpResponse: Returns HttpRequestTimedOutError when response timed out', () => {
    const networkSvc = new NetworkService($q);
    const testResponse = {
      xhrStatus: 'timeout'
    } as unknown as ng.IHttpResponse<unknown>;

    const result = networkSvc.getErrorFromHttpResponse(testResponse);

    expect(result).toStrictEqual(new HttpRequestTimedOutError());
  });

  it('getErrorFromHttpResponse: Returns HttpRequestAbortedError when response was aborted', () => {
    const networkSvc = new NetworkService($q);
    const testResponse = {
      xhrStatus: 'abort'
    } as unknown as ng.IHttpResponse<unknown>;

    const result = networkSvc.getErrorFromHttpResponse(testResponse);

    expect(result).toStrictEqual(new HttpRequestAbortedError());
  });

  it('isNetworkConnected: Returns true when navigator.Online is true', () => {
    const networkSvc = new NetworkService($q);
    jest.spyOn(window.navigator, 'onLine', 'get').mockReturnValue(true);

    const result = networkSvc.isNetworkConnected();

    expect(result).toStrictEqual(true);
  });

  it('isNetworkConnected: Returns false when navigator.Online is false', async () => {
    const networkSvc = new NetworkService($q);
    jest.spyOn(window.navigator, 'onLine', 'get').mockReturnValue(false);

    const result = networkSvc.isNetworkConnected();

    expect(result).toStrictEqual(false);
  });

  it('isNetworkConnected: Returns true when connection type is WIFI', async () => {
    const networkSvc = new NetworkService($q);
    (window.navigator as any).connection = {
      type: 'WIFI'
    };

    const result = networkSvc.isNetworkConnected();

    expect(result).toStrictEqual(true);
  });

  it('isNetworkConnected: Returns false when connection type is NONE', async () => {
    const networkSvc = new NetworkService($q);
    (window.navigator as any).connection = {
      type: 'NONE'
    };

    const result = networkSvc.isNetworkConnected();

    expect(result).toStrictEqual(false);
  });

  it('isNetworkConnected: Returns false when connection type is UNKNOWN', async () => {
    const networkSvc = new NetworkService($q);
    (window.navigator as any).connection = {
      type: 'UNKNOWN'
    };

    const result = networkSvc.isNetworkConnected();

    expect(result).toStrictEqual(false);
  });

  it('isNetworkConnectionError: Returns true for NetworkConnectionError', () => {
    const networkSvc = new NetworkService($q);

    const result = networkSvc.isNetworkConnectionError(new NetworkConnectionError());

    expect(result).toBe(true);
  });

  it('isNetworkConnectionError: Returns false for BaseError', () => {
    const networkSvc = new NetworkService($q);

    const result = networkSvc.isNetworkConnectionError(new BaseError());

    expect(result).toBe(false);
  });
});
