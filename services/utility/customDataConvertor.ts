export class CustomDataConvertor {
  public static extractRecordsFromRequest(request): any[] {
    if (!Array.isArray(request.entry)) {
      request = [request];
    } else {
      request = request.entry.map((entry) => entry.resource);
    }
    return request;
  }
}
