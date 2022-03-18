import { Injectable } from 'angular-ts-decorators';
import { HttpRequestTimedOutError, NetworkConnectionError } from '../errors/errors';

@Injectable('NetworkService')
export class NetworkService {
  isNetworkConnected(): boolean {
    return (window as any).Connection &&
      (window.navigator as any).connection &&
      (window.navigator as any).connection.type
      ? (window.navigator as any).connection.type !== (window as any).Connection.NONE &&
          (window.navigator as any).connection.type !== (window as any).Connection.UNKNOWN
      : window.navigator.onLine;
  }

  isNetworkConnectionError(err: Error): boolean {
    return err instanceof HttpRequestTimedOutError || err instanceof NetworkConnectionError;
  }
}
