import angular from 'angular';
import { Component } from 'angular-ts-decorators';
import autobind from 'autobind-decorator';
import { AlertType } from '../../../shared/alert/alert.enum';
import AlertService from '../../../shared/alert/alert.service';
import { AndroidException } from '../../../shared/exception/exception';
import { ExceptionHandler } from '../../../shared/exception/exception.interface';
import Globals from '../../../shared/global-shared.constants';
import AndroidPlatformService from '../../android-shared/android-platform/android-platform.service';
import { AndroidAlert } from '../android-app.interface';

@autobind
@Component({
  selector: 'appAlert'
})
export default class AndroidAppAlertComponent {
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
    const urlRegex = new RegExp(Globals.URL.ValidUrlRegex);
    const matches = alert.message?.match(urlRegex);
    const descriptionStripped =
      matches?.length === 0
        ? alert.message
        : new DOMParser().parseFromString(`<span>${alert.message}</span>`, 'text/xml').firstElementChild.textContent;

    // Add an action to open url if provided or if the message contains a url
    if (!alert.actionCallback && matches?.length) {
      const urlToOpenOnClick = matches[0];
      alert.action = this.platformSvc.getI18nString(this.Strings.Alert.Go);
      alert.actionCallback = () => {
        this.platformSvc.openUrl(urlToOpenOnClick);
      };
    }

    const text = `${(alert.title ? `${alert.title}. ${descriptionStripped}` : descriptionStripped).replace(
      /\.$/,
      ''
    )}.`;
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
      this.$exceptionHandler(new AndroidException('Failed to create snackbar'), errMessage);
    };

    // Ensure soft keyboard is hidden
    if (document.activeElement) {
      (document.activeElement as HTMLInputElement).blur();
    }

    // Display snackbar
    window.cordova.plugins.snackbar.create(text, 5000, bgColor, textColor, 3, alert.action, success, failure);
  }
}
