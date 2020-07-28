import './android-app.component.scss';
import { Component, OnInit } from 'angular-ts-decorators';
import { autobind } from 'core-decorators';
import AppMainComponent from '../../app/app-main/app-main.component';
import * as Exceptions from '../../shared/exception/exception';
import Globals from '../../shared/global-shared.constants';
import { PlatformType } from '../../shared/global-shared.enum';
import { StoreKey } from '../../shared/store/store.enum';
import AndroidPlatformService from '../android-platform.service';

@autobind
@Component({
  controllerAs: 'vm',
  selector: 'app',
  template: require('../../app/app-main/app-main.component.html')
})
export default class AndroidAppComponent extends AppMainComponent implements OnInit {
  platformSvc: AndroidPlatformService;

  initialised = false;
  scanner = {
    invalidSyncId: false,
    lightEnabled: false
  };

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
    return this.$q<void>((resolve, reject) => {
      window.QRScanner.disableLight((err: any) => {
        if (err) {
          return reject(new Exceptions.AndroidException(err._message ?? err.name ?? err.code));
        }
        resolve();
      });
    });
  }

  displayDefaultSearchState() {
    // Set clear search button to display all bookmarks
    return super.displayDefaultSearchState().then(this.searchBookmarks);
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

  init() {
    this.platformName = PlatformType.Android;

    // Enable select file to restore
    this.vm.settings.fileRestoreEnabled = true;

    // Increase search results timeout to avoid display lag
    this.vm.settings.getSearchResultsDelay = 500;

    // Display existing sync panel by default
    this.vm.login.displayNewSyncPanel = false;

    // Load i18n strings
    return this.platformSvc
      .initI18n()
      .then(() => {
        // Bind to cordova device events
        return this.$q<void>((resolve, reject) => {
          document.addEventListener(
            'deviceready',
            () => {
              this.platformSvc.handleDeviceReady(this.vm, resolve, reject);
            },
            false
          );
          document.addEventListener('resume', this.platformSvc.handleResume, false);
        });
      })
      .then(() => {
        // Set component to display and continue initialisation
        this.initialised = true;
        return super.init();
      });
  }

  ngOnInit(): void {
    this.init();
  }

  startScanning(): ng.IPromise<any> {
    this.scanner.lightEnabled = false;
    this.scanner.invalidSyncId = false;

    return this.$q<any>((resolve, reject) => {
      const waitForScan = () => {
        this.$timeout(() => {
          this.scanner.invalidSyncId = false;
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
              this.scanner.invalidSyncId = true;
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
          window.QRScanner.show(() => {
            this.$timeout(() => {
              this.vm.changeView(this.vm.view.views.scan);
              waitForScan();
            }, 500);
          });
        } else {
          reject(new Exceptions.AndroidException('Camera use not authorised'));
        }
      });
    }).catch((err) => {
      throw new Exceptions.FailedScanException(undefined, err);
    });
  }

  stopScanning(): ng.IPromise<void> {
    this.scanner.lightEnabled = false;
    this.disableLight()
      .catch(() => {})
      .finally(() => {
        window.QRScanner.hide(() => {
          window.QRScanner.destroy();
        });
      });
    return this.$q.resolve();
  }

  toggleCameraLight(switchOn?: boolean): ng.IPromise<boolean> {
    // If state was elected toggle light based on value
    if (switchOn !== undefined) {
      return (switchOn ? this.enableLight() : this.disableLight()).then(() => {
        return switchOn;
      });
    }

    // Otherwise toggle light based on current state
    return this.$q((resolve, reject) => {
      window.QRScanner.getStatus((status) => {
        (status.lightEnabled ? this.disableLight() : this.enableLight())
          .then(() => {
            resolve(!status.lightEnabled);
          })
          .catch(reject);
      });
    });
  }

  scanPanel_Cancel_Click() {
    this.login.displayGetSyncIdPanel = false;
    return this.displayMainView().then(this.stopScanning);
  }

  scanPanel_ToggleLight_Click() {
    return this.toggleCameraLight().then((lightEnabled) => {
      this.scanner.lightEnabled = lightEnabled;
    });
  }

  syncForm_ScanCode_Click() {
    let scanSuccess = false;

    this.startScanning()
      .then((scannedSyncInfo: any) => {
        // Update stored sync id and service values
        scanSuccess = true;
        this.sync.id = scannedSyncInfo.id;
        return this.$q.all([
          this.storeSvc.set(StoreKey.SyncId, scannedSyncInfo.id),
          this.updateServiceUrl(scannedSyncInfo.url)
        ]);
      })
      .finally(() => {
        this.displayMainView().then(() => {
          // Stop scanning
          this.stopScanning();

          // If ID was scanned focus on password field
          if (scanSuccess) {
            this.$timeout(() => {
              (document.querySelector('.active-login-form  input[name="txtPassword"]') as HTMLInputElement).focus();
            });
          }
        });
      });
  }
}
