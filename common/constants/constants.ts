class Constants {
  public static readonly BUNDLE = "Bundle";
  public static readonly BUNDLE_TYPE = "searchset";
  public static readonly RESOURCE_TYPE = "resourceType";

  /* Cognito Constants */
  public static readonly COGNITO_USER_ATTRIBUTE_PROFILE_ID = "profile";

  public static readonly RESPONSE_TYPE_OK = "ok";
  public static readonly RESPONSE_TYPE_BAD_REQUEST = "badRequest";
  public static readonly UNPROCESSABLE_ENTITY = "unprocessableEntity";
  public static readonly RESPONSE_TYPE_INTERNAL_SERVER_ERROR = "internalServerError";
  public static readonly RESPONSE_TYPE_INSUFFICIENT_ACCOUNT_PERMISSIONS = "forbidden";
  public static readonly RESPONSE_TYPE_NOT_FOUND = "notFound";
  public static readonly RESPONSE_TYPE_UNAUTHORIZED = "unauthorized";

  public static readonly FETCH_LIMIT = 2000;
  public static readonly POST_LIMIT = 500;

  // TODO: Add other rsponse types here instead of coding them inside base service.

  // MEDICATION ACTIVITY CONSTANTS
  public static readonly MEDICATION_ACTIVITY = "Medication Activity";

  // Invitation Constants
  public static readonly INVITATION = {
    mailSubject: "Invitation to join MyHope",
    sender: "antshukla@deloitte.com",
    defaultMessage: "You have been invited to join MyHope. Use this invite code to register."
  };

  // Site specific consent
  public static readonly SITE_SPECIFIC_CONSENT = {
    siteConsent: "Consent",
    globalConsent: "GlobalConsent",
    emptyPlaceholder: "empty"
  };

  // CMS Parameters
  public static readonly CMS_PARAMS = {
    batchsource: "VV",
    successStatus: "Succesful",
    errorStatus: "Failed",
    inProgress: "In Progress",
    query:
      "SELECT id, name__v,tag_sample__c,format__v,filename__v,version_modified_date__v FROM documents where version_modified_date__v >",
    batchTable: "CmsBatch",
    metaTable: "Article",
    cmsBaseUrl: "https://sb-celgene-promomats-config-migr.veevavault.com",
    cmsUsername: "mhIntegration@sb-celgene.com",
    cmsPassword: "Mdxx123$",
    loginPath: "/api/v16.0/auth?username=mhIntegration@sb-celgene.com&password=Mdxx123$",
    queryPath: "/api/v16.0/query",
    downloaduri: "/api/v16.0/objects/documents/",
    accessKeyId: "AKIAIPW7BAP5KRMBXMYQ",
    secretAccessKey: "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",
    Bucket: "cloudfront-cms-content",
    emptyPlaceholder: "empty",
    defaultSite: -1
  };

  public static readonly ARTICLE_POPULARITY_FIELDS = [
    {
      key: "totalLikes",
      type: "number",
      map: "liked",
      incrementByValue: false,
      checkForValue: true
    },
    {
      key: "totalDislikes",
      type: "number",
      map: "disliked",
      incrementByValue: false,
      checkForValue: true
    },
    {
      key: "totalBookmarks",
      type: "number",
      map: "bookmarked",
      incrementByValue: false,
      checkForValue: true
    },
    {
      key: "totalReads",
      type: "number",
      map: "read",
      incrementByValue: false,
      checkForValue: true
    },
    {
      key: "numberOfRating",
      type: "number",
      map: "rating",
      incrementByValue: false
    },
    {
      key: "totalRating",
      type: "number",
      map: "rating",
      incrementByValue: true
    },
    {
      key: "ratingCounts",
      type: "object",
      props: [
        {
          key: "oneStar",
          type: "number",
          map: "rating",
          incrementByValue: false,
          checkForValue: 1
        },
        {
          key: "twoStar",
          type: "number",
          map: "rating",
          incrementByValue: false,
          checkForValue: 2
        },
        {
          key: "threeStar",
          type: "number",
          map: "rating",
          incrementByValue: false,
          checkForValue: 3
        },
        {
          key: "fourStar",
          type: "number",
          map: "rating",
          incrementByValue: false,
          checkForValue: 4
        },
        {
          key: "fiveStar",
          type: "number",
          map: "rating",
          incrementByValue: false,
          checkForValue: 5
        }
      ]
    }
  ];
  public static readonly UPDATE_ACTIVITY_FIELDS = [
    { key: "liked", type: "boolean", tsColumn: "likedTS" },
    { key: "disliked", type: "boolean", tsColumn: "dislikedTS" },
    { key: "bookmarked", type: "boolean", tsColumn: "bookmarkedTS" },
    { key: "rating", type: "number", tsColumn: "ratingTS" }
  ];
}

export { Constants };
