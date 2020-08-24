import angular from 'angular';
import { Injectable } from 'angular-ts-decorators';
import autobind from 'autobind-decorator';
import compareVersions from 'compare-versions';
import * as Exceptions from '../exception/exception';
import { PlatformUpgradeService } from '../global-shared.interface';
import LogService from '../log/log.service';
import { StoreKey } from '../store/store.enum';
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

  checkIfUpgradeRequired(currentVersion: string): ng.IPromise<boolean> {
    return this.getLastUpgradeVersion().then((lastUpgradeVersion) => {
      return (
        angular.isUndefined(lastUpgradeVersion) || compareVersions.compare(lastUpgradeVersion, currentVersion, '<')
      );
    });
  }

  getLastUpgradeVersion(): ng.IPromise<string> {
    return this.storeSvc.get<string>(StoreKey.LastUpgradeVersion);
  }

  setLastUpgradeVersion(version: string): ng.IPromise<void> {
    return this.storeSvc.set(StoreKey.LastUpgradeVersion, version);
  }

  upgrade(upgradeToVersion: string): ng.IPromise<void> {
    if (angular.isUndefined(upgradeToVersion)) {
      this.logSvc.logInfo('Incomplete parameters, cancelling upgrade.');
      return;
    }

    // Clear trace log
    return (
      this.logSvc
        .clear()
        .then(this.getLastUpgradeVersion)
        .then((lastUpgradeVersion) => {
          if (angular.isUndefined(lastUpgradeVersion) || compareVersions(lastUpgradeVersion, upgradeToVersion)) {
            switch (true) {
              case upgradeToVersion.indexOf('1.6.0') === 0:
                this.logSvc.logInfo(`Upgrading to ${upgradeToVersion}`);
                return this.upgradeTo160();
              default:
            }
          }
        })
        // Upgrade successful, update last upgrade version
        .then(() => this.setLastUpgradeVersion(upgradeToVersion))
        .catch((err) => {
          throw new Exceptions.UpgradeFailedException(`Failed upgrade to ${upgradeToVersion}`, err);
        })
    );
  }

  upgradeTo160(): ng.IPromise<void> {
    throw new Exceptions.NotImplementedException();
  }
}
