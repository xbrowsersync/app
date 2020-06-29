import { autobind } from 'core-decorators';
import { Injectable } from 'angular-ts-decorators';
import Alert from './alert.interface';

@autobind
@Injectable('AlertService')
export default class AlertService {
  currentAlert: Alert;

  clearCurrentAlert() {
    this.currentAlert = null;
  }

  setCurrentAlert(alert: Alert) {
    this.currentAlert = alert;
  }
}
