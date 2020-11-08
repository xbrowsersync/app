import angular from 'angular';
import { NgModule } from 'angular-ts-decorators';
import { browser } from 'webextension-polyfill-ts';
import WebExtBackgroundModule from '../../webext-background/webext-background.module';
import FirefoxBookmarkService from '../shared/firefox-bookmark/firefox-bookmark.service';
import FirefoxPlatformService from '../shared/firefox-platform/firefox-platform.service';

@NgModule({
  id: 'FirefoxBackgroundModule',
  imports: [WebExtBackgroundModule],
  providers: [FirefoxBookmarkService, FirefoxPlatformService]
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
