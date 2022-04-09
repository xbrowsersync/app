import { SyncService } from '../shared/sync/sync.service';
import { RoutePath } from './app.enum';

export class SyncEnabledController {
  showComponent = false;

  static $inject = ['$location', '$q', '$timeout', 'SyncService'];
  constructor(
    $location: ng.ILocationService,
    $q: ng.IQService,
    $timeout: ng.ITimeoutService,
    syncService: SyncService
  ) {
    $timeout(() => {
      this.showComponent = true;
    });

    // Check if the current sync has been removed before showing page content
    $q.race([syncService.checkSyncExists(), new $q((resolve) => $timeout(() => resolve(true), 1e3))])
      .then((syncExists) => {
        if (!syncExists) {
          $location.path(RoutePath.SyncRemoved);
        }
      })
      .catch(() => {});
  }
}
