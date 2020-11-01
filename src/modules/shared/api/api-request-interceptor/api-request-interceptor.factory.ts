import { IHttpInterceptor } from 'angular';
import { Injectable } from 'angular-ts-decorators';
import autobind from 'autobind-decorator';
import Globals from '../../global-shared.constants';

@autobind
@Injectable('ApiRequestInterceptorFactory')
export default class ApiRequestInterceptorFactory implements IHttpInterceptor {
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
    config.timeout = !config.timeout ? 10000 : config.timeout;

    return config ?? this.$q.when(config);
  }
}
