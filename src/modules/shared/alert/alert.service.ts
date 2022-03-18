import { Injectable } from 'angular-ts-decorators';
import { Alert } from './alert.interface';

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
