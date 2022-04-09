import NgRoute from 'angular-route';
import { NgModule } from 'angular-ts-decorators';
import { AppController } from './app.controller';
import { RoutePath } from './app.enum';
import { SyncEnabledController } from './sync-enabled.controller';

@NgModule({
  id: 'AppRoutesModule',
  imports: [NgRoute]
})
export class AppRoutesModule {}

(AppRoutesModule as NgModule).module
  .controller('AppController', AppController)
  .controller('SyncEnabledController', SyncEnabledController)
  .config([
    '$routeProvider',
    ($routeProvider: ng.route.IRouteProvider) => {
      $routeProvider
        .when(`${RoutePath.Bookmark}/:id`, {
          controller: 'SyncEnabledController',
          controllerAs: 'vm',
          template: require('./app-bookmark/app-bookmark.controller.html')
        })
        .when(`${RoutePath.Bookmark}`, {
          controller: 'SyncEnabledController',
          controllerAs: 'vm',
          template: require('./app-bookmark/app-bookmark.controller.html')
        })
        .when(`${RoutePath.Help}/:id`, {
          controller: 'AppController',
          controllerAs: 'vm',
          template: require('./app-help/app-help.controller.html')
        })
        .when(`${RoutePath.Help}`, {
          redirectTo: `${RoutePath.Help}/1`
        })
        .when(`${RoutePath.Login}`, {
          controller: 'AppController',
          controllerAs: 'vm',
          template: require('./app-login/app-login.controller.html')
        })
        .when(`${RoutePath.Permissions}`, {
          controller: 'AppController',
          controllerAs: 'vm',
          template: require('./app-permissions/app-permissions.controller.html')
        })
        .when(`${RoutePath.Scan}`, {
          controller: 'AppController',
          controllerAs: 'vm',
          template: require('../android/android-app/android-app-scan/android-app-scan.controller.html')
        })
        .when(`${RoutePath.Search}`, {
          controller: 'SyncEnabledController',
          controllerAs: 'vm',
          template: require('./app-search/app-search.controller.html')
        })
        .when(`${RoutePath.Settings}`, {
          controller: 'SyncEnabledController',
          controllerAs: 'vm',
          template: require('./app-settings/app-settings.controller.html')
        })
        .when(`${RoutePath.Support}`, {
          controller: 'AppController',
          controllerAs: 'vm',
          template: require('./app-support/app-support.controller.html')
        })
        .when(`${RoutePath.SyncRemoved}`, {
          controller: 'AppController',
          controllerAs: 'vm',
          template: require('./app-sync-removed/app-sync-removed.controller.html')
        })
        .when(`${RoutePath.TelemetryCheck}`, {
          controller: 'AppController',
          controllerAs: 'vm',
          template: require('./app-telemetry/app-telemetry.controller.html')
        })
        .when(`${RoutePath.Updated}`, {
          controller: 'AppController',
          controllerAs: 'vm',
          template: require('./app-updated/app-updated.controller.html')
        })
        .otherwise({
          redirectTo: '/'
        });
    }
  ]);
