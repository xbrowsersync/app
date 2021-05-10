import { NgModule } from 'angular-ts-decorators';
import BookmarkSyncProviderService from './bookmark-sync-provider/bookmark-sync-provider.service';
import SyncService from './sync.service';

@NgModule({
  id: 'SyncModule',
  providers: [BookmarkSyncProviderService, SyncService]
})
export default class SyncModule {}
