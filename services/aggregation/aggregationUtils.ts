/*!
 * Copyright © 2019 Deloitte. All rights reserved.
 */

import * as log from "lambda-log";
import * as lodash from "lodash";
import * as moment from "moment";
export class AggregationUtils {
  static dateFormat: string = "YYYY-MM-DD";
  /**
   * Fucnction to group the day wise aggregations based on requested interval and type
   * @param dayAggregations : day aggregated records
   * @param operations : type of aggregation
   * @param period : start and end dates
   * @param interval : aggregation(daily or weekly)
   */
  public static getAggregationsByInterval(dayAggregations: any, operations: string[], period: any, interval: string): any {
    log.info("Entering AggregationUtils :: getAggregationsByInterval");
    lodash.each(dayAggregations, (item) => {
      item.count = Number(item.count);
      if (lodash.has(item, "sum")) {
        item.sum = Number(item.sum);
        item.avg = Number(item.avg);
      }
    });
    const groupedObservations = lodash.groupBy(dayAggregations, (o) => (o.componentcode ? o.componentcode.coding[0].code : o.code.coding[0].code));
    const result: any[] = [];
    for (const key of lodash.keysIn(groupedObservations)) {
      const group: any[] = groupedObservations[key];
      let record: any;
      if (group[0].componentcode) {
        record = { code: group[0].code, component: { code: group[0].componentcode } };
      } else {
        record = { code: group[0].code };
      }
      const metrics: any[] = [];
      if (interval === "week") {
        const intervals = this.getIntervalStartDates(period, interval);
        const groupedRecords = this.groupRecordsByInterval(group, intervals);
        if (lodash.has(group[0], "sum")) {
          // stats
          for (const weekStart of lodash.keysIn(groupedRecords)) {
            metrics.push(this.getWeeklyStats(groupedRecords[weekStart], weekStart, period.end));
          }
        } else {
          // histogram
          for (const weekStart of lodash.keysIn(groupedRecords)) {
            metrics.push(this.getWeeklyHistogram(groupedRecords[weekStart], weekStart, period.end));
          }
        }
      } else {
        if (lodash.has(group[0], "sum")) {
          // stats
          lodash.forEach(group, (element) => {
            const stats: any = { sum: element.sum, count: element.count, min: element.min, max: element.max, avg: element.avg };
            metrics.push({ aggregationDate: element.dt, element: "valueQuantity", stats });
          });
        } else {
          // histogram
          const dateGroups = lodash.groupBy(group, "dt");
          for (const date of lodash.keysIn(dateGroups)) {
            const histogram: any[] = [];
            lodash.forEach(dateGroups[date], (element) => {
              histogram.push({ valueQuantity: element.valuequantity, count: element.count });
            });
            metrics.push({ aggregationDate: date, element: "valueQuantity", histogram });
          }
        }
      }

      record.aggregations = metrics;
      result.push(record);
    }
    log.info("Exiting AggregationUtils :: getAggregationsByInterval");
    return result;
  }

  /**
   * Get the group start dates based on requested aggregations
   * @param period : start and end dates
   * @param interval : grouping interval
   */
  static getIntervalStartDates(period: any, interval: string): string[] {
    log.info("Entering AggregationUtils :: getIntervalStartDates");
    const intervals: string[] = [];
    const days: number = interval === "week" ? 7 : 1;
    let date: Date = moment(period.start, this.dateFormat).toDate();
    const endDate: Date = moment(period.end, this.dateFormat).toDate();
    do {
      intervals.push(moment(date).format(this.dateFormat));
      date = moment(date, this.dateFormat)
        .add(days, "days")
        .toDate();
    } while (date <= endDate);

    log.info("Entering AggregationUtils :: getIntervalStartDates");
    return intervals;
  }

  /**
   * split the list of records into groups based on the intervals
   * @param records : list of records to be grouped
   * @param intervals : list of generated intervals.
   */
  static groupRecordsByInterval(records: any[], intervals: string[]): any {
    log.info("Entering AggregationUtils :: groupRecordsByInterval");
    const groupedRecords = {};
    let intervalCount = 0;
    for (const interval of intervals) {
      log.info("interval:" + interval);
      const intervalRecords: any[] = lodash
        .map(records, (record) => {
          if (record.dt >= interval && record.dt < intervals[intervalCount + 1]) {
            return record;
          }
        })
        .filter(Boolean);
      if (intervalRecords && intervalRecords.length > 0) {
        groupedRecords[interval] = intervalRecords;
      }
      intervalCount++;
    }
    log.info("Entering AggregationUtils :: groupRecordsByInterval");
    return groupedRecords;
  }

  /**
   * Generate weekly aggreated values for non-component observations.
   * @param weekRecords List of weekly group records
   */
  static getWeeklyStats(weekRecords: any, start: string, end: string): object {
    log.info("Entering AggregationUtils :: getWeeklyStats");
    const weekEnd = moment(start)
      .add(6, "days")
      .format(this.dateFormat);
    const period: any = {
      start: moment(start).format(this.dateFormat),
      end: moment(weekEnd).isAfter(moment(end)) ? moment(end).format(this.dateFormat) : weekEnd
    };
    const daysReported: number = lodash.keys(lodash.groupBy(weekRecords, "dt")).length;
    const stats: any = {
      sum: lodash.sumBy(weekRecords, "sum"),
      count: lodash.sumBy(weekRecords, "count"),
      min: lodash.get(lodash.minBy(weekRecords, "min"), "min"),
      max: lodash.get(lodash.maxBy(weekRecords, "max"), "max"),
      avg: lodash.sumBy(weekRecords, "avg") / weekRecords.length
    };
    log.info("Entering AggregationUtils :: getWeeklyStats");
    return { aggregationPeriod: period, element: "valueQuantity", daysReported, stats };
  }

  /**
   * Generate weekly aggreated values for components based observations.
   * @param weekRecords List of weekly group records
   */
  public static getWeeklyHistogram(weekRecords: any, start: string, end: string): object {
    log.info("Entering AggregationUtils :: getWeeklyHistogram");
    const weekEnd = moment(start)
      .add(6, "days")
      .format(this.dateFormat);
    const period: any = {
      start: moment(start).format(this.dateFormat),
      end: moment(weekEnd).isAfter(moment(end)) ? moment(end).format(this.dateFormat) : weekEnd
    };

    const daysReported: number = lodash.keys(lodash.groupBy(weekRecords, "dt")).length;
    const valueQuantityGrp = lodash.groupBy(weekRecords, "valuequantity.value");
    const histogram = [];
    for (const keys of lodash.keysIn(valueQuantityGrp)) {
      const group = valueQuantityGrp[keys];
      histogram.push({ valueQuantity: group[0].valuequantity, count: lodash.sumBy(group, "count") });
    }

    log.info("Entering AggregationUtils :: getWeeklyHistogram");
    return { aggregationPeriod: period, element: "valueQuantity", daysReported, histogram };
  }
}
