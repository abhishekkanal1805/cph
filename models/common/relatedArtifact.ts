import { Attachment } from "./attachment";

export class RelatedArtifact {
  type: string;
  label: string;
  display: string;
  citation: string;
  url: string;
  document: Attachment;
  resource: string;
}
