import { BaseError, NetworkConnectionError } from '../errors/errors';
import { NetworkService } from './network.service';

describe('NetworkService', () => {
  beforeEach(() => {
    jest.restoreAllMocks();
  });

  it('isNetworkConnectionError: Returns true for isNetworkConnectionError', async () => {
    const networkSvc = new NetworkService();

    const isNetworkConnectionErrorResult = networkSvc.isNetworkConnectionError(new NetworkConnectionError());

    expect(isNetworkConnectionErrorResult).toBe(true);
  });

  it('isNetworkConnectionError: Returns false for base Error', async () => {
    const networkSvc = new NetworkService();

    const isNetworkConnectionErrorResult = networkSvc.isNetworkConnectionError(new BaseError());

    expect(isNetworkConnectionErrorResult).toBe(false);
  });
});
