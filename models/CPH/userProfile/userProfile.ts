import { Column, DataType, Model, Table } from "sequelize-typescript";
import { FieldVisitor } from "../../../services/common/fieldVisitor";
import { Additional } from "../../common/additional";
import { Address } from "../../common/address";
import { ContactPoint } from "../../common/contactPoint";
import { HumanName } from "../../common/humanName";
import { Identifier } from "../../common/identifier";
import { Preference } from "../../common/preference";
import { ResourceMetadata } from "../../common/resourceMetadata";
import { UserProfileDataResource } from "./userProfileDataResource";

@Table({ tableName: "UserProfile" })
class UserProfile extends Model<UserProfile> {
  // all values below are case sensitive and values needs to be used as is
  static TYPE_PATIENT = "patient";
  static TYPE_PRACTITIONER = "practitioner";
  static STATUS_ACTIVE = "active";

  @Column({ type: DataType.UUID, primaryKey: true })
  id: string;

  @Column({ type: DataType.JSONB })
  meta: ResourceMetadata;

  @Column({ type: DataType.JSONB })
  dataResource: UserProfileDataResource;

  @Column({ type: DataType.STRING })
  resourceType: string;

  @Column({ type: DataType.STRING })
  email: string;

  @Column({ type: DataType.JSONB })
  name: HumanName;

  @Column({ type: DataType.STRING })
  race: string;

  @Column({ type: DataType.STRING })
  ethnicity: string;

  @Column({ type: DataType.STRING })
  gender: string;

  @Column({ type: DataType.STRING })
  birthDate: string;

  @Column({ type: DataType.STRING })
  status: string;

  @Column({ type: DataType.STRING })
  type: string;

  @Column({ type: DataType.JSONB })
  telecom: ContactPoint[];

  @Column({ type: DataType.JSONB })
  address: Address;

  @Column({ type: DataType.JSONB })
  preferences: Preference;

  @Column({ type: DataType.JSONB })
  identifier: Identifier[];

  @Column({ type: DataType.STRING })
  userCode: string;

  @Column({ type: DataType.STRING })
  npi: string;

  @Column({ type: DataType.STRING })
  dea: string;

  @Column({ type: DataType.JSONB })
  additionalAttributes: Additional[];

  /**
   * Returns true if the updated profile contains name different from this profile
   * @param updatedUserProfile
   * @returns {boolean}
   */
  public isNameUpdated(updatedUserProfile: any): boolean {
    return this.name.family !== updatedUserProfile.name.family || this.name.given[0] !== updatedUserProfile.name.given[0];
  }

  /**
   * Updates to email, type and status are currently not allowed.
   * This returns false if any of these attribute were different from existing record
   * @param updatedUserProfile
   * @param existingUserProfile
   * @returns boolean
   */
  public isProfileUpdateLegal(updatedUserProfile: any): boolean {
    return this.email === updatedUserProfile.email && this.status === updatedUserProfile.status && this.type === updatedUserProfile.type;
  }

  /**
   * returns a comma separated list of all itemId(s) that qere not unique.
   * If there was error performing the validation it returns error.
   * else it will return null
   * @returns {string}
   */
  public getDuplicateProfileItems(): string {
    // create a field visitor that gathers all fields with name itemId and
    // looks into descendants if present for name profileItem
    const fieldVisitor: FieldVisitor = new FieldVisitor("itemId", "profileItem");
    fieldVisitor.visitAll(this.additionalAttributes);
    return fieldVisitor.error || fieldVisitor.getAllDuplicatesAsString();
  }

  public getSmsContactPoint(): string {
    // TODO: implement this
    return null;
  }

  /**
   * Determines if the user has enabled any/all notification at a high level
   * @param {string} profileId
   */
  public areNotificationsEnabled(): boolean {
    return this.preferences && this.preferences.notification && this.preferences.notification.enableNotification;
  }

  /**
   * Determines if the notifications in this category are enabled for the user
   * @param {string} profileId
   */
  public isNotificationCategoryEnabled(notificationCategory: string): boolean {
    if (this.areNotificationsEnabled() && this.preferences.notification.settings && this.preferences.notification.settings.length > 0) {
      for (const thisSetting of this.preferences.notification.settings) {
        if (thisSetting.category === notificationCategory) {
          return thisSetting.enabled;
        }
      }
    }
    return false;
  }

  /**
   * Returns an array of all the notification channels allowed for the provided category
   * If notifications are disabled or if the settings are not present or empty return empty array
   *
   * @param {string} profileId
   * @param {string} notificationCategory
   */
  public getAllowedNotificationChannels(notificationCategory: string): string[] {
    const allowedChannels: string[] = [];
    // if notifications are disabled or if the settings are not present or empty return empty array
    if (!this.areNotificationsEnabled() || !this.preferences.notification.settings || this.preferences.notification.settings.length < 1) {
      return allowedChannels;
    }
    for (const thisSetting of this.preferences.notification.settings) {
      if (thisSetting.category === notificationCategory && thisSetting.enabled) {
        for (const thisChannel of thisSetting.channel) {
          if (thisChannel.enabled) {
            allowedChannels.push(thisChannel.type);
          }
        }
      }
    }
    return allowedChannels;
  }
}

export { UserProfile };
