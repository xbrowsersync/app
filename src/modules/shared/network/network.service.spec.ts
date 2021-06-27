import 'jest';
import { Exception, HttpRequestFailedException, NetworkOfflineException } from '../exception/exception';
import { NetworkService } from './network.service';

describe('NetworkService', () => {
  beforeEach(() => {
    jest.restoreAllMocks();
  });

  it('isNetworkConnectionError: Returns true for HttpRequestFailedException', async () => {
    const networkSvc = new NetworkService();

    const isNetworkConnectionErrorResult = networkSvc.isNetworkConnectionError(new HttpRequestFailedException());

    expect(isNetworkConnectionErrorResult).toBe(true);
  });

  it('isNetworkConnectionError: Returns true for NetworkOfflineException', async () => {
    const networkSvc = new NetworkService();

    const isNetworkConnectionErrorResult = networkSvc.isNetworkConnectionError(new NetworkOfflineException());

    expect(isNetworkConnectionErrorResult).toBe(true);
  });

  it('isNetworkConnectionError: Returns false for base Exception', async () => {
    const networkSvc = new NetworkService();

    const isNetworkConnectionErrorResult = networkSvc.isNetworkConnectionError(new Exception());

    expect(isNetworkConnectionErrorResult).toBe(false);
  });
});
