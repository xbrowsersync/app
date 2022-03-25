import { Injectable } from 'angular-ts-decorators';
import {
  BaseError,
  HttpRequestAbortedError,
  HttpRequestFailedError,
  HttpRequestTimedOutError,
  NetworkConnectionError
} from '../errors/errors';

@Injectable('NetworkService')
export class NetworkService {
  private $q: ng.IQService;

  static $inject = ['$q'];
  constructor($q: ng.IQService) {
    this.$q = $q;
  }

  checkNetworkConnection(): ng.IPromise<void> {
    return this.$q((resolve, reject) => {
      if (this.isNetworkConnected()) {
        return resolve();
      }
      reject(new NetworkConnectionError());
    });
  }

  getErrorFromHttpResponse(response: ng.IHttpResponse<unknown>): BaseError {
    let error: BaseError;
    switch (true) {
      // Request timed out
      case response.xhrStatus === 'timeout':
        error = new HttpRequestTimedOutError();
        break;
      // Request timed out
      case response.xhrStatus === 'abort':
        error = new HttpRequestAbortedError();
        break;
      // Otherwise generic request failed
      default:
        error = new HttpRequestFailedError(`status: ${response.status}`);
    }
    return error;
  }

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
