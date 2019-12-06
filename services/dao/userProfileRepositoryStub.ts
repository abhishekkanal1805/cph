/*!
 * Copyright © 2019 Deloitte. All rights reserved.
 */

import { Constants } from "../../common/constants/constants";

export class UserProfileRepositoryStub {
  public static readonly ACTIVE_PATIENT_USER_PROFILES: any[] = [
    { id: "1", status: Constants.ACTIVE, type: Constants.PATIENT_USER, name: { given: ["Sandor"], family: "Clegane" } },
    { id: "2", status: Constants.ACTIVE, type: Constants.PATIENT_USER, name: { given: ["Bran"], family: "Stark" } }
  ];

  public static readonly INACTIVE_PATIENT_USER_PROFILES: any[] = [
    { id: "101", status: Constants.INACTIVE, type: "patient", name: { given: ["Gregor"], family: "Clegane" } }
  ];

  public static readonly ACTIVE_PRACTITIONER_USER_PROFILES: any[] = [
    { id: "201", status: Constants.ACTIVE, type: Constants.PRACTITIONER_USER, name: { given: ["Tyrion"], family: "Lannister" } },
    { id: "202", status: Constants.ACTIVE, type: Constants.PRACTITIONER_USER, name: { given: ["Jon"], family: "Snow" } }
  ];

  public static readonly INACTIVE_PRACTITIONER_USER_PROFILES: any[] = [
    { id: "302", status: Constants.INACTIVE, type: Constants.PRACTITIONER_USER, name: { given: ["Joffrey"], family: "Baratheon" } }
  ];

  public static readonly ACTIVE_SYSTEM_USER_PROFILES: any[] = [
    { id: "401", status: Constants.ACTIVE, type: Constants.SYSTEM_USER, name: { given: ["Arya"], family: "Stark" } },
    { id: "402", status: Constants.ACTIVE, type: Constants.SYSTEM_USER, name: { given: ["Danny"], family: "Targaryen" } }
  ];

  public static readonly INACTIVE_SYSTEM_USER_PROFILES: any[] = [
    { id: "501", status: Constants.INACTIVE, type: Constants.SYSTEM_USER, name: { given: ["White"], family: "King" } }
  ];

  public static readonly ACTIVE_CAREPARTNER_USER_PROFILES: any[] = [
    { id: "501", status: Constants.ACTIVE, type: Constants.CAREPARTNER_USER, name: { given: ["Jamie"], family: "Lannister" } },
    { id: "502", status: Constants.ACTIVE, type: Constants.CAREPARTNER_USER, name: { given: ["Jorah"], family: "Mormont" } }
  ];
}
