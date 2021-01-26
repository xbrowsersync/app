import angular from 'angular';
import { Component, OnInit } from 'angular-ts-decorators';
import autobind from 'autobind-decorator';
import { AppViewType } from '../../app/app.enum';
import AppMainComponent from '../../app/app-main/app-main.component';
import { SyncType } from '../../shared/sync/sync.enum';
import { Sync } from '../../shared/sync/sync.interface';
import WebExtPlatformService from '../shared/webext-platform/webext-platform.service';

@autobind
@Component({
  controllerAs: 'vm',
  selector: 'app',
  styles: [require('./webext-app.component.scss')],
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

  waitForSyncsToFinish(): ng.IPromise<void> {
    const condition = (currentSync: Sync): ng.IPromise<boolean> => {
      return this.$q.resolve(!angular.isUndefined(currentSync ?? undefined));
    };

    const action = (): ng.IPromise<Sync> => {
      return this.$q((resolve, reject) => {
        this.$timeout(() => {
          this.appHelperSvc.getCurrentSync().then(resolve).catch(reject);
        }, 1e3);
      });
    };

    // Periodically check sync queue until it is empty
    return this.utilitySvc.asyncWhile<Sync>({} as any, condition, action).then(() => {});
  }

  workingCancelAction(): ng.IPromise<void> {
    this.logSvc.logInfo('Cancelling sync');
    return this.platformSvc
      .queueSync({
        type: SyncType.Cancel
      })
      .then(() => {
        this.syncEnabled = false;
      });
  }
}
