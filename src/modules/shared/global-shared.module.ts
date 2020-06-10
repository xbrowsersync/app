import { NgModule } from 'angular-ts-decorators';
import ApiService from './api.service';
import BookmarkService from './bookmark.service';
import StoreService from './store.service';
import UtilityService from './utility.service';
import ApiRequestInterceptorFactory from './api-request-interceptor.factory';

@NgModule({
  id: 'GlobalSharedModule',
  providers: [ApiRequestInterceptorFactory, ApiService, BookmarkService, StoreService, UtilityService]
})
export default class GlobalSharedModule {}
