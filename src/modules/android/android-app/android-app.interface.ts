import { Alert } from '../../shared/alert/alert.interface';

export interface AndroidAlert extends Alert {
  action?: any;
  actionCallback?: () => any;
}
