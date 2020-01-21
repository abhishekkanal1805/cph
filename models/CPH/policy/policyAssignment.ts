/*!
 * Copyright © 2019 Deloitte. All rights reserved.
 */

import {Column, DataType, Model, Table} from "sequelize-typescript";
import {PolicyAssignmentDataResource} from "./policyAssignmentDataResource";

/**
 * Internal table for managing policy assignments to a user
 * This will be updated every time a team member gets added/removed from study or site.
 * This will be created
 *
 * Adding PI give site level permissions too
 * 1 ----- userProfile/111 ----- Policy/studyPI ----- Study/111
 * 1b ----- userProfile/111 ----- Policy/b ----- Study/111 (QUESTION ---- is this allowed?)
 * 2 ----- userProfile/111 ----- Policy/studyPI ----- StudySite/111
 *
 * Adding CRA gives site level permissions only
 * 3 ----- userProfile/111 ----- Policy/siteCRA ----- StudySite/222
 * 4 ----- userProfile/222 ----- Policy/siteCRC ----- StudySite/222
 * 5 ----- userProfile/222 ----- Policy/siteCRC ----- StudySite/222
 */

@Table({ tableName: "PolicyAssignment" })
class PolicyAssignment extends Model<PolicyAssignment> {
    @Column({ type: DataType.UUID, primaryKey: true })
    id: string;

    @Column({ type: DataType.STRING, allowNull: false})
    principal: string;

    @Column({ type: DataType.STRING, allowNull: false})
    resourceScopeReference: string;

    @Column({ type: DataType.JSONB })
    dataResource: PolicyAssignmentDataResource;

}

export { PolicyAssignment };
