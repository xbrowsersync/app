import { NgModule } from 'angular-ts-decorators';
import AlertService from './alert/alert.service';
import ApiService from './api/api.service';
import ApiRequestInterceptorFactory from './api/api-request-interceptor.factory';
import BookmarkService from './bookmark/bookmark.service';
import ExceptionHandlerService from './exceptions/exception-handler.service';
import LogService from './log/log.service';
import StoreService from './store/store.service';
import UtilityService from './utility/utility.service';

@NgModule({
  id: 'GlobalSharedModule',
  providers: [
    AlertService,
    ApiRequestInterceptorFactory,
    ApiService,
    BookmarkService,
    ExceptionHandlerService,
    LogService,
    StoreService,
    UtilityService
  ]
})
export default class GlobalSharedModule {}
