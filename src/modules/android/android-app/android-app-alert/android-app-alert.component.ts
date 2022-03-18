import angular from 'angular';
import { Component } from 'angular-ts-decorators';
import { AlertType } from '../../../shared/alert/alert.enum';
import { AlertService } from '../../../shared/alert/alert.service';
import { AndroidError } from '../../../shared/errors/errors';
import { ExceptionHandler } from '../../../shared/errors/errors.interface';
import Globals from '../../../shared/global-shared.constants';
import { AndroidPlatformService } from '../../android-shared/android-platform/android-platform.service';
import { AndroidAlert } from '../android-app.interface';

@Component({
  selector: 'appAlert'
})
export class AndroidAppAlertComponent {
  Strings = require('../../../../../res/strings/en.json');

  $exceptionHandler: ExceptionHandler;
  $scope: ng.IScope;
  platformSvc: AndroidPlatformService;

  static $inject = ['$exceptionHandler', '$scope', 'AlertService', 'PlatformService'];
  constructor(
    $exceptionHandler: ExceptionHandler,
    $scope: ng.IScope,
    AlertSvc: AlertService,
    PlatformSvc: AndroidPlatformService
  ) {
    this.$exceptionHandler = $exceptionHandler;
    this.$scope = $scope;
    this.platformSvc = PlatformSvc;

    $scope.$watch(
      () => AlertSvc.currentAlert,
      (newVal, oldVal) => {
        if (newVal !== oldVal && !angular.isUndefined(newVal ?? undefined)) {
          this.displayAlert(newVal);
        }
      }
    );
  }

  displayAlert(alert: AndroidAlert): void {
    // Strip html tags from message
    const urlInAlert = alert.message?.match(new RegExp(Globals.URL.ValidUrlRegex, 'i'))?.find(Boolean);
    const descriptionStripped = urlInAlert
      ? new DOMParser().parseFromString(`<span>${alert.message}</span>`, 'text/xml').firstElementChild.textContent
      : alert.message;

    // Add an action to open url if provided or if the message contains a url
    if (!alert.actionCallback && urlInAlert) {
      const urlToOpenOnClick = urlInAlert;
      alert.action = this.platformSvc.getI18nString(this.Strings.Alert.Go);
      alert.actionCallback = () => {
        this.platformSvc.openUrl(urlToOpenOnClick);
      };
    }

    // Join title and description to form alert text
    const text = `${[alert.title, descriptionStripped.replace(/\.$/, '')].filter(Boolean).join('. ')}.`;
    const textColor = '#ffffff';
    let bgColor = null;
    switch (alert.type) {
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
      if (clicked && alert.actionCallback) {
        alert.actionCallback();
      }
    };
    const failure = (errMessage) => {
      this.$exceptionHandler(new AndroidError('Failed to create snackbar'), errMessage);
    };

    // Ensure soft keyboard is hidden
    if (document.activeElement) {
      (document.activeElement as HTMLInputElement).blur();
    }

    // Display snackbar
    window.cordova.plugins.snackbar.create(text, 5000, bgColor, textColor, 3, alert.action, success, failure);
  }
}
