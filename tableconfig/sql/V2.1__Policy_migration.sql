drop table "Policy";

CREATE TABLE public."Policy"
(
  id varchar(255) NOT NULL PRIMARY KEY,
  status varchar(255) NOT NULL,
  name varchar(255) NOT NULL,
  effect varchar(255) NOT NULL,
  "dataResource" jsonb
);

CREATE UNIQUE INDEX index_policy_id ON public."Policy" USING btree (id);
CREATE INDEX index_policy_status ON public."Policy" USING btree (status);
CREATE INDEX index_policy_name ON public."Policy" USING btree (name);
CREATE INDEX index_policy_effect ON public."Policy" USING btree (effect);
CREATE INDEX index_policy_action ON public."Policy" USING gin (("dataResource" -> 'action'));
CREATE INDEX index_policy_clientRequestId ON public."Policy" USING gin (("dataResource" -> 'meta' -> 'clientRequestId'::text));
CREATE INDEX index_policy_isDeleted ON public."Policy" USING gin (("dataResource" -> 'meta' -> 'isDeleted'::text));
CREATE INDEX index_policy_lastUpdated ON public."Policy" USING gin (("dataResource" -> 'meta' -> 'lastUpdated'::text));
