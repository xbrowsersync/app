import './webext-app.module.scss';
import { NgModule } from 'angular-ts-decorators';
import AppModule from '../../app/app.module';
import BookmarkIdMapperService from '../bookmark-id-mapper/bookmark-id-mapper.service';

@NgModule({
  id: 'WebExtAppModule',
  imports: [AppModule],
  providers: [BookmarkIdMapperService]
})
export default class WebExtAppModule {}
