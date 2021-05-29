import { Injectable } from 'angular-ts-decorators';
import autobind from 'autobind-decorator';
import { Alert } from './alert.interface';

@autobind
@Injectable('AlertService')
export class AlertService {
  currentAlert: Alert | undefined;

  clearCurrentAlert(): void {
    this.currentAlert = undefined;
  }

  setCurrentAlert(alert: Alert): void {
    this.currentAlert = alert;
  }
}
