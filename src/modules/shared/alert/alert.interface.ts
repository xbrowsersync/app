import { AlertType } from './alert.enum';

export interface Alert {
  message: string;
  title?: string;
  type?: AlertType;
}
