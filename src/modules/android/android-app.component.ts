/* eslint-disable @typescript-eslint/camelcase */

import { Component } from 'angular-ts-decorators';
import { autobind } from 'core-decorators';
import AndroidPlatformService from './android-platform.service';
import AppComponent from '../app/app.component';
import Alert from '../shared/alert/alert.interface';
import Globals from '../shared/globals';
import { AndroidException } from '../shared/exceptions/exception-types';
import { AlertType } from '../shared/alert/alert-type.enum';
import Strings from '../../../res/strings/en.json';

@autobind
@Component({
  controllerAs: 'vm',
  selector: 'app',
  template: require('../app/app.component.html')
})
export default class AndroidAppComponent extends AppComponent {
  platformSvc: AndroidPlatformService;

  initialised = false;
  scanner = {
    invalidSyncId: false,
    lightEnabled: false
  };

  displayAlert(alert: Alert): void {
    this.displaySnackbar(alert.title, alert.message, alert.type);
  }

  displaySnackbar(title, description, level, action?, actionCallback?) {
    // Strip html tags from message
    const urlRegex = new RegExp(Globals.URL.ValidUrlRegex);
    const matches = description.match(urlRegex);
    const descriptionStripped =
      !matches || matches.length === 0
        ? description
        : new DOMParser().parseFromString(`<span>${description}</span>`, 'text/xml').firstElementChild.textContent;

    // Add an action to open url if provided or if the message contains a url
    if (!actionCallback && matches && matches.length > 0) {
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

  init() {
    this.platformName = Globals.Platforms.Android;

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
        return this.$q((resolve, reject) => {
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

  scanPanel_Cancel_Click() {
    this.login.displayGetSyncIdPanel = false;
    return this.displayMainView().then(this.platformSvc.scanner_Stop);
  }

  scanPanel_ToggleLight_Click() {
    return this.platformSvc.scanner_ToggleLight().then((lightEnabled) => {
      this.scanner.lightEnabled = lightEnabled;
    });
  }

  syncForm_ScanCode_Click() {
    let scanSuccess = false;

    this.platformSvc
      .scanner_Start()
      .then((scannedSyncInfo: any) => {
        // Update stored sync id and service values
        scanSuccess = true;
        this.sync.id = scannedSyncInfo.id;
        return this.$q.all([
          this.storeSvc.set(Globals.CacheKeys.SyncId, scannedSyncInfo.id),
          this.updateServiceUrl(scannedSyncInfo.url)
        ]);
      })
      .finally(() => {
        this.displayMainView().then(() => {
          // Stop scanning
          this.platformSvc.scanner_Stop();

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
