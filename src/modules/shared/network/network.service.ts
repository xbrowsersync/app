import { Injectable } from 'angular-ts-decorators';
import autobind from 'autobind-decorator';
import { NetworkConnectionError } from '../errors/errors';

@autobind
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
    return err instanceof NetworkConnectionError;
  }
}
