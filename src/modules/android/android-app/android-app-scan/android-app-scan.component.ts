import { Component, OnDestroy, OnInit } from 'angular-ts-decorators';
import autobind from 'autobind-decorator';
import { AppViewType } from '../../../app/app.enum';
import { BackupSync } from '../../../shared/backup-restore/backup-restore.interface';
import * as Exceptions from '../../../shared/exception/exception';
import Globals from '../../../shared/global-shared.constants';
import { PlatformService } from '../../../shared/global-shared.interface';
import LogService from '../../../shared/log/log.service';
import { StoreKey } from '../../../shared/store/store.enum';
import StoreService from '../../../shared/store/store.service';
import UtilityService from '../../../shared/utility/utility.service';
import AndroidAppHelperService from '../shared/android-app-helper/android-app-helper.service';

@autobind
@Component({
  controllerAs: 'vm',
  selector: 'appScan',
  styles: [require('./android-app-scan.component.scss')],
  template: require('./android-app-scan.component.html')
})
export default class AndroidAppScanComponent implements OnInit, OnDestroy {
  Strings = require('../../../../../res/strings/en.json');

  $q: ng.IQService;
  $timeout: ng.ITimeoutService;
  appHelperSvc: AndroidAppHelperService;
  logSvc: LogService;
  platformSvc: PlatformService;
  storeSvc: StoreService;
  utilitySvc: UtilityService;

  appViewType = AppViewType;
  displayScanInterface = false;
  invalidSyncId = false;
  lightEnabled = false;

  static $inject = [
    '$q',
    '$timeout',
    'AppHelperService',
    'LogService',
    'PlatformService',
    'StoreService',
    'UtilityService'
  ];
  constructor(
    $q: ng.IQService,
    $timeout: ng.ITimeoutService,
    AppHelperSvc: AndroidAppHelperService,
    LogSvc: LogService,
    PlatformSvc: PlatformService,
    StoreSvc: StoreService,
    UtilitySvc: UtilityService
  ) {
    this.$q = $q;
    this.$timeout = $timeout;
    this.appHelperSvc = AppHelperSvc;
    this.logSvc = LogSvc;
    this.platformSvc = PlatformSvc;
    this.storeSvc = StoreSvc;
    this.utilitySvc = UtilitySvc;
  }

  close(): void {
    this.appHelperSvc.switchView();
  }

  decodeQrCode(qrCodeValue: string): any {
    let serviceUrl: string;
    let syncId: string;
    try {
      // For v1.6.0 or later, expect sync info object
      const syncInfo = JSON.parse(qrCodeValue);
      syncId = syncInfo.id;
      serviceUrl = syncInfo.url;
    } catch (err) {
      // For pre-v1.6.0, split the scanned value into it's components
      const arr = qrCodeValue.split(Globals.QrCode.Delimiter);
      syncId = arr[0];
      serviceUrl = arr[1];
    }

    // Validate decoded values
    const urlRegex = new RegExp(`^${Globals.URL.ValidUrlRegex}$`, 'i');
    if (!this.utilitySvc.syncIdIsValid(syncId) || !urlRegex.test(serviceUrl ?? '')) {
      throw new Error('Invalid QR code');
    }

    return {
      id: syncId,
      url: serviceUrl
    };
  }

  disableLight(): ng.IPromise<void> {
    if (!this.lightEnabled) {
      return this.$q.resolve();
    }

    return this.$q<void>((resolve, reject) => {
      window.QRScanner.disableLight((err: any) => {
        if (err) {
          return reject(new Exceptions.AndroidException(err._message ?? err.name ?? err.code));
        }
        resolve();
      });
    });
  }

  enableLight(): ng.IPromise<void> {
    return this.$q<void>((resolve, reject) => {
      window.QRScanner.enableLight((err: any) => {
        if (err) {
          return reject(new Exceptions.AndroidException(err._message ?? err.name ?? err.code));
        }
        resolve();
      });
    });
  }

  ngOnDestroy(): void {
    this.stopScanning();
  }

  ngOnInit(): void {
    this.startScanning();
  }

  scanCompleted(scannedSyncInfo: BackupSync): ng.IPromise<void> {
    // Update stored sync id and service values
    return this.$q
      .all([
        this.appHelperSvc.updateServiceUrl(scannedSyncInfo.url),
        this.storeSvc.set(StoreKey.SyncId, scannedSyncInfo.id)
      ])
      .then(() => this.appHelperSvc.switchView())
      .then(() => this.appHelperSvc.focusOnElement('.active-login-form  input[name="txtPassword"]'));
  }

  startScanning(): ng.IPromise<any> {
    this.lightEnabled = false;
    this.invalidSyncId = false;

    return this.$q<BackupSync>((resolve, reject) => {
      const waitForScan = () => {
        this.displayScanInterface = true;

        this.$timeout(() => {
          this.invalidSyncId = false;
        }, 100);

        window.QRScanner.scan((err: any, scannedText: string) => {
          if (err) {
            return reject(new Exceptions.AndroidException(err._message ?? err.name ?? err.code));
          }

          window.QRScanner.pausePreview(() => {
            this.logSvc.logInfo(`Scanned: ${scannedText}`);

            let syncInfo: BackupSync;
            try {
              syncInfo = this.decodeQrCode(scannedText);
            } catch (decodeQrCodeErr) {
              // If scanned value is not value resume scanning
              this.invalidSyncId = true;
              this.$timeout(() => window.QRScanner.resumePreview(waitForScan), 3e3);
              return;
            }

            this.$timeout(() => resolve(syncInfo), 1e3);
          });
        });
      };

      window.QRScanner.prepare((err: any, status: any) => {
        if (err) {
          return reject(new Exceptions.AndroidException(err._message ?? err.name ?? err.code));
        }

        if (status.authorized) {
          window.QRScanner.show(() => waitForScan());
        } else {
          reject(new Exceptions.AndroidException('Camera use not authorised'));
        }
      });
    })
      .then(this.scanCompleted)
      .catch((err) => {
        this.appHelperSvc.switchView().then(() => {
          throw new Exceptions.FailedScanException(undefined, err);
        });
      });
  }

  stopScanning(): void {
    this.displayScanInterface = false;
    this.lightEnabled = false;
    this.$timeout(
      () =>
        this.disableLight()
          .catch(() => {})
          .finally(() => window.QRScanner.hide(() => window.QRScanner.destroy())),
      Globals.InterfaceReadyTimeout
    );
  }

  toggleCameraLight(switchOn?: boolean): ng.IPromise<void> {
    // If state was elected toggle light based on value
    if (switchOn !== undefined) {
      return (switchOn ? this.enableLight() : this.disableLight()).then(() => {
        this.lightEnabled = switchOn;
      });
    }

    // Otherwise toggle light based on current state
    return this.$q((resolve, reject) => {
      window.QRScanner.getStatus((status: any) => {
        (status.lightEnabled ? this.disableLight() : this.enableLight())
          .then(() => {
            this.lightEnabled = !status.lightEnabled;
            resolve();
          })
          .catch(reject);
      });
    });
  }
}
