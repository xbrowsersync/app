import angular from 'angular';
import autobind from 'autobind-decorator';
import compareVersions from 'compare-versions';
import * as Exceptions from '../exception/exception';
import LogService from '../log/log.service';
import { StoreKey } from '../store/store.enum';
import StoreService from '../store/store.service';
import UtilityService from '../utility/utility.service';

@autobind
export default abstract class UpgradeService {
  $q: ng.IQService;
  logSvc: LogService;
  storeSvc: StoreService;
  utilitySvc: UtilityService;

  upgradeMap: Map<string, () => ng.IPromise<void>>;

  constructor($q: ng.IQService, LogSvc: LogService, StoreSvc: StoreService, UtilitySvc: UtilityService) {
    this.$q = $q;
    this.logSvc = LogSvc;
    this.storeSvc = StoreSvc;
    this.utilitySvc = UtilitySvc;

    // Configure upgrade map with available upgrade steps
    this.upgradeMap = new Map<string, () => ng.IPromise<void>>();
    this.upgradeMap.set('1.6.0', this.upgradeTo160);
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
      this.logSvc.logInfo('Incomplete parameters, cancelling upgrade.');
      return this.$q.resolve();
    }

    // Run each sequential upgrade from last upgrade version to current
    return this.getLastUpgradeVersion()
      .then((lastUpgradeVersion) => {
        const condition = (currentVersion = '1.0.0') => {
          // Exit when current version is no longer less than target version
          return this.$q.resolve(compareVersions.compare(currentVersion, targetVersion, '<'));
        };

        const action = (currentVersion = '1.0.0') => {
          // Get the next sequential upgrade step from upgrade map
          let upgradeStep = [...this.upgradeMap].find(({ 0: x }) => compareVersions.compare(currentVersion, x, '<'));

          // If no upgrade step found set an empty step for the target version
          if (angular.isUndefined(upgradeStep)) {
            upgradeStep = [targetVersion, this.$q.resolve];
          }

          // Run upgrade step
          return upgradeStep![1]()
            .then(() => this.setLastUpgradeVersion(upgradeStep![0]))
            .then(() => this.logSvc.logInfo(`Upgraded to ${upgradeStep![0]}`))
            .then(() => upgradeStep![0]);
        };

        return this.utilitySvc.asyncWhile(lastUpgradeVersion, condition, action);
      })
      .catch((err) => {
        throw new Exceptions.UpgradeFailedException(`Failed upgrade to ${targetVersion}`, err);
      });
  }

  // TODO: Implement this
  // Convert existing separators into new format
  // Update sync version
  abstract upgradeTo160(): ng.IPromise<void>;
}
