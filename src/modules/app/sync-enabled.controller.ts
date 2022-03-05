import { SyncService } from '../shared/sync/sync.service';
import { RoutePath } from './app.enum';

export class SyncEnabledController {
  showComponent = false;

  static $inject = ['$location', 'SyncService'];
  constructor($location: ng.ILocationService, syncService: SyncService) {
    syncService
      .checkSyncExists()
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
