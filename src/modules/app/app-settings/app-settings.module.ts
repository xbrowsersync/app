import { NgModule } from 'angular-ts-decorators';
import { AboutSettingsComponent } from './about-settings/about-settings.component';
import { AppSettingsComponent } from './app-settings.component';
import { IssuesSettingsComponent } from './issues-settings/issues-settings.component';
import { PermissionsSettingsComponent } from './permissions-settings/permissions-settings.component';
import { PreferencesSettingsComponent } from './preferences-settings/preferences-settings.component';
import { AppQrComponent } from './qr-panel/qr-panel.component';
import { ApiXbrowsersyncServiceInfoComponent } from './sync-settings/api-xbrowsersync-service-info/api-xbrowsersync-service-info.component';
import { SyncSettingsComponent } from './sync-settings/sync-settings.component';

@NgModule({
  declarations: [
    AboutSettingsComponent,
    ApiXbrowsersyncServiceInfoComponent,
    AppQrComponent,
    AppSettingsComponent,
    IssuesSettingsComponent,
    PermissionsSettingsComponent,
    PreferencesSettingsComponent,
    SyncSettingsComponent
  ],
  id: 'AppSettingsModule'
})
export class AppSettingsModule {}
