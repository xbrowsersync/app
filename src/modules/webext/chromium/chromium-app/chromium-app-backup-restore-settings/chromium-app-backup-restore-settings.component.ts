import { Component } from 'angular-ts-decorators';
import { WebExtAppBackupRestoreSettingsComponent } from '../../../webext-app/webext-app-backup-restore-settings/webext-app-backup-restore-settings.component';

@Component({
  controllerAs: 'vm',
  selector: 'backupRestoreSettings',
  styles: [require('../../../../app/app-settings/backup-restore-settings/backup-restore-settings.component.scss')],
  template: require('../../../../app/app-settings/backup-restore-settings/backup-restore-settings.component.html')
})
export class ChromiumAppBackupRestoreSettingsComponent extends WebExtAppBackupRestoreSettingsComponent {
  autoBackUpFormComplete(): void {
    super.autoBackUpFormComplete();
    this.displayAutoBackUpConfirmation = true;
    this.appHelperSvc.focusOnElement('.auto-backups-confirmation .focused');
  }
}
