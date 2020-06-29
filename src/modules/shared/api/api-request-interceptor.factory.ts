/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable @typescript-eslint/no-unused-vars */
/* eslint-disable no-param-reassign */
/* eslint-disable @typescript-eslint/explicit-function-return-type */

import { autobind } from 'core-decorators';
import { IHttpInterceptor, IHttpInterceptorFactory } from 'angular';
import { Injectable } from 'angular-ts-decorators';
import Globals from '../globals';

@autobind
@Injectable('ApiRequestInterceptorFactory')
export default class ApiRequestInterceptorFactory implements IHttpInterceptor {
  $q: ng.IQService;

  static $inject = ['$q'];
  constructor($q: ng.IQService) {
    this.$q = $q;
  }

  request(config: ng.IRequestConfig) {
    // Add the api version to the http Accept-Version header
    if (config.url !== Globals.ReleaseLatestUrl) {
      config.headers['Accept-Version'] = Globals.MinApiVersion;
    }

    // Set default request timeout
    config.timeout = !config.timeout ? 10000 : config.timeout;

    return config || this.$q.when(config);
  }
}
