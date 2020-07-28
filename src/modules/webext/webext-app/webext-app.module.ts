import { NgModule } from 'angular-ts-decorators';
import AppModule from '../../app/app.module';
import BookmarkIdMapperService from '../bookmark-id-mapper/bookmark-id-mapper.service';
import WebExtAppAlertComponent from './webext-app-alert/webext-app-alert.component';

@NgModule({
  declarations: [WebExtAppAlertComponent],
  id: 'WebExtAppModule',
  imports: [AppModule],
  providers: [BookmarkIdMapperService]
})
export default class WebExtAppModule {}
