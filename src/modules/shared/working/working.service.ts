import { Injectable } from 'angular-ts-decorators';
import autobind from 'autobind-decorator';
import { WorkingContext } from './working.enum';
import { WorkingStatus } from './working.interface';

@autobind
@Injectable('WorkingService')
export default class WorkingService {
  status: WorkingStatus;

  constructor() {
    // Initialise status
    this.status = {
      activated: false
    };
  }

  hide(): void {
    this.status = {
      activated: false
    };
  }

  show(context?: WorkingContext): void {
    this.status = {
      activated: true,
      context
    };
  }
}
