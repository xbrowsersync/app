import 'jest';
import { Exception, NetworkConnectionException } from '../exception/exception';
import { NetworkService } from './network.service';

describe('NetworkService', () => {
  beforeEach(() => {
    jest.restoreAllMocks();
  });

  it('isNetworkConnectionError: Returns true for isNetworkConnectionError', async () => {
    const networkSvc = new NetworkService();

    const isNetworkConnectionErrorResult = networkSvc.isNetworkConnectionError(new NetworkConnectionException());

    expect(isNetworkConnectionErrorResult).toBe(true);
  });

  it('isNetworkConnectionError: Returns false for base Exception', async () => {
    const networkSvc = new NetworkService();

    const isNetworkConnectionErrorResult = networkSvc.isNetworkConnectionError(new Exception());

    expect(isNetworkConnectionErrorResult).toBe(false);
  });
});
