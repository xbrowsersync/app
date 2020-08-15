import { NgModule } from 'angular-ts-decorators';
import AboutSettingsComponent from './about-settings/about-settings.component';
import AppSettingsComponent from './app-settings.component';
import BackupRestoreSettingsComponent from './backup-restore-settings/backup-restore-settings.component';
import IssuesSettingsComponent from './issues-settings/issues-settings.component';
import PermissionsSettingsComponent from './permissions-settings/permissions-settings.component';
import PreferencesSettingsComponent from './preferences-settings/preferences-settings.component';
import AppQrComponent from './qr-panel/qr-panel.component';
import SyncSettingsComponent from './sync-settings/sync-settings.component';

@NgModule({
  declarations: [
    AboutSettingsComponent,
    AppQrComponent,
    AppSettingsComponent,
    BackupRestoreSettingsComponent,
    IssuesSettingsComponent,
    PermissionsSettingsComponent,
    PreferencesSettingsComponent,
    SyncSettingsComponent
  ],
  id: 'AppSettingsModule'
})
export default class AppSettingsModule {}
