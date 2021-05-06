import angular from 'angular';
import { Injectable } from 'angular-ts-decorators';
import autobind from 'autobind-decorator';
import compareVersions from 'compare-versions';
import { Bookmark } from '../bookmark/bookmark.interface';
import * as Exceptions from '../exception/exception';
import { PlatformService } from '../global-shared.interface';
import LogService from '../log/log.service';
import { StoreKey } from '../store/store.enum';
import StoreService from '../store/store.service';
import UtilityService from '../utility/utility.service';
import UpgradeProvider from './upgrade.interface';
import V160UpgradeProviderService from './v1.6.0-upgrade-provider/v1.6.0-upgrade-provider.service';

@autobind
@Injectable('UpgradeService')
export default class UpgradeService {
  $q: ng.IQService;
  logSvc: LogService;
  platformSvc: PlatformService;
  storeSvc: StoreService;
  utilitySvc: UtilityService;
  v160UpgradeProviderSvc: V160UpgradeProviderService;

  upgradeMap: Map<string, UpgradeProvider>;

  static $inject = [
    '$q',
    'LogService',
    'PlatformService',
    'StoreService',
    'UtilityService',
    'V160UpgradeProviderService'
  ];
  constructor(
    $q: ng.IQService,
    LogSvc: LogService,
    PlatformSvc: PlatformService,
    StoreSvc: StoreService,
    UtilitySvc: UtilityService,
    V1_6_0_UpgradeProviderSvc: V160UpgradeProviderService
  ) {
    this.$q = $q;
    this.logSvc = LogSvc;
    this.platformSvc = PlatformSvc;
    this.storeSvc = StoreSvc;
    this.utilitySvc = UtilitySvc;
    this.v160UpgradeProviderSvc = V1_6_0_UpgradeProviderSvc;

    // Configure upgrade map with available upgrade steps
    this.upgradeMap = new Map<string, UpgradeProvider>();
    this.upgradeMap.set('1.6.0', this.v160UpgradeProviderSvc);
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

  upgrade(targetVersion: string): ng.IPromise<void> {
    if (angular.isUndefined(targetVersion)) {
      throw new Exceptions.UpgradeFailedException('Failed upgrade, target version not provided');
    }

    return this.getLastUpgradeVersion()
      .then((lastUpgradeVersion = '1.0.0') => {
        const condition = (currentVersion): ng.IPromise<boolean> => {
          // Exit when current version is no longer less than target version
          return this.$q.resolve(compareVersions.compare(currentVersion, targetVersion, '<'));
        };

        const action = (currentVersion): ng.IPromise<string> => {
          // Get the next sequential upgrade step from upgrade map
          const upgradeStep = [...this.upgradeMap].find(({ 0: x }) => compareVersions.compare(currentVersion, x, '<'));
          const upgradeVersion = upgradeStep && upgradeStep[0];
          const upgradeProvider = upgradeStep && upgradeStep[1];

          // If upgrade found, run app upgrade process
          return (upgradeVersion
            ? upgradeProvider.upgradeApp(lastUpgradeVersion).then(() => upgradeVersion)
            : this.$q.resolve(targetVersion)
          ).then((newVersion) => {
            return this.setLastUpgradeVersion(newVersion)
              .then(() => this.logSvc.logInfo(`Upgraded to ${newVersion}`))
              .then(() => newVersion);
          });
        };

        // Run each sequential upgrade from last upgrade version to target
        return this.utilitySvc.asyncWhile<string>(lastUpgradeVersion, condition, action);
      })
      .then(() => this.platformSvc.disableSync())
      .catch((err) => {
        throw new Exceptions.UpgradeFailedException(`Failed upgrade to ${targetVersion}`, err);
      });
  }

  upgradeBookmarks(
    bookmarks: Bookmark[] = [],
    syncVersion: string = '1.0.0',
    targetVersion: string
  ): ng.IPromise<Bookmark[]> {
    if (bookmarks.length === 0) {
      return this.$q.resolve(bookmarks);
    }

    if (angular.isUndefined(targetVersion)) {
      throw new Exceptions.UpgradeFailedException('Failed upgrade bookmarks, target version not provided');
    }

    if (compareVersions.compare(syncVersion, targetVersion, '>')) {
      // Sync version is greater than target version, throw error
      throw new Exceptions.SyncVersionNotSupportedException();
    }

    let upgradedBookmarks = angular.copy(bookmarks);

    const condition = (currentVersion): ng.IPromise<boolean> => {
      // Exit when current version is no longer less than target version
      return this.$q.resolve(compareVersions.compare(currentVersion, targetVersion, '<'));
    };

    const action = (currentVersion): ng.IPromise<string> => {
      // Get the next sequential upgrade step from upgrade map
      const upgradeStep = [...this.upgradeMap].find(({ 0: x }) => compareVersions.compare(currentVersion, x, '<'));
      const upgradeVersion = upgradeStep?.[0];
      const upgradeProvider = upgradeStep?.[1];

      // Run provider upgrade process if exists
      return (upgradeVersion
        ? upgradeProvider.upgradeBookmarks(upgradedBookmarks, currentVersion)
        : this.$q.resolve(upgradedBookmarks)
      ).then((bookmarksUpgradeResult) => {
        upgradedBookmarks = bookmarksUpgradeResult;
        return upgradeVersion ?? targetVersion;
      });
    };

    // Run each sequential upgrade from bookmarks sync version to target
    return this.utilitySvc.asyncWhile<string>(syncVersion, condition, action).then(() => upgradedBookmarks);
  }
}
