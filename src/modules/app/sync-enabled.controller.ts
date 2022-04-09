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
    // Check if the current sync has been removed before showing page content
    // Set a short timeout to avoid potential long delays when switching pages
    $q.race([syncService.checkSyncExists(), new $q((resolve) => $timeout(() => resolve(true), 150))])
      .then((syncExists) => {
        if (!syncExists) {
          $location.path(RoutePath.SyncRemoved);
          return;
        }
        this.showComponent = true;
      })
      .catch(() => {
        this.showComponent = true;
      });
  }
}
