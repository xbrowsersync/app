/* eslint-disable @typescript-eslint/no-var-requires */
/* eslint-disable @typescript-eslint/explicit-function-return-type */

import NgAnimate from 'angular-animate';
import NgFilter from 'angular-filter';
import NgSanitize from 'angular-sanitize';
import { NgModule } from 'angular-ts-decorators';
import NgInfiniteScroll from 'ng-infinite-scroll';
import AppComponent from './app.component';
import BookmarkTreeComponent from './bookmark-tree.component';
import GlobalSharedModule from '../shared/global-shared.module';
import ZxcvbnDirective from './zxcvbn.directive';
import Globals from '../shared/globals';

@NgModule({
  declarations: [AppComponent, BookmarkTreeComponent, ZxcvbnDirective],
  id: 'AppModule',
  imports: [GlobalSharedModule, NgAnimate, NgFilter, NgInfiniteScroll, NgSanitize]
})
export default class AppModule {}

(AppModule as NgModule).module
  .config([
    '$animateProvider',
    '$compileProvider',
    '$httpProvider',
    (
      $animateProvider: ng.animate.IAnimateProvider,
      $compileProvider: ng.ICompileProvider,
      $httpProvider: ng.IHttpProvider
    ) => {
      $animateProvider.classNameFilter(/animate/);
      $compileProvider.debugInfoEnabled(false);
      $compileProvider.aHrefSanitizationWhitelist(/^[\w-]+:.*$/);
      $httpProvider.interceptors.push('ApiRequestInterceptorFactory');
    }
  ])
  .run([
    '$templateRequest',
    ($templateRequest: ng.ITemplateRequestService) => {
      $templateRequest(`${Globals.PathToAssets}/alert.html`, true);
      $templateRequest(`${Globals.PathToAssets}/bookmark.html`, true);
      $templateRequest(`${Globals.PathToAssets}/help.html`, true);
      $templateRequest(`${Globals.PathToAssets}/login.html`, true);
      $templateRequest(`${Globals.PathToAssets}/permissions.html`, true);
      $templateRequest(`${Globals.PathToAssets}/qr.html`, true);
      $templateRequest(`${Globals.PathToAssets}/scan.html`, true);
      $templateRequest(`${Globals.PathToAssets}/search.html`, true);
      $templateRequest(`${Globals.PathToAssets}/settings.html`, true);
      $templateRequest(`${Globals.PathToAssets}/support.html`, true);
      $templateRequest(`${Globals.PathToAssets}/updated.html`, true);
      $templateRequest(`${Globals.PathToAssets}/working.html`, true);
    }
  ]);
