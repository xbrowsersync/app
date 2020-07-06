import { NgModule } from 'angular-ts-decorators';
import AlertService from './alert/alert.service';
import ApiRequestInterceptorFactory from './api/api-request-interceptor.factory';
import XbrowsersyncApiService from './api/xbrowsersync-api/xbrowsersync-api.service';
import BackupRestoreService from './backup-restore/backup-restore.service';
import BookmarkService from './bookmark/bookmark.service';
import CryptoService from './crypto/crypto.service';
import ExceptionHandlerService from './exceptions/exception-handler.service';
import LogService from './log/log.service';
import NetworkService from './network/network.service';
import StoreService from './store/store.service';
import UtilityService from './utility/utility.service';

@NgModule({
  id: 'GlobalSharedModule',
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
    XbrowsersyncApiService
  ]
})
export default class GlobalSharedModule {}
