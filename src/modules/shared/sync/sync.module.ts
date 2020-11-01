import { NgModule } from 'angular-ts-decorators';
import BookmarkSyncProviderService from './bookmark-sync-provider/bookmark-sync-provider.service';
import SyncEngineService from './sync-engine/sync-engine.service';

@NgModule({
  id: 'SyncModule',
  providers: [BookmarkSyncProviderService, SyncEngineService]
})
export default class SyncModule {}
