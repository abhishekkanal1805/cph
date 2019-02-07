import { Reference } from "../../common/reference";
import { ResourceMetadata } from "../../common/resourceMetadata";

class ConnectionDataResource {
  id: string;
  resourceType: string;
  from: Reference;
  type: string;
  status: string;
  requestExpirationDate: string;
  to: Reference;
  lastStatusChangeDateTime: string;
  meta: ResourceMetadata;
}

export { ConnectionDataResource };
