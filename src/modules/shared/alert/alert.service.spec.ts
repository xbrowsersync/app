import { Alert } from './alert.interface';
import { AlertService } from './alert.service';

describe('AlertService', () => {
  afterEach(() => jest.restoreAllMocks());

  test('clearCurrentAlert: Sets the currentAlert property to undefined', () => {
    const alertSvc = new AlertService();
    const testAlert: Alert = {
      message: 'TEST ALERT'
    };

    alertSvc.currentAlert = testAlert;
    alertSvc.clearCurrentAlert();

    expect(alertSvc.currentAlert).toStrictEqual(undefined);
  });
});
