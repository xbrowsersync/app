import '../../styles/styles.scss';
import NgAnimate from 'angular-animate';
import NgFilter from 'angular-filter';
import NgSanitize from 'angular-sanitize';
import { NgModule } from 'angular-ts-decorators';
import NgInfiniteScroll from 'ng-infinite-scroll';
import { ExceptionHandlerService } from '../shared/errors/exception-handler/exception-handler.service';
import { GlobalSharedModule } from '../shared/global-shared.module';
import { AppRoutesModule } from './app.routes';
import { AppBackgroundComponent } from './app-background/app-background.component';
import { AppHelpComponent } from './app-help/app-help.component';
import { AppLoginModule } from './app-login/app-login.module';
import { AppPermissionsComponent } from './app-permissions/app-permissions.component';
import { BookmarkComponent } from './app-search/bookmark/bookmark.component';
import { BookmarkTreeComponent } from './app-search/bookmark-tree/bookmark-tree.component';
import { AppSettingsModule } from './app-settings/app-settings.module';
import { AppSupportComponent } from './app-support/app-support.component';
import { AppSyncRemovedComponent } from './app-sync-removed/app-sync-removed.component';
import { AppTelemetryComponent } from './app-telemetry/app-telemetry.component';
import { AppUpdatedComponent } from './app-updated/app-updated.component';
import { IconComponent } from './shared/icon/icon.component';
import { IconButtonComponent } from './shared/icon-button/icon-button.component';

@NgModule({
  declarations: [
    AppBackgroundComponent,
    AppHelpComponent,
    AppPermissionsComponent,
    AppSupportComponent,
    AppSyncRemovedComponent,
    AppTelemetryComponent,
    AppUpdatedComponent,
    BookmarkComponent,
    BookmarkTreeComponent,
    IconComponent,
    IconButtonComponent
  ],
  id: 'AppModule',
  imports: [
    AppLoginModule,
    AppRoutesModule,
    AppSettingsModule,
    GlobalSharedModule,
    NgAnimate,
    NgFilter,
    NgInfiniteScroll,
    NgSanitize
  ]
})
export class AppModule {}

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
      $compileProvider.aHrefSanitizationTrustedUrlList(/^[\w-]+:.*$/);
      $httpProvider.interceptors.push('ApiRequestInterceptorFactory');
    }
  ])
  .factory('$exceptionHandler', ['$injector', 'AlertService', 'LogService', ExceptionHandlerService.Factory]);
