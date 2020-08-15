import './webext-app.component.scss';
import angular from 'angular';
import { Component, OnInit } from 'angular-ts-decorators';
import autobind from 'autobind-decorator';
import AppMainComponent from '../../app/app-main/app-main.component';
import { AppViewType } from '../../app/app.enum';
import { SyncType } from '../../shared/sync/sync.enum';
import { Sync } from '../../shared/sync/sync.interface';
import WebExtPlatformService from '../webext-platform/webext-platform.service';

@autobind
@Component({
  controllerAs: 'vm',
  selector: 'app',
  template: require('../../app/app-main/app-main.component.html')
})
export default class WebExtAppComponent extends AppMainComponent implements OnInit {
  platformSvc: WebExtPlatformService;

  static $inject = [
    '$q',
    '$scope',
    '$timeout',
    'AlertService',
    'AppHelperService',
    'BookmarkHelperService',
    'LogService',
    'NetworkService',
    'PlatformService',
    'SettingsService',
    'StoreService',
    'UtilityService',
    'WorkingService'
  ];

  copyTextToClipboard(text: string): ng.IPromise<void> {
    return navigator.clipboard.writeText(text);
  }

  ngOnInit(): ng.IPromise<void> {
    // Check if a sync is currently in progress
    return this.appHelperSvc
      .getCurrentSync()
      .then((currentSync) => {
        if (currentSync) {
          this.logSvc.logInfo('Waiting for syncs to finish...');

          // Display working panel
          this.initialised = true;
          this.changeView(AppViewType.Working);
          return this.waitForSyncsToFinish().then(() => {
            // Check that user didn't cancel sync
            return this.utilitySvc.isSyncEnabled().then((syncEnabled) => {
              if (syncEnabled) {
                this.logSvc.logInfo('Syncs finished, resuming');
                return this.appHelperSvc.syncBookmarksSuccess();
              }
            });
          });
        }
      })
      .then(() => super.ngOnInit());
  }

  waitForSyncsToFinish() {
    const doActionUntil = (currentData: [Sync, number]) => {
      const currentSync = currentData[0];
      const syncQueueLength = currentData[1];
      return this.$q.resolve(angular.isUndefined(currentSync ?? undefined) && syncQueueLength === 0);
    };

    const action = () => {
      return this.$q((resolve, reject) => {
        this.$timeout(() => {
          this.$q
            .all([this.appHelperSvc.getCurrentSync(), this.appHelperSvc.getSyncQueueLength()])
            .then(resolve)
            .catch(reject);
        }, 1e3);
      });
    };

    // Periodically check sync queue until it is empty
    return this.utilitySvc.promiseWhile([], doActionUntil, action);
  }

  workingCancelAction(): ng.IPromise<void> {
    this.logSvc.logInfo('Cancelling sync');
    return this.appHelperSvc
      .queueSync({
        type: SyncType.Cancel
      })
      .then(() => {
        this.syncEnabled = false;
      });
  }
}
