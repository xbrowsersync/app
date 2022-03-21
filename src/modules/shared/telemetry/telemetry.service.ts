import { Injectable } from 'angular-ts-decorators';
import { ApiSyncInfo } from '../api/api.interface';
import { NetworkConnectionError } from '../errors/errors';
import Globals from '../global-shared.constants';
import { PlatformService } from '../global-shared.interface';
import { LogService } from '../log/log.service';
import { NetworkService } from '../network/network.service';
import { SettingsService } from '../settings/settings.service';
import { StoreKey } from '../store/store.enum';
import { StoreService } from '../store/store.service';
import { SyncService } from '../sync/sync.service';
import { UtilityService } from '../utility/utility.service';
import { TelemetryPayload } from './telemetry.interface';

@Injectable('TelemetryService')
export class TelemetryService {
  $http: ng.IHttpService;
  $q: ng.IQService;
  logSvc: LogService;
  networkSvc: NetworkService;
  platformSvc: PlatformService;
  settingsSvc: SettingsService;
  storeSvc: StoreService;
  syncSvc: SyncService;
  utilitySvc: UtilityService;

  static $inject = [
    '$http',
    '$q',
    'LogService',
    'NetworkService',
    'PlatformService',
    'SettingsService',
    'StoreService',
    'SyncService',
    'UtilityService'
  ];
  constructor(
    $http: ng.IHttpService,
    $q: ng.IQService,
    LogSvc: LogService,
    NetworkSvc: NetworkService,
    PlatformSvc: PlatformService,
    SettingsSvc: SettingsService,
    StoreSvc: StoreService,
    SyncSvc: SyncService,
    UtilitySvc: UtilityService
  ) {
    this.$http = $http;
    this.$q = $q;
    this.logSvc = LogSvc;
    this.networkSvc = NetworkSvc;
    this.platformSvc = PlatformSvc;
    this.settingsSvc = SettingsSvc;
    this.storeSvc = StoreSvc;
    this.syncSvc = SyncSvc;
    this.utilitySvc = UtilitySvc;
  }

  getTelemetryPayload(): ng.IPromise<TelemetryPayload> {
    return this.$q
      .all([
        this.platformSvc.getAppVersionName(),
        this.platformSvc.getCurrentLocale(),
        this.settingsSvc.all(),
        this.storeSvc.get<ApiSyncInfo>(StoreKey.SyncInfo),
        this.utilitySvc.isSyncEnabled()
      ])
      .then((data) => {
        const [appVersion, currentLocale, settings, syncInfo, syncEnabled] = data;
        const { id, password, ...safeSyncInfo } = syncInfo ?? {};
        return (syncEnabled ? this.syncSvc.getSyncSize() : this.$q.resolve(0)).then((syncSize) => {
          let telemetryPayload: TelemetryPayload = {
            appVersion,
            currentLocale,
            platform: this.utilitySvc.getBrowserName(),
            syncEnabled,
            ...settings,
            ...this.platformSvc.getPlatformInfo()
          };
          if (syncEnabled) {
            telemetryPayload = {
              syncSize,
              ...safeSyncInfo,
              ...telemetryPayload
            };
          }
          return Object.keys(telemetryPayload)
            .filter((key) => {
              return telemetryPayload[key] != null;
            })
            .reduce((prev, current) => {
              prev[current] = telemetryPayload[current];
              return prev;
            }, {}) as TelemetryPayload;
        });
      });
  }

  submitTelemetry(): ng.IPromise<void> {
    return this.networkSvc
      .checkNetworkConnection()
      .then(() => this.$q.all([this.utilitySvc.getInstallationId(), this.getTelemetryPayload()]))
      .then((data) => {
        const [installationId, telemetry] = data;
        return this.$http
          .post<void>(
            Globals.TelemetryUrl,
            JSON.stringify({
              installationId,
              ...telemetry
            })
          )
          .catch((response) => {
            throw this.networkSvc.getErrorFromHttpResponse(response);
          });
      })
      .then(() => {})
      .catch((err) => {
        if (err instanceof NetworkConnectionError) {
          return;
        }
        this.logSvc.logWarning(`Failed to submit telemetry: ${err?.message}`);
      });
  }
}
