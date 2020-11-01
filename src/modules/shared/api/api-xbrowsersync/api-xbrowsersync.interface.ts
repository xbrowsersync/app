import { ApiServiceStatus } from '../api.enum';
import { ApiServiceInfoResponse } from '../api.interface';

export interface ApiXbrowsersyncErrorResponse {
  code: string;
  message: string;
}

export interface ApiXbrowsersyncServiceInfoResponse extends ApiServiceInfoResponse {
  maxSyncSize: number;
  message?: string;
  status: ApiServiceStatus;
  version: string;
}
