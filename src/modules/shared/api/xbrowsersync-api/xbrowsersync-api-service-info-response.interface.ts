import ApiServiceInfoResponse from '../api-service-info-response.interface';
import ApiServiceStatus from '../api-service-status.enum';

export default interface XbrowsersyncApiServiceInfoResponse extends ApiServiceInfoResponse {
  maxSyncSize: number;
  message?: string;
  status: ApiServiceStatus;
  version: string;
}
