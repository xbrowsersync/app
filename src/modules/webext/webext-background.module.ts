/* eslint-disable @typescript-eslint/explicit-function-return-type */

import angular from 'angular';
import { NgModule } from 'angular-ts-decorators';
import { browser } from 'webextension-polyfill-ts';
import BookmarkIdMapperService from './bookmark-id-mapper.service';
import GlobalSharedModule from '../shared/global-shared.module';
import WebExtBackgroundComponent from './webext-background.component';

@NgModule({
  declarations: [WebExtBackgroundComponent],
  id: 'WebExtBackgroundModule',
  imports: [GlobalSharedModule],
  providers: [BookmarkIdMapperService]
})
export default class WebExtBackgroundModule {}

(WebExtBackgroundModule as NgModule).module.config([
  '$compileProvider',
  '$httpProvider',
  ($compileProvider: ng.ICompileProvider, $httpProvider: ng.IHttpProvider) => {
    $compileProvider.debugInfoEnabled(false);
    $httpProvider.interceptors.push('ApiRequestInterceptorFactory');
  }
]);

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
