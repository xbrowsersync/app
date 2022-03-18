import { IHttpInterceptor } from 'angular';
import { Injectable } from 'angular-ts-decorators';
import Globals from '../../global-shared.constants';

@Injectable('ApiRequestInterceptorFactory')
export class ApiRequestInterceptorFactory implements IHttpInterceptor {
  $q: ng.IQService;

  static $inject = ['$q'];
  constructor($q: ng.IQService) {
    this.$q = $q;
  }

  request(config: ng.IRequestConfig): ng.IRequestConfig | ng.IPromise<ng.IRequestConfig> {
    // Add the api version to the http Accept-Version header
    if (config.url !== Globals.ReleaseLatestUrl) {
      config.headers!['Accept-Version'] = Globals.MinApiVersion;
    }

    // Set default request timeout
    config.timeout = !config.timeout ? 12000 : config.timeout;

    return config ?? this.$q.when(config);
  }
}
