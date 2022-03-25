import { Injectable } from 'angular-ts-decorators';
import { Alert } from './alert.interface';

@Injectable('AlertService')
export class AlertService {
  private _currentAlert: Alert | undefined;
  private _currentMessage: string;

  get currentAlert(): Alert | undefined {
    return this._currentAlert;
  }

  set currentAlert(value: Alert) {
    this._currentAlert = value;
  }

  get currentMessage(): string {
    return this._currentMessage;
  }

  set currentMessage(value: string) {
    this._currentMessage = value;
  }

  clearCurrentAlert(): void {
    this.currentAlert = undefined;
  }
}
