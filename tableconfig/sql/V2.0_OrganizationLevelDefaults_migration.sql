-- DROP TABLE public."OrganizationLevelDefaults";

CREATE TABLE public."OrganizationLevelDefaults" (
	id varchar(255) NOT NULL,
	"resourceType" varchar(255) NULL,
	"accessType" varchar(255) NULL,
	meta jsonb NULL,
	CONSTRAINT "OrganizationLevelDefaults_pkey" PRIMARY KEY (id)
);

CREATE UNIQUE INDEX index_organization_level_defaults_id ON public."OrganizationLevelDefaults" USING btree (id);
CREATE INDEX index_organization_level_defaults_resourceType ON public."OrganizationLevelDefaults" USING btree ("resourceType");
