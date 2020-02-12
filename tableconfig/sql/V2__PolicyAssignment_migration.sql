
CREATE TABLE public."PolicyAssignment"
(
  id varchar(255) NOT NULL PRIMARY KEY,
  principal varchar(255),
  "resourceScopeReference" varchar(255),
  "dataResource" jsonb
);

CREATE UNIQUE INDEX index_policy_assignment_id ON public."PolicyAssignment" USING btree (id);
CREATE INDEX index_policy_assignment_principal ON public."PolicyAssignment" USING btree (principal);
CREATE INDEX index_policy_assignment_resourceScopeReference ON public."PolicyAssignment" USING btree ("resourceScopeReference");
CREATE INDEX index_policy_assignment_clientRequestId ON public."Policy" USING gin (("dataResource" -> 'meta' -> 'clientRequestId'::text));
CREATE INDEX index_policy_assignment_isDeleted ON public."Policy" USING gin (("dataResource" -> 'meta' -> 'isDeleted'::text));
CREATE INDEX index_policy_assignment_lastUpdated ON public."Policy" USING gin (("dataResource" -> 'meta' -> 'lastUpdated'::text));
