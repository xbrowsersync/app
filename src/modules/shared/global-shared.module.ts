import { NgModule } from 'angular-ts-decorators';
import AlertService from './alert/alert.service';
import ApiRequestInterceptorFactory from './api/api-request-interceptor/api-request-interceptor.factory';
import ApiXbrowsersyncService from './api/api-xbrowsersync/api-xbrowsersync.service';
import BackupRestoreService from './backup-restore/backup-restore.service';
import BookmarkService from './bookmark/bookmark.service';
import CryptoService from './crypto/crypto.service';
import ExceptionHandlerService from './exception/exception-handler.service';
import LogService from './log/log.service';
import NetworkService from './network/network.service';
import StoreService from './store/store.service';
import SyncModule from './sync/sync.module';
import UtilityService from './utility/utility.service';

@NgModule({
  id: 'GlobalSharedModule',
  imports: [SyncModule],
  providers: [
    AlertService,
    ApiRequestInterceptorFactory,
    BackupRestoreService,
    BookmarkService,
    CryptoService,
    ExceptionHandlerService,
    LogService,
    NetworkService,
    StoreService,
    UtilityService,
    ApiXbrowsersyncService
  ]
})
export default class GlobalSharedModule {}
