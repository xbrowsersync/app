/* eslint-disable @typescript-eslint/explicit-function-return-type */

import angular from 'angular';
import { NgModule } from 'angular-ts-decorators';
import { browser } from 'webextension-polyfill-ts';
import WebExtBackgroundModule from '../webext/webext-background/webext-background.module';
import FirefoxNativeBookmarksService from './firefox-native-bookmarks.service';
import FirefoxPlatformService from './firefox-platform.service';

@NgModule({
  id: 'FirefoxBackgroundModule',
  imports: [WebExtBackgroundModule],
  providers: [FirefoxNativeBookmarksService, FirefoxPlatformService]
})
export default class FirefoxBackgroundModule {}

(FirefoxBackgroundModule as NgModule).module.config([
  '$compileProvider',
  '$httpProvider',
  ($compileProvider: ng.ICompileProvider, $httpProvider: ng.IHttpProvider) => {
    $compileProvider.debugInfoEnabled(false);
    $httpProvider.interceptors.push('ApiRequestInterceptorFactory');
  }
]);

angular.element(document).ready(() => {
  angular.bootstrap(document, [(FirefoxBackgroundModule as NgModule).module.name]);
});

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
