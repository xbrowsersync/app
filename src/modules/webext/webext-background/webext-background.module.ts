import angular from 'angular';
import { NgModule } from 'angular-ts-decorators';
import { browser } from 'webextension-polyfill-ts';
import ExceptionHandlerService from '../../shared/exception/exception-handler/exception-handler.service';
import GlobalSharedModule from '../../shared/global-shared.module';
import WebExtSharedModule from '../shared/webext-shared.module';
import WebExtBackgroundComponent from './webext-background.component';
import WebExtBackgroundService from './webext-background.service';

@NgModule({
  declarations: [WebExtBackgroundComponent],
  id: 'WebExtBackgroundModule',
  imports: [GlobalSharedModule, WebExtSharedModule],
  providers: [WebExtBackgroundService]
})
export default class WebExtBackgroundModule {}

(WebExtBackgroundModule as NgModule).module
  .config([
    '$compileProvider',
    '$httpProvider',
    ($compileProvider: ng.ICompileProvider, $httpProvider: ng.IHttpProvider) => {
      $compileProvider.debugInfoEnabled(false);
      $httpProvider.interceptors.push('ApiRequestInterceptorFactory');
    }
  ])
  .factory('$exceptionHandler', ['$injector', 'AlertService', 'LogService', ExceptionHandlerService.Factory]);

// Set synchronous event handlers
browser.runtime.onInstalled.addListener((details) => {
  // Store event details as element data
  const element = document.querySelector('#install');
  angular.element(element).data('details', details);
  (document.querySelector('#install') as HTMLButtonElement).click();
});
browser.runtime.onStartup.addListener(() => {
  (document.querySelector('#startup') as HTMLButtonElement).click();
});
