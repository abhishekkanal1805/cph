
Get: 
    getRecord() => 
    DO: 
        get(recordId : string, serviceModel, fetchSoftDeletedRecords?: boolean = false) :: Fetch record from DB using given Model. 
        Uses sequelize findOne()
        
     Dont: 
        It will not check if results.dataResource ? results.dataResource : results;
        will not have different error message to avoid confusion

    performUserAccessValidation() => 
        fetchUserProfileInformation(profileId, userProfileModel): return status, type and displayName.
    
    Utility.getUserIds => 
     convertObjectToArray(object) :: if already array, return it else convert to array and return. 
     getValuesForKey(recordArray[],key) :: return value array
     splitString(string, splitKey) :: reutrn splitted 
     dont change performUserValidation() for now as it has high dependency on connection right now // 

Post: 
    saveRecord() =>
    DO:
      Utility =>>   getResourceFromRequestJSON(jsonBody ) :: 
            provide array based resource. (If single resource then convert to array)--convert jsonBody.entry.resource -> jsonBody.resource array
      business Vali Utility =>>  checkSaveRequestForBusinessValidation(recordArray:[]) ==> Since they are just validation, i dont want to create multiple functions for it (just giving a wrapper), they can be sufficiently done even in service classes. (or do you want seperate function for each?)   
            throw error if array is empty
            throw error if array size != jsonBody.total
            if no of total records >500

      Utility =>>   findKeyValues(recordArray[],key) ::
            find key values from given array (Will not give unique)
        countRecords(id, serviceModel) :: Count number of records present for given id. {Will use count API} :: We can create separate function for generic count if needed. 
      Utility =>>   splitString(string, splitKey) :: string.split(splitkey) ==>     return {
          generateRecordMetadata(record)::  generate uuid and populate other meta fields  
          NO convertToModel//\\  
          save(recordArray, serviceModel) :: use sequelize bulk create 
          No line 146-149//\\                                                         resourceType: credentail[0],
    getUpdatedRecordAndIds =>  filterRecordsForSave(recordArray , displayKeymap)                                                                    id: credentail[1]
                            => fetchUserProfileDetails(profileId) => reutrn profile status, display names. 
                 what we are doing wrong:  const displayAttribute of config.data.displayFields :: each service has their unique displayfields so we shouldnt be checking for all display fields here
                  getUniqueIds, getUpdatedRecordAndIds                                                    };
    Dont: 
        It will not parse incoming request to JSON. If needed someone can you already available safeparse method for it. 
        We will be using es6 way instead of lodash way whereever possible
        We will not give small functions to check like deviceIds.length >1 
        No function to Remove null/0/false/undefined values from an array e.g. .filter(Boolean)
        No business error like device id length > 0 

Common utility: 
    performUserAccessValidation :: TODO :: in get, it just gets profile info of authorizer but that can be practioner??? so is that ok ? :: go to userprofile and fetch active or not + populate display
            :: createUserProfileAccessObject(userprofile)
    performMultiUserValidation :: TODO
    performUserValidation ::TODO

     what authorizer is doing -- check if anyone can access that lambda but is it user level or pool level?
