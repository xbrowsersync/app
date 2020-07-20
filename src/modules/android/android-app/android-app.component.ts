import './android-app.component.scss';
import { Component } from 'angular-ts-decorators';
import { autobind } from 'core-decorators';
import Strings from '../../../../res/strings/en.json';
import AppMainComponent from '../../app/app-main/app-main.component';
import { AlertType } from '../../shared/alert/alert.enum';
import { Alert } from '../../shared/alert/alert.interface';
import { Bookmark } from '../../shared/bookmark/bookmark.interface';
import { AndroidException } from '../../shared/exception/exception';
import * as Exceptions from '../../shared/exception/exception';
import Globals from '../../shared/global-shared.constants';
import { PlatformType } from '../../shared/global-shared.enum';
import { StoreKey } from '../../shared/store/store.enum';
import { Sync } from '../../shared/sync/sync.interface';
import AndroidPlatformService from '../android-platform.service';

@autobind
@Component({
  controllerAs: 'vm',
  selector: 'app',
  template: require('../../app/app-main/app-main.component.html')
})
export default class AndroidAppComponent extends AppMainComponent {
  platformSvc: AndroidPlatformService;

  initialised = false;
  scanner = {
    invalidSyncId: false,
    lightEnabled: false
  };

  copyTextToClipboard(text: string): ng.IPromise<void> {
    return this.$q<void>((resolve, reject) => {
      window.cordova.plugins.clipboard.copy(text, resolve, reject);
    }).then(() => {});
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
    return this.$q<void>((resolve, reject) => {
      window.QRScanner.disableLight((err: any) => {
        if (err) {
          return reject(new Exceptions.AndroidException(err._message ?? err.name ?? err.code));
        }
        resolve();
      });
    });
  }

  displayAlert(alert: Alert): void {
    this.displaySnackbar(alert.title, alert.message, alert.type);
  }

  displaySnackbar(title, description, level, action?, actionCallback?) {
    // Strip html tags from message
    const urlRegex = new RegExp(Globals.URL.ValidUrlRegex);
    const matches = description.match(urlRegex);
    const descriptionStripped =
      matches?.length === 0
        ? description
        : new DOMParser().parseFromString(`<span>${description}</span>`, 'text/xml').firstElementChild.textContent;

    // Add an action to open url if provided or if the message contains a url
    if (!actionCallback && matches?.length > 0) {
      const urlToOpenOnClick = matches[0];
      action = this.platformSvc.getConstant(Strings.button_Go_Label);
      actionCallback = () => {
        this.platformSvc.openUrl(urlToOpenOnClick);
      };
    }

    const text = `${(title ? `${title}. ${descriptionStripped}` : descriptionStripped).replace(/\.$/, '')}.`;
    const textColor = '#ffffff';
    let bgColor = null;
    switch (level) {
      case AlertType.Error:
        bgColor = '#ea3869';
        break;
      case AlertType.Warning:
        bgColor = '#bdc71b';
        break;
      case AlertType.Information:
      default:
        bgColor = '#083039';
        break;
    }
    const success = (clicked) => {
      if (clicked && actionCallback) {
        actionCallback();
      }
    };
    const failure = (errMessage) => {
      this.$exceptionHandler(new AndroidException('Failed to create snackbar'), errMessage);
    };

    // Ensure soft keyboard is hidden
    if (document.activeElement) {
      (document.activeElement as HTMLInputElement).blur();
    }

    // Display snackbar
    window.cordova.plugins.snackbar.create(text, 5000, bgColor, textColor, 3, action, success, failure);
  }

  displayDefaultSearchState() {
    // Set clear search button to display all bookmarks
    return super.displayDefaultSearchState().then(this.searchBookmarks);
  }

  downloadFile(fileName: string, textContents: string): ng.IPromise<string> {
    if (!fileName) {
      throw new Error('File name not supplied.');
    }

    // Set file storage location to external storage root directory
    const storageLocation = `${window.cordova.file.externalRootDirectory}Download`;

    return this.$q((resolve, reject) => {
      const onError = (err: Error) => {
        return reject(new Exceptions.FailedDownloadFileException(undefined, err));
      };

      this.logSvc.logInfo(`Downloading file ${fileName}`);

      // Save file to storage location
      window.resolveLocalFileSystemURL(
        storageLocation,
        (dirEntry) => {
          dirEntry.getFile(
            fileName,
            { create: true },
            (fileEntry) => {
              fileEntry.createWriter((fileWriter) => {
                fileWriter.write(textContents);
                fileWriter.onerror = onError;
                fileWriter.onwriteend = () => {
                  // Return message to be displayed
                  const message = this.platformSvc
                    .getConstant(Strings.downloadFile_Success_Message)
                    .replace('{fileName}', fileEntry.name);
                  resolve(message);
                };
              }, onError);
            },
            onError
          );
        },
        onError
      );
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

  getHelpPages(): string[] {
    const pages = [
      this.platformSvc.getConstant(Strings.help_Page_Welcome_Android_Content),
      this.platformSvc.getConstant(Strings.help_Page_FirstSync_Android_Content),
      this.platformSvc.getConstant(Strings.help_Page_ExistingId_Android_Content),
      this.platformSvc.getConstant(Strings.help_Page_Searching_Android_Content),
      this.platformSvc.getConstant(Strings.help_Page_AddingBookmarks_Android_Content),
      this.platformSvc.getConstant(Strings.help_Page_BackingUp_Android_Content),
      this.platformSvc.getConstant(Strings.help_Page_FurtherSupport_Content)
    ];

    return pages;
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

  scanner_Start(): ng.IPromise<any> {
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
              this.vm.view.change(this.vm.view.views.scan);
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

  scanner_Stop(): ng.IPromise<void> {
    this.disableLight()
      .catch(() => {})
      .finally(() => {
        window.QRScanner.hide(() => {
          window.QRScanner.destroy();
        });
      });
    return this.$q.resolve();
  }

  scanner_ToggleLight(switchOn?: boolean): ng.IPromise<boolean> {
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
    return this.displayMainView().then(this.scanner_Stop);
  }

  scanPanel_ToggleLight_Click() {
    return this.scanner_ToggleLight().then((lightEnabled) => {
      this.scanner.lightEnabled = lightEnabled;
    });
  }

  shareBookmark(bookmark: Bookmark): void {
    const options = {
      subject: `${bookmark.title} (${this.platformSvc.getConstant(Strings.shareBookmark_Message)})`,
      url: bookmark.url,
      chooserTitle: this.platformSvc.getConstant(Strings.shareBookmark_Message)
    };

    const onError = (err: Error) => {
      this.$exceptionHandler(err);
    };

    // Display share sheet
    window.plugins.socialsharing.shareWithOptions(options, null, onError);
  }

  sync_Current(): ng.IPromise<Sync> {
    return this.$q.resolve(this.syncEngineService.getCurrentSync());
  }

  sync_DisplayConfirmation(): boolean {
    return false;
  }

  sync_GetQueueLength(): ng.IPromise<number> {
    return this.$q.resolve(this.syncEngineService.getSyncQueueLength());
  }

  syncForm_ScanCode_Click() {
    let scanSuccess = false;

    this.scanner_Start()
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
          this.scanner_Stop();

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
