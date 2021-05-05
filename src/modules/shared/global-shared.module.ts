import { NgModule } from 'angular-ts-decorators';
import AlertService from './alert/alert.service';
import ApiRequestInterceptorFactory from './api/api-request-interceptor/api-request-interceptor.factory';
import ApiXbrowsersyncService from './api/api-xbrowsersync/api-xbrowsersync.service';
import BackupRestoreService from './backup-restore/backup-restore.service';
import BookmarkHelperService from './bookmark/bookmark-helper/bookmark-helper.service';
import CryptoService from './crypto/crypto.service';
import ExceptionHandlerService from './exception/exception-handler/exception-handler.service';
import LogService from './log/log.service';
import MetadataService from './metadata/metadata.service';
import NetworkService from './network/network.service';
import SettingsService from './settings/settings.service';
import SyncModule from './sync/sync.module';
import UpgradeService from './upgrade/upgrade.service';
import UtilityService from './utility/utility.service';
import WorkingService from './working/working.service';

@NgModule({
  id: 'GlobalSharedModule',
  imports: [SyncModule],
  providers: [
    AlertService,
    ApiRequestInterceptorFactory,
    ApiXbrowsersyncService,
    BackupRestoreService,
    BookmarkHelperService,
    CryptoService,
    ExceptionHandlerService,
    LogService,
    MetadataService,
    NetworkService,
    SettingsService,
    UpgradeService,
    UtilityService,
    WorkingService
  ]
})
export default class GlobalSharedModule {}
