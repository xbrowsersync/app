import AlertType from './alert-type.enum';

export default interface Alert {
  message: string;
  title?: string;
  type?: AlertType;
}
