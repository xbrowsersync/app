import angular from 'angular';
import { boundMethod } from 'autobind-decorator';
import { BackupRestoreSettingsComponent } from '../../../app/app-settings/backup-restore-settings/backup-restore-settings.component';
import { AutoBackUpSchedule } from '../../../shared/backup-restore/backup-restore.interface';
import { MessageCommand } from '../../../shared/global-shared.enum';
import { WebExtPlatformService } from '../../shared/webext-platform/webext-platform.service';
import { EnableAutoBackUpMessage } from '../../webext.interface';

interface AutoBackUpFormController extends ng.IFormController {
  autoBackUpAtHour: any;
  autoBackUpAtMinute: any;
  autoBackUpEveryNumber: any;
  autoBackUpEveryUnit: any;
}

export abstract class WebExtAppBackupRestoreSettingsComponent extends BackupRestoreSettingsComponent {
  platformSvc: WebExtPlatformService;

  autoBackUpAtHour: string;
  autoBackUpAtMinute: string;
  autoBackUpEveryNumber: string;
  autoBackUpEveryUnit: string;
  autoBackUpEnabled: boolean;
  autoBackUpForm: AutoBackUpFormController;
  autoBackUpHours: string[] = [
    '00',
    '01',
    '02',
    '03',
    '04',
    '05',
    '06',
    '07',
    '08',
    '09',
    '10',
    '11',
    '12',
    '13',
    '14',
    '15',
    '16',
    '17',
    '18',
    '19',
    '20',
    '21',
    '22',
    '23'
  ];
  autoBackUpMinutes: string[] = ['00', '05', '10', '15', '20', '25', '30', '35', '40', '45', '50', '55'];
  autoBackUpSchedule: AutoBackUpSchedule;

  autoBackUpFormComplete(): void {
    this.displayAutoBackUpForm = false;
  }

  @boundMethod
  confirmAutoBackUpForm(): void {
    this.displayAutoBackUpConfirmation = false;
    this.displayAutoBackUpForm = false;
  }

  @boundMethod
  hideAutoBackUpPanel(): void {
    this.displayAutoBackUpConfirmation = false;
    if (this.displayAutoBackUpForm) {
      this.autoBackUpEnabled = false;
      this.displayAutoBackUpForm = false;
    }
  }

  ngOnInit(): void {
    // Load auto back up schedule
    this.backupRestoreSvc.getSetAutoBackUpSchedule().then((autoBackUpSchedule) => {
      if (!angular.isUndefined(autoBackUpSchedule ?? undefined)) {
        this.autoBackUpSchedule = autoBackUpSchedule;
        this.autoBackUpEnabled = true;
      }
    });

    super.ngOnInit();
  }

  resetAutoBackUpForm(): void {
    this.autoBackUpForm.$setPristine();
    this.autoBackUpForm.$setUntouched();
    this.autoBackUpAtHour = '00';
    this.autoBackUpAtMinute = '00';
    this.autoBackUpEveryNumber = '1';
    this.autoBackUpEveryUnit = 'day';
  }

  @boundMethod
  submitAutoBackUpForm(): void {
    // Save the localised schedule display strings to the store
    this.autoBackUpSchedule = {
      autoBackUpNumber: this.autoBackUpForm.autoBackUpEveryNumber.$$element[0].selectedOptions[0].innerText,
      autoBackUpUnit: this.autoBackUpForm.autoBackUpEveryUnit.$$element[0].selectedOptions[0].innerText,
      autoBackUpHour: this.autoBackUpForm.autoBackUpAtHour.$$element[0].selectedOptions[0].innerText,
      autoBackUpMinute: this.autoBackUpForm.autoBackUpAtMinute.$$element[0].selectedOptions[0].innerText
    };

    // Enable auto back up using the actual values
    const message: EnableAutoBackUpMessage = {
      command: MessageCommand.EnableAutoBackUp,
      schedule: {
        autoBackUpNumber: this.autoBackUpEveryNumber,
        autoBackUpUnit: this.autoBackUpEveryUnit,
        autoBackUpHour: this.autoBackUpAtHour,
        autoBackUpMinute: this.autoBackUpAtMinute
      }
    };
    this.platformSvc
      .sendMessage(message)
      .then(() => this.backupRestoreSvc.getSetAutoBackUpSchedule(this.autoBackUpSchedule))
      .then(() => this.autoBackUpFormComplete());
  }

  @boundMethod
  toggleAutoBackUp(): void {
    this.autoBackUpEnabled = !this.autoBackUpEnabled;
    if (this.autoBackUpEnabled) {
      // Display auto back up form
      this.hideResetPanel();
      this.hideRestorePanel();
      this.resetAutoBackUpForm();
      this.displayAutoBackUpForm = true;
      this.appHelperSvc.focusOnElement('#autoBackUpForm .focused');
    } else {
      // Disable auto back up
      this.backupRestoreSvc.getSetAutoBackUpSchedule(null);
      this.platformSvc.sendMessage({ command: MessageCommand.DisableAutoBackUp });
      this.autoBackUpSchedule = undefined;
      this.hideAutoBackUpPanel();
    }
  }
}
