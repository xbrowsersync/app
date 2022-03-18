import { Component, OnDestroy, OnInit } from 'angular-ts-decorators';
import { boundMethod } from 'autobind-decorator';
import { ApiSyncInfo } from '../../../shared/api/api.interface';
import { AndroidError, FailedScanError, InvalidSyncInfoError } from '../../../shared/errors/errors';
import Globals from '../../../shared/global-shared.constants';
import { PlatformService } from '../../../shared/global-shared.interface';
import { LogService } from '../../../shared/log/log.service';
import { StoreKey } from '../../../shared/store/store.enum';
import { StoreService } from '../../../shared/store/store.service';
import { UtilityService } from '../../../shared/utility/utility.service';
import { AndroidAppHelperService } from '../shared/android-app-helper/android-app-helper.service';

@Component({
  controllerAs: 'vm',
  selector: 'appScan',
  styles: [require('./android-app-scan.component.scss')],
  template: require('./android-app-scan.component.html')
})
export class AndroidAppScanComponent implements OnInit, OnDestroy {
  Strings = require('../../../../../res/strings/en.json');

  $q: ng.IQService;
  $timeout: ng.ITimeoutService;
  appHelperSvc: AndroidAppHelperService;
  logSvc: LogService;
  platformSvc: PlatformService;
  storeSvc: StoreService;
  utilitySvc: UtilityService;

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

  @boundMethod
  close(): void {
    this.appHelperSvc.switchView();
  }

  decodeQrCode(qrCodeValue: string): ApiSyncInfo {
    const syncInfo = JSON.parse(qrCodeValue) as ApiSyncInfo;
    if (!syncInfo?.id || !syncInfo?.serviceType || !syncInfo?.version) {
      throw new InvalidSyncInfoError('Invalid QR code');
    }
    return syncInfo;
  }

  disableLight(): ng.IPromise<void> {
    if (!this.lightEnabled) {
      return this.$q.resolve();
    }

    return this.$q<void>((resolve, reject) => {
      window.QRScanner.disableLight((err: any) => {
        if (err) {
          return reject(new AndroidError(err._message ?? err.name ?? err.code));
        }
        resolve();
      });
    });
  }

  enableLight(): ng.IPromise<void> {
    return this.$q<void>((resolve, reject) => {
      window.QRScanner.enableLight((err: any) => {
        if (err) {
          return reject(new AndroidError(err._message ?? err.name ?? err.code));
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

  scanCompleted(scannedSyncInfo: ApiSyncInfo): ng.IPromise<void> {
    // Update stored sync info
    return this.storeSvc
      .set(StoreKey.SyncInfo, scannedSyncInfo)
      .then(() => this.appHelperSvc.switchView())
      .then(() => this.appHelperSvc.focusOnElement('.active-login-form  input[name="txtPassword"]'));
  }

  startScanning(): ng.IPromise<void> {
    this.lightEnabled = false;
    this.invalidSyncId = false;

    return this.$q<ApiSyncInfo>((resolve, reject) => {
      const waitForScan = () => {
        this.displayScanInterface = true;

        this.$timeout(() => {
          this.invalidSyncId = false;
        }, 100);

        window.QRScanner.scan((err: any, scannedText: string): void => {
          if (err) {
            return reject(new AndroidError(err._message ?? err.name ?? err.code));
          }

          window.QRScanner.pausePreview(() => {
            this.logSvc.logInfo(`Scanned: ${scannedText}`);

            let syncInfo: ApiSyncInfo;
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
          return reject(new AndroidError(err._message ?? err.name ?? err.code));
        }

        if (status.authorized) {
          window.QRScanner.show(() => waitForScan());
        } else {
          reject(new AndroidError('Camera use not authorised'));
        }
      });
    })
      .then((scanResult) => this.scanCompleted(scanResult))
      .catch((err) => {
        this.appHelperSvc.switchView().then(() => {
          throw new FailedScanError(undefined, err);
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

  @boundMethod
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
