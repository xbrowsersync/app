import { NgModule } from 'angular-ts-decorators';
import AppModule from '../../app/app.module';
import AppBookmarkComponent from '../../app/app-bookmark/app-bookmark.component';
import WebExtSharedModule from '../shared/webext-shared.module';
import WebExtAppComponent from './webext-app.component';
import WebExtAppAlertComponent from './webext-app-alert/webext-app-alert.component';
import WebExtAppSearchComponent from './webext-app-search/webext-app-search.component';
import WebExtAppWorkingComponent from './webext-app-working/webext-app-working.component';

@NgModule({
  declarations: [
    AppBookmarkComponent,
    WebExtAppAlertComponent,
    WebExtAppComponent,
    WebExtAppSearchComponent,
    WebExtAppWorkingComponent
  ],
  id: 'WebExtAppModule',
  imports: [AppModule, WebExtSharedModule]
})
export default class WebExtAppModule {}
