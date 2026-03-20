/**
 * Manual DI container for the background context (service worker).
 * Instantiates all services in dependency order without AngularJS.
 */

import { AlertService } from '../../shared/alert/alert.service';
import { ApiXbrowsersyncService } from '../../shared/api/api-xbrowsersync/api-xbrowsersync.service';
import { BackupRestoreService } from '../../shared/backup-restore/backup-restore.service';
import { BookmarkService } from '../../shared/bookmark/bookmark.interface';
import { BookmarkHelperService } from '../../shared/bookmark/bookmark-helper/bookmark-helper.service';
import { CryptoService } from '../../shared/crypto/crypto.service';
import { ExceptionHandler } from '../../shared/errors/errors.interface';
import { ExceptionHandlerService } from '../../shared/errors/exception-handler/exception-handler.service';
import { PlatformService } from '../../shared/global-shared.interface';
import { LogService } from '../../shared/log/log.service';
import { NetworkService } from '../../shared/network/network.service';
import { SettingsService } from '../../shared/settings/settings.service';
import { BookmarkSyncProviderService } from '../../shared/sync/bookmark-sync-provider/bookmark-sync-provider.service';
import { SyncService } from '../../shared/sync/sync.service';
import { TelemetryService } from '../../shared/telemetry/telemetry.service';
import { UpgradeService } from '../../shared/upgrade/upgrade.service';
import { UtilityService } from '../../shared/utility/utility.service';
import { WorkingService } from '../../shared/working/working.service';
import { BookmarkIdMapperService } from '../shared/bookmark-id-mapper/bookmark-id-mapper.service';
import { WebExtStoreService } from '../shared/webext-store/webext-store.service';
import {
  $httpFactory,
  $injectorFactory,
  $intervalFactory,
  $locationFactory,
  $logFactory,
  $qFactory,
  $rootScopeFactory,
  $timeoutFactory
} from './angular-shims';
import { WebExtBackgroundService } from './webext-background.service';

export interface BackgroundPlatformConfig {
  BookmarkServiceClass: new (...args: any[]) => BookmarkService;
  PlatformServiceClass: new (...args: any[]) => PlatformService;
  UpgradeProviderServiceClass: new (...args: any[]) => any;
}

export interface BackgroundContainer {
  backgroundSvc: WebExtBackgroundService;
  alertSvc: AlertService;
  injector: ng.auto.IInjectorService;
}

