import { NgModule } from 'angular-ts-decorators';
import AppModule from '../../app/app.module';
import BookmarkIdMapperService from '../bookmark-id-mapper/bookmark-id-mapper.service';
import './webext-app.module.scss';

@NgModule({
  id: 'WebExtAppModule',
  imports: [AppModule],
  providers: [BookmarkIdMapperService]
})
export default class WebExtAppModule {}
