import { Injectable } from 'angular-ts-decorators';
import { WorkingContext } from './working.enum';
import { WorkingStatus } from './working.interface';

@Injectable('WorkingService')
export class WorkingService {
  status: WorkingStatus;

  constructor() {
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