export const createBackgroundContainer = (config: BackgroundPlatformConfig): BackgroundContainer => {
  // Create AngularJS shims
  const $q = $qFactory();
  const $timeout = $timeoutFactory();
  const $interval = $intervalFactory();
  const $http = $httpFactory();
  const $log = $logFactory();
  const $rootScope = $rootScopeFactory();
  const $location = $locationFactory();
  const injector = $injectorFactory() as any;

  // Register shims in injector
  injector.register('$q', $q);
  injector.register('$timeout', $timeout);
  injector.register('$interval', $interval);
  injector.register('$http', $http);
  injector.register('$log', $log);
  injector.register('$rootScope', $rootScope);
  injector.register('$location', $location);
  injector.register('$injector', injector);

  // --- Instantiate services in dependency order ---

  // 1. No-dependency services
  const alertSvc = new AlertService();
  const workingSvc = new WorkingService();
  injector.register('AlertService', alertSvc);
  injector.register('WorkingService', workingSvc);

  // 2. LogService (depends on $injector, $log - uses lazy $q and StoreService)
  const logSvc = new LogService(injector, $log);
  injector.register('LogService', logSvc);

  // 3. NetworkService (depends on $q)
  const networkSvc = new NetworkService($q);
  injector.register('NetworkService', networkSvc);

  // 4. StoreService (WebExtStoreService depends on $q)
  const storeSvc = new WebExtStoreService($q);
  injector.register('StoreService', storeSvc);

  // 5. ExceptionHandlerService (depends on $injector, AlertService, LogService)
  const exceptionHandlerSvc = new ExceptionHandlerService(injector, alertSvc, logSvc);
  const $exceptionHandler = exceptionHandlerSvc.handleError as ExceptionHandler;
  injector.register('ExceptionHandler', exceptionHandlerSvc);
  injector.register('$exceptionHandler', $exceptionHandler);

  // 6. UtilityService (depends on $exceptionHandler, $http, $injector, $location, $q, $rootScope, LogService, NetworkService, StoreService)
  const utilitySvc = new UtilityService(
    $exceptionHandler,
    $http,
    injector,
    $location,
    $q,
    $rootScope,
    logSvc,
    networkSvc,
    storeSvc
  );
  injector.register('UtilityService', utilitySvc);

  // 7. CryptoService (depends on $q, LogService, StoreService, UtilityService)
  const cryptoSvc = new CryptoService($q, logSvc, storeSvc, utilitySvc);
  injector.register('CryptoService', cryptoSvc);

  // 8. BookmarkHelperService (depends on $injector, $q, CryptoService, StoreService, UtilityService)
  const bookmarkHelperSvc = new BookmarkHelperService(injector, $q, cryptoSvc, storeSvc, utilitySvc);
  injector.register('BookmarkHelperService', bookmarkHelperSvc);

  // 9. SettingsService (depends on LogService, StoreService)
  const settingsSvc = new SettingsService(logSvc, storeSvc);
  injector.register('SettingsService', settingsSvc);

  // 10. BookmarkIdMapperService (depends on $q, StoreService)
  const bookmarkIdMapperSvc = new BookmarkIdMapperService($q, storeSvc);
  injector.register('BookmarkIdMapperService', bookmarkIdMapperSvc);

  // 11. ApiXbrowsersyncService (depends on $injector, $http, $q, NetworkService, StoreService, UtilityService)
  const apiSvc = new ApiXbrowsersyncService(injector, $http, $q, networkSvc, storeSvc, utilitySvc);
  injector.register('ApiXbrowsersyncService', apiSvc);

  // 12. V160UpgradeProviderService (platform-specific, depends on $q, BookmarkHelperService, BookmarkService, PlatformService, StoreService, UtilityService)
  // Defer creation until after BookmarkService and PlatformService are created

  // 13. BookmarkService (platform-specific)
  // The constructor signatures vary by platform, so we use $inject to determine args
  const BookmarkSvcClass = config.BookmarkServiceClass as any;
  const bookmarkSvcInjectNames: string[] = BookmarkSvcClass.$inject || [];
  const bookmarkSvcArgs = bookmarkSvcInjectNames.map((name: string) => injector.get(name));
  const bookmarkSvc = new BookmarkSvcClass(...bookmarkSvcArgs);
  injector.register('BookmarkService', bookmarkSvc);

  // 14. PlatformService (platform-specific, depends on $injector, $interval, $q, $timeout, AlertService, BookmarkHelperService, BookmarkIdMapperService, LogService, StoreService, UtilityService, WorkingService)
  const PlatformSvcClass = config.PlatformServiceClass as any;
  const platformSvcInjectNames: string[] = PlatformSvcClass.$inject || [];
  const platformSvcArgs = platformSvcInjectNames.map((name: string) => injector.get(name));
  const platformSvc = new PlatformSvcClass(...platformSvcArgs);
  injector.register('PlatformService', platformSvc);

  // 15. V160UpgradeProviderService (now that BookmarkService and PlatformService exist)
  const UpgradeProviderSvcClass = config.UpgradeProviderServiceClass as any;
  const upgradeProviderInjectNames: string[] = UpgradeProviderSvcClass.$inject || [];
  const upgradeProviderArgs = upgradeProviderInjectNames.map((name: string) => injector.get(name));
  const v160UpgradeProviderSvc = new UpgradeProviderSvcClass(...upgradeProviderArgs);
  injector.register('V160UpgradeProviderService', v160UpgradeProviderSvc);

  // 16. UpgradeService (depends on $q, LogService, PlatformService, StoreService, UtilityService, V160UpgradeProviderService)
  const upgradeSvc = new UpgradeService($q, logSvc, platformSvc, storeSvc, utilitySvc, v160UpgradeProviderSvc);
  injector.register('UpgradeService', upgradeSvc);

  // 17. BackupRestoreService (depends on $q, BookmarkService, LogService, PlatformService, StoreService, UpgradeService, UtilityService)
  const backupRestoreSvc = new BackupRestoreService(
    $q,
    bookmarkSvc,
    logSvc,
    platformSvc,
    storeSvc,
    upgradeSvc,
    utilitySvc
  );
  injector.register('BackupRestoreService', backupRestoreSvc);

  // 18. BookmarkSyncProviderService (depends on $q, BookmarkHelperService, BookmarkService, CryptoService, LogService, NetworkService, PlatformService, SettingsService, StoreService, UpgradeService, UtilityService)
  const bookmarkSyncProviderSvc = new BookmarkSyncProviderService(
    $q,
    bookmarkHelperSvc,
    bookmarkSvc,
    cryptoSvc,
    logSvc,
    networkSvc,
    platformSvc,
    settingsSvc,
    storeSvc,
    upgradeSvc,
    utilitySvc
  );
  injector.register('BookmarkSyncProviderService', bookmarkSyncProviderSvc);

  // 19. SyncService (depends on $exceptionHandler, $q, $timeout, BookmarkHelperService, BookmarkSyncProviderService, CryptoService, LogService, NetworkService, PlatformService, StoreService, UtilityService)
  const syncSvc = new SyncService(
    $exceptionHandler,
    $q,
    $timeout,
    bookmarkHelperSvc,
    bookmarkSyncProviderSvc,
    cryptoSvc,
    logSvc,
    networkSvc,
    platformSvc,
    storeSvc,
    utilitySvc
  );
  injector.register('SyncService', syncSvc);

  // 20. TelemetryService (depends on $http, $q, LogService, NetworkService, PlatformService, SettingsService, StoreService, SyncService, UtilityService)
  const telemetrySvc = new TelemetryService(
    $http,
    $q,
    logSvc,
    networkSvc,
    platformSvc,
    settingsSvc,
    storeSvc,
    syncSvc,
    utilitySvc
  );
  injector.register('TelemetryService', telemetrySvc);

  // 21. WebExtBackgroundService (depends on $exceptionHandler, $q, $timeout, AlertService, BackupRestoreService, BookmarkHelperService, BookmarkIdMapperService, BookmarkService, LogService, NetworkService, PlatformService, SettingsService, StoreService, SyncService, TelemetryService, UpgradeService, UtilityService)
  const backgroundSvc = new WebExtBackgroundService(
    $exceptionHandler,
    $q,
    $timeout,
    alertSvc,
    backupRestoreSvc,
    bookmarkHelperSvc,
    bookmarkIdMapperSvc,
    bookmarkSvc,
    logSvc,
    networkSvc,
    platformSvc,
    settingsSvc,
    storeSvc,
    syncSvc,
    telemetrySvc,
    upgradeSvc,
    utilitySvc
  );
  injector.register('WebExtBackgroundService', backgroundSvc);

  // Set up alert observer: when alert changes, display notification
  alertSvc.onAlertChanged = (alert) => {
    if (alert) {
      backgroundSvc.displayAlert(alert);
    }
  };

  return { backgroundSvc, alertSvc, injector };
};
