import { Injectable } from 'angular-ts-decorators';
import { autobind } from 'core-decorators';
import { Alert } from './alert.interface';

@autobind
@Injectable('AlertService')
export default class AlertService {
  currentAlert: Alert;

  clearCurrentAlert(): void {
    this.currentAlert = null;
  }

  setCurrentAlert(alert: Alert): void {
    this.currentAlert = alert;
  }
}
