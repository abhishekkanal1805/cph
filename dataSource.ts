/*!
 * Copyright © 2019 Deloitte. All rights reserved.
 */

import * as log from "lambda-log";
import { ISequelizeConfig, Model, Sequelize } from "sequelize-typescript";
import { errorCodeMap } from "./common/constants/error-codes-map";
import { InternalServerErrorResult } from "./common/objects/custom-errors";

const config = {
  dialect: process.env.rdsConnectionDialect,
  host: process.env.rdsConnectionHost,
  database: process.env.rdsConnectionDatabase,
  username: process.env.rdsConnectionUsername,
  password: process.env.rdsConnectionPassword,
  pool: {
    max: 10,
    min: 0,
    idle: 10000,
    acquire: 10000,
    maxIdleTime: 10000
  },
  dialectOptions: {
    requestTimeout: 500000,
    responseTimeout: 500000
  }
};

let dbConfig: ISequelizeConfig;
let sequelize: Sequelize;

class DataSource {
  /**
   * Initializes Sequelize
   * @returns {Sequelize>}
   */
  public static getDataSource(): Sequelize {
    log.info("Entering DataSource :: getDataSource()");
    if (!sequelize) {
      try {
        log.info(" ***** Creating a new Sequelize Connection - common");
        dbConfig = config;
        sequelize = new Sequelize(dbConfig);
      } catch (err) {
        log.error("Error creating sequelize connection: " + err.stack);
        throw new InternalServerErrorResult(errorCodeMap.InternalError.value, errorCodeMap.InternalError.description);
      }
    }
    log.info("Entering DataSource :: getDataSource()");
    return sequelize;
  }

  /**
   * Adds model to Sequelize
   * @returns {Sequelize>}
   */
  public static addModel(model: typeof Model): Sequelize {
    log.info("Entering DataSource :: addModel()");
    if (DataSource.getDataSource()) {
      sequelize.addModels([model]);
    } else {
      log.error("Sequelize not initialized, cannot addModel to datasource");
    }
    log.info("Exiting DataSource :: addModel()");
    return sequelize;
  }
}

export { DataSource };
