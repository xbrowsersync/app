import './android-app-scan.component.scss';
import { Component, OnDestroy, OnInit, Output } from 'angular-ts-decorators';
import { autobind } from 'core-decorators';
import Strings from '../../../../../res/strings/en.json';
import * as Exceptions from '../../../shared/exception/exception';
import Globals from '../../../shared/global-shared.constants';
import { PlatformService } from '../../../shared/global-shared.interface';
import LogService from '../../../shared/log/log.service';
import UtilityService from '../../../shared/utility/utility.service';

@autobind
@Component({
  controllerAs: 'vm',
  selector: 'appScan',
  template: require('./android-app-scan.component.html')
})
export default class AndroidAppScanComponent implements OnInit, OnDestroy {
  $q: ng.IQService;
  $timeout: ng.ITimeoutService;
  logSvc: LogService;
  platformSvc: PlatformService;
  utilitySvc: UtilityService;

  initialised = false;
  invalidSyncId = false;
  lightEnabled = false;
  strings = Strings;

  @Output() callback: () => any;
  @Output() close: () => any;

  static $inject = ['$q', '$timeout', 'LogService', 'PlatformService', 'UtilityService'];
  constructor(
    $q: ng.IQService,
    $timeout: ng.ITimeoutService,
    LogSvc: LogService,
    PlatformSvc: PlatformService,
    UtilitySvc: UtilityService
  ) {
    this.$q = $q;
    this.$timeout = $timeout;
    this.logSvc = LogSvc;
    this.platformSvc = PlatformSvc;
    this.utilitySvc = UtilitySvc;
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
      window.QRScanner.enableLight((err) => {
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

  startScanning(): ng.IPromise<any> {
    this.lightEnabled = false;
    this.invalidSyncId = false;

    return this.$q<any>((resolve, reject) => {
      const waitForScan = () => {
        this.initialised = true;

        this.$timeout(() => {
          this.invalidSyncId = false;
        }, 100);

        window.QRScanner.scan((err, scannedText) => {
          if (err) {
            return reject(new Exceptions.AndroidException(err._message ?? err.name ?? err.code));
          }

          window.QRScanner.pausePreview(() => {
            this.logSvc.logInfo(`Scanned: ${scannedText}`);

            let syncInfo: any;
            try {
              syncInfo = this.decodeQrCode(scannedText);
            } catch (decodeQrCodeErr) {
              // If scanned value is not value resume scanning
              this.invalidSyncId = true;
              this.$timeout(() => {
                window.QRScanner.resumePreview(waitForScan);
              }, 3e3);
              return;
            }

            this.$timeout(() => {
              resolve(syncInfo);
            }, 1e3);
          });
        });
      };

      window.QRScanner.prepare((err, status) => {
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
      .then((scannedSyncInfo) => this.callback()(scannedSyncInfo))
      .catch((err) => {
        this.close()().then(() => {
          throw new Exceptions.FailedScanException(undefined, err);
        });
      });
  }

  stopScanning(): ng.IPromise<void> {
    this.lightEnabled = false;
    this.disableLight()
      .catch(() => {})
      .finally(() => {
        window.QRScanner.hide(() => {
          window.QRScanner.destroy();
        });
      });
    return this.$q.resolve();
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
      window.QRScanner.getStatus((status) => {
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
