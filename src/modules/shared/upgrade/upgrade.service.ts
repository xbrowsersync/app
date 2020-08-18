import angular from 'angular';
import { Injectable } from 'angular-ts-decorators';
import autobind from 'autobind-decorator';
import compareVersions from 'compare-versions';
import { NotImplementedException } from '../exception/exception';
import { PlatformUpgradeService } from '../global-shared.interface';
import LogService from '../log/log.service';
import StoreService from '../store/store.service';

@autobind
@Injectable('UpgradeService')
export default class UpgradeService implements PlatformUpgradeService {
  $q: ng.IQService;
  logSvc: LogService;
  storeSvc: StoreService;

  constructor($q: ng.IQService, LogSvc: LogService, StoreSvc: StoreService) {
    this.$q = $q;
    this.logSvc = LogSvc;
    this.storeSvc = StoreSvc;
  }

  upgrade(oldVersion: string, newVersion: string): ng.IPromise<void> {
    if (angular.isUndefined(oldVersion) || angular.isUndefined(newVersion)) {
      this.logSvc.logInfo('Incomplete parameters, cancelling upgrade.');
      return;
    }

    // Clear trace log
    return this.logSvc
      .clear()
      .then(() => {
        this.logSvc.logInfo(`Upgrading from ${oldVersion} to ${newVersion}`);
      })
      .then(() => {
        if (compareVersions(oldVersion, newVersion)) {
          switch (true) {
            case newVersion.indexOf('1.6.0') === 0:
              return this.upgradeTo160();
            default:
          }
        }
      });
  }

  upgradeTo160(): ng.IPromise<void> {
    throw new NotImplementedException();
  }
}
