/**
 * Author: Vadim Galatsky
 * Summary: This file does the Sequelize initialization.
 */
import * as log from "lambda-log";
import { ISequelizeConfig, Model, Sequelize } from "sequelize-typescript";
import { errorCode } from "./common/constants/error-codes";
import { SequelizeInitializationError } from "./common/objects/custom-errors";

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
    maxIdleTime: 10000,
    maxConnections: 1
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
        dbConfig = config;
        sequelize = new Sequelize(dbConfig);
      } catch (err) {
        log.error("Error creating sequelize connection: " + err.stack);
        throw new SequelizeInitializationError(errorCode.SequelizeError, "Error while initializing Sequelize");
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
