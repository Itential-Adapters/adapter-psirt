/* @copyright Itential, LLC 2019 (pre-modifications) */

/* eslint import/no-dynamic-require: warn */
/* eslint object-curly-newline: warn */
/* eslint no-underscore-dangle: warn  */
/* eslint camelcase: warn  */

// Set globals
/* global log */

/* Required libraries.  */
const path = require('path');
// const xmldom = require('xmldom');

/* Fetch in the other needed components for the this Adaptor */
const AdapterBaseCl = require(path.join(__dirname, 'adapterBase.js'));


/**
 * This is the adapter/interface into Psirt
 */

/* GENERAL ADAPTER FUNCTIONS */
class Psirt extends AdapterBaseCl {
  /**
   * Psirt Adapter
   * @constructor
  constructor(prongid, properties) {
    // Instantiate the AdapterBase super class
    super(prongid, properties);

    // Uncomment if you have things to add to the constructor like using your own properties.
    // Otherwise the constructor in the adapterBase will be used.
    // Capture my own properties - they need to be defined in propertiesSchema.json
    if (this.allProps && this.allProps.myownproperty) {
      mypropvariable = this.allProps.myownproperty;
    }
  }
  */


  /**
   * @callback healthCallback
   * @param {Object} result - the result of the get request (contains an id and a status)
   */
  /**
   * @callback getCallback
   * @param {Object} result - the result of the get request (entity/ies)
   * @param {String} error - any error that occurred
   */
  /**
   * @callback createCallback
   * @param {Object} item - the newly created entity
   * @param {String} error - any error that occurred
   */
  /**
   * @callback updateCallback
   * @param {String} status - the status of the update action
   * @param {String} error - any error that occurred
   */
  /**
   * @callback deleteCallback
   * @param {String} status - the status of the delete action
   * @param {String} error - any error that occurred
   */

  /**
   * @summary Determines if this adapter supports the specific entity
   *
   * @function hasEntity
   * @param {String} entityType - the entity type to check for
   * @param {String/Array} entityId - the specific entity we are looking for
   *
   * @param {Callback} callback - An array of whether the adapter can has the
   *                              desired capability or an error
   */
  hasEntity(entityType, entityId, callback) {
    const origin = `${this.id}-adapter-hasEntity`;
    log.trace(origin);

    // Make the call -
    // verifyCapability(entityType, actionType, entityId, callback)
    return this.verifyCapability(entityType, null, entityId, callback);
  }

  /**
   * @summary Provides a way for the adapter to tell north bound integrations
   * whether the adapter supports type, action and specific entity
   *
   * @function verifyCapability
   * @param {String} entityType - the entity type to check for
   * @param {String} actionType - the action type to check for
   * @param {String/Array} entityId - the specific entity we are looking for
   *
   * @param {Callback} callback - An array of whether the adapter can has the
   *                              desired capability or an error
   */
  verifyCapability(entityType, actionType, entityId, callback) {
    const meth = 'adapterBase-verifyCapability';
    const origin = `${this.id}-${meth}`;
    log.trace(origin);

    // if caching
    if (this.caching) {
      // Make the call - verifyCapability(entityType, actionType, entityId, callback)
      return this.requestHandlerInst.verifyCapability(entityType, actionType, entityId, (results, error) => {
        if (error) {
          return callback(null, error);
        }

        // if the cache needs to be updated, update and try again
        if (results && results[0] === 'needupdate') {
          switch (entityType) {
            case 'template_entity': {
              // if the cache is invalid, update the cache
              return this.getEntities(null, null, null, null, (data, err) => {
                if (err) {
                  const errorObj = this.requestHandlerInst.formatErrorObject(this.id, meth, 'Could not update entity: $VARIABLE$, cache', [entityType], null, null, null);
                  log.error(`${origin}: ${errorObj.IAPerror.displayString}`);
                  return callback(null, errorObj);
                }

                // need to check the cache again since it has been updated
                return this.requestHandlerInst.verifyCapability(entityType, actionType, entityId, (vcapable, verror) => {
                  if (verror) {
                    return callback(null, verror);
                  }

                  return this.capabilityResults(vcapable, callback);
                });
              });
            }
            default: {
              // unsupported entity type
              const result = [false];

              // put false in array for all entities
              if (Array.isArray(entityId)) {
                for (let e = 1; e < entityId.length; e += 1) {
                  result.push(false);
                }
              }

              return callback(result);
            }
          }
        }

        // return the results
        return this.capabilityResults(results, callback);
      });
    }

    // if no entity id
    if (!entityId) {
      // need to check the cache again since it has been updated
      return this.requestHandlerInst.verifyCapability(entityType, actionType, null, (vcapable, verror) => {
        if (verror) {
          return callback(null, verror);
        }

        return this.capabilityResults(vcapable, callback);
      });
    }

    // if not caching
    switch (entityType) {
      case 'template_entity': {
        // need to get the entities to check
        return this.getEntities(null, null, null, null, (data, err) => {
          if (err) {
            const errorObj = this.requestHandlerInst.formatErrorObject(this.id, meth, 'Could not update entity: $VARIABLE$, cache', [entityType], null, null, null);
            log.error(`${origin}: ${errorObj.IAPerror.displayString}`);
            return callback(null, errorObj);
          }

          // need to check the cache again since it has been updated
          return this.requestHandlerInst.verifyCapability(entityType, actionType, null, (vcapable, verror) => {
            if (verror) {
              return callback(null, verror);
            }

            // is the entity in the list?
            const isEntity = this.entityInList(entityId, data.response, callback);
            const res = [];

            // not found
            for (let i = 0; i < isEntity.length; i += 1) {
              if (vcapable) {
                res.push(isEntity[i]);
              } else {
                res.push(false);
              }
            }

            return callback(res);
          });
        });
      }
      default: {
        // unsupported entity type
        const result = [false];

        // put false in array for all entities
        if (Array.isArray(entityId)) {
          for (let e = 1; e < entityId.length; e += 1) {
            result.push(false);
          }
        }

        return callback(result);
      }
    }
  }

  /**
   * @summary Updates the cache for all entities by call the get All entity method
   *
   * @function updateEntityCache
   *
   */
  updateEntityCache() {
    const origin = `${this.id}-adapter-updateEntityCache`;
    log.trace(origin);

    if (this.caching) {
      // if the cache is invalid, update the cache
      this.getEntities(null, null, null, null, (data, err) => {
        if (err) {
          log.trace(`${origin}: Could not load template_entity into cache - ${err}`);
        }
      });
    }
  }

  /**
   * @summary Obtain all security advisories.
   *
   * @function getAllAdvisories
   * @param {getCallback} callback - a callback function to return the result
   */
  /* YOU CAN CHANGE THE PARAMETERS YOU TAKE IN HERE AND IN THE pronghorn.json FILE */
  getAllAdvisories(callback) {
    const meth = 'adapter-getAllAdvisories';
    const origin = `${this.id}-${meth}`;
    log.trace(origin);

    /* HERE IS WHERE YOU VALIDATE DATA */

    /* HERE IS WHERE YOU SET THE DATA TO PASS INTO REQUEST */
    // set up the request object - payload, uriPathVars, uriQuery, uriOptions, addlHeaders

    const reqObj = null;

    try {
      // Make the call -
      // identifyRequest(entity, action, requestObj, returnDataFlag, callback)
      return this.requestHandlerInst.identifyRequest('All', 'getAllAdvisories', reqObj, true, (irReturnData, irReturnError) => {
        // if we received an error or their is no response on the results
        // return an error
        if (irReturnError) {
          /* HERE IS WHERE YOU CAN ALTER THE ERROR MESSAGE */
          return callback(null, irReturnError);
        }
        if (!Object.hasOwnProperty.call(irReturnData, 'response')) {
          const errorObj = this.requestHandlerInst.formatErrorObject(this.id, meth, 'Invalid Response', ['getAllAdvisories'], null, null, null);
          log.error(`${origin}: ${errorObj.IAPerror.displayString}`);
          return callback(null, errorObj);
        }

        /* HERE IS WHERE YOU CAN ALTER THE RETURN DATA */
        // return the response
        return callback(irReturnData, null);
      });
    } catch (ex) {
      const errorObj = this.requestHandlerInst.formatErrorObject(this.id, meth, 'Caught Exception', null, null, null, ex);
      log.error(`${origin}: ${errorObj.IAPerror.displayString}`);
      return callback(null, errorObj);
    }
  }

  /**
   * @summary Obtain an advisory using a given Common Vulnerability Enumerator (CVE).
   *
   * @function getAdvisoryByCveId
   * @param {string} cveId - CVE Identifier (i.e., CVE-YYYY-NNNN)
   * @param {getCallback} callback - a callback function to return the result
   */
  /* YOU CAN CHANGE THE PARAMETERS YOU TAKE IN HERE AND IN THE pronghorn.json FILE */
  getAdvisoryByCveId(cveId, callback) {
    const meth = 'adapter-getAdvisoryByCveId';
    const origin = `${this.id}-${meth}`;
    log.trace(origin);

    /* HERE IS WHERE YOU VALIDATE DATA */
    if (!cveId) {
      const errorObj = this.requestHandlerInst.formatErrorObject(this.id, meth, 'Missing Data', ['cveId'], null, null, null);
      log.error(`${origin}: ${errorObj.IAPerror.displayString}`);
      return callback(null, errorObj);
    }

    /* HERE IS WHERE YOU SET THE DATA TO PASS INTO REQUEST */
    // set up the request object - payload, uriPathVars, uriQuery, uriOptions, addlHeaders

    const queryParamsAvailable = {};
    const queryParams = {};
    const pathVars = [cveId];
    const bodyVars = {};

    // loop in template. long callback arg name to avoid identifier conflicts
    Object.keys(queryParamsAvailable).forEach((thisKeyInQueryParamsAvailable) => {
      if (queryParamsAvailable[thisKeyInQueryParamsAvailable]) {
        queryParams[thisKeyInQueryParamsAvailable] = queryParamsAvailable[thisKeyInQueryParamsAvailable];
      }
    });


    const reqObj = {
      payload: bodyVars,
      uriPathVars: pathVars,
      uriQuery: queryParams
    };


    try {
      // Make the call -
      // identifyRequest(entity, action, requestObj, returnDataFlag, callback)
      return this.requestHandlerInst.identifyRequest('Cve', 'getAdvisoryByCveId', reqObj, true, (irReturnData, irReturnError) => {
        // if we received an error or their is no response on the results
        // return an error
        if (irReturnError) {
          /* HERE IS WHERE YOU CAN ALTER THE ERROR MESSAGE */
          return callback(null, irReturnError);
        }
        if (!Object.hasOwnProperty.call(irReturnData, 'response')) {
          const errorObj = this.requestHandlerInst.formatErrorObject(this.id, meth, 'Invalid Response', ['getAdvisoryByCveId'], null, null, null);
          log.error(`${origin}: ${errorObj.IAPerror.displayString}`);
          return callback(null, errorObj);
        }

        /* HERE IS WHERE YOU CAN ALTER THE RETURN DATA */
        // return the response
        return callback(irReturnData, null);
      });
    } catch (ex) {
      const errorObj = this.requestHandlerInst.formatErrorObject(this.id, meth, 'Caught Exception', null, null, null, ex);
      log.error(`${origin}: ${errorObj.IAPerror.displayString}`);
      return callback(null, errorObj);
    }
  }

  /**
   * @summary Obtain an advisory given its advisory ID.
   *
   * @function getAdvisoryByAdvisoryId
   * @param {string} advisoryId - advisory ID
   * @param {getCallback} callback - a callback function to return the result
   */
  /* YOU CAN CHANGE THE PARAMETERS YOU TAKE IN HERE AND IN THE pronghorn.json FILE */
  getAdvisoryByAdvisoryId(advisoryId, callback) {
    const meth = 'adapter-getAdvisoryByAdvisoryId';
    const origin = `${this.id}-${meth}`;
    log.trace(origin);

    /* HERE IS WHERE YOU VALIDATE DATA */
    if (!advisoryId) {
      const errorObj = this.requestHandlerInst.formatErrorObject(this.id, meth, 'Missing Data', ['advisoryId'], null, null, null);
      log.error(`${origin}: ${errorObj.IAPerror.displayString}`);
      return callback(null, errorObj);
    }

    /* HERE IS WHERE YOU SET THE DATA TO PASS INTO REQUEST */
    // set up the request object - payload, uriPathVars, uriQuery, uriOptions, addlHeaders

    const queryParamsAvailable = {};
    const queryParams = {};
    const pathVars = [advisoryId];
    const bodyVars = {};

    // loop in template. long callback arg name to avoid identifier conflicts
    Object.keys(queryParamsAvailable).forEach((thisKeyInQueryParamsAvailable) => {
      if (queryParamsAvailable[thisKeyInQueryParamsAvailable]) {
        queryParams[thisKeyInQueryParamsAvailable] = queryParamsAvailable[thisKeyInQueryParamsAvailable];
      }
    });


    const reqObj = {
      payload: bodyVars,
      uriPathVars: pathVars,
      uriQuery: queryParams
    };


    try {
      // Make the call -
      // identifyRequest(entity, action, requestObj, returnDataFlag, callback)
      return this.requestHandlerInst.identifyRequest('Advisory', 'getAdvisoryByAdvisoryId', reqObj, true, (irReturnData, irReturnError) => {
        // if we received an error or their is no response on the results
        // return an error
        if (irReturnError) {
          /* HERE IS WHERE YOU CAN ALTER THE ERROR MESSAGE */
          return callback(null, irReturnError);
        }
        if (!Object.hasOwnProperty.call(irReturnData, 'response')) {
          const errorObj = this.requestHandlerInst.formatErrorObject(this.id, meth, 'Invalid Response', ['getAdvisoryByAdvisoryId'], null, null, null);
          log.error(`${origin}: ${errorObj.IAPerror.displayString}`);
          return callback(null, errorObj);
        }

        /* HERE IS WHERE YOU CAN ALTER THE RETURN DATA */
        // return the response
        return callback(irReturnData, null);
      });
    } catch (ex) {
      const errorObj = this.requestHandlerInst.formatErrorObject(this.id, meth, 'Caught Exception', null, null, null, ex);
      log.error(`${origin}: ${errorObj.IAPerror.displayString}`);
      return callback(null, errorObj);
    }
  }

  /**
   * @summary Used to obtain all security advisories for a given security impact rating (critical, high, medium, or low).
   *
   * @function getAdvisoryBySeverity
   * @param {string} severity - Critical, High, Medium, Low
   * @param {getCallback} callback - a callback function to return the result
   */
  /* YOU CAN CHANGE THE PARAMETERS YOU TAKE IN HERE AND IN THE pronghorn.json FILE */
  getAdvisoryBySeverity(severity = 'critical', callback) {
    const meth = 'adapter-getAdvisoryBySeverity';
    const origin = `${this.id}-${meth}`;
    log.trace(origin);

    /* HERE IS WHERE YOU VALIDATE DATA */
    if (!severity) {
      const errorObj = this.requestHandlerInst.formatErrorObject(this.id, meth, 'Missing Data', ['severity'], null, null, null);
      log.error(`${origin}: ${errorObj.IAPerror.displayString}`);
      return callback(null, errorObj);
    }

    /* HERE IS WHERE YOU SET THE DATA TO PASS INTO REQUEST */
    // set up the request object - payload, uriPathVars, uriQuery, uriOptions, addlHeaders

    const queryParamsAvailable = {};
    const queryParams = {};
    const pathVars = [severity];
    const bodyVars = {};

    // loop in template. long callback arg name to avoid identifier conflicts
    Object.keys(queryParamsAvailable).forEach((thisKeyInQueryParamsAvailable) => {
      if (queryParamsAvailable[thisKeyInQueryParamsAvailable]) {
        queryParams[thisKeyInQueryParamsAvailable] = queryParamsAvailable[thisKeyInQueryParamsAvailable];
      }
    });


    const reqObj = {
      payload: bodyVars,
      uriPathVars: pathVars,
      uriQuery: queryParams
    };


    try {
      // Make the call -
      // identifyRequest(entity, action, requestObj, returnDataFlag, callback)
      return this.requestHandlerInst.identifyRequest('Severity', 'getAdvisoryBySeverity', reqObj, true, (irReturnData, irReturnError) => {
        // if we received an error or their is no response on the results
        // return an error
        if (irReturnError) {
          /* HERE IS WHERE YOU CAN ALTER THE ERROR MESSAGE */
          return callback(null, irReturnError);
        }
        if (!Object.hasOwnProperty.call(irReturnData, 'response')) {
          const errorObj = this.requestHandlerInst.formatErrorObject(this.id, meth, 'Invalid Response', ['getAdvisoryBySeverity'], null, null, null);
          log.error(`${origin}: ${errorObj.IAPerror.displayString}`);
          return callback(null, errorObj);
        }

        /* HERE IS WHERE YOU CAN ALTER THE RETURN DATA */
        // return the response
        return callback(irReturnData, null);
      });
    } catch (ex) {
      const errorObj = this.requestHandlerInst.formatErrorObject(this.id, meth, 'Caught Exception', null, null, null, ex);
      log.error(`${origin}: ${errorObj.IAPerror.displayString}`);
      return callback(null, errorObj);
    }
  }

  /**
   * @summary Used to obtain all security advisories for a given security impact rating (critical, high, medium, or low).
   *
   * @function getAdvisoryBySeverityLastpublished
   * @param {string} severity - Used to obtain all advisories that have a security impact rating of critical
   * @param {string} startDate - startDate param
   * @param {string} endDate - endDate param
   * @param {getCallback} callback - a callback function to return the result
   */
  /* YOU CAN CHANGE THE PARAMETERS YOU TAKE IN HERE AND IN THE pronghorn.json FILE */
  getAdvisoryBySeverityLastpublished(severity = 'critical', startDate, endDate, callback) {
    const meth = 'adapter-getAdvisoryBySeverityLastpublished';
    const origin = `${this.id}-${meth}`;
    log.trace(origin);

    /* HERE IS WHERE YOU VALIDATE DATA */
    if (!severity) {
      const errorObj = this.requestHandlerInst.formatErrorObject(this.id, meth, 'Missing Data', ['severity'], null, null, null);
      log.error(`${origin}: ${errorObj.IAPerror.displayString}`);
      return callback(null, errorObj);
    }
    if (!startDate) {
      const errorObj = this.requestHandlerInst.formatErrorObject(this.id, meth, 'Missing Data', ['startDate'], null, null, null);
      log.error(`${origin}: ${errorObj.IAPerror.displayString}`);
      return callback(null, errorObj);
    }
    if (!endDate) {
      const errorObj = this.requestHandlerInst.formatErrorObject(this.id, meth, 'Missing Data', ['endDate'], null, null, null);
      log.error(`${origin}: ${errorObj.IAPerror.displayString}`);
      return callback(null, errorObj);
    }

    /* HERE IS WHERE YOU SET THE DATA TO PASS INTO REQUEST */
    // set up the request object - payload, uriPathVars, uriQuery, uriOptions, addlHeaders

    const queryParamsAvailable = { startDate, endDate };
    const queryParams = {};
    const pathVars = [severity];
    const bodyVars = {};

    // loop in template. long callback arg name to avoid identifier conflicts
    Object.keys(queryParamsAvailable).forEach((thisKeyInQueryParamsAvailable) => {
      if (queryParamsAvailable[thisKeyInQueryParamsAvailable]) {
        queryParams[thisKeyInQueryParamsAvailable] = queryParamsAvailable[thisKeyInQueryParamsAvailable];
      }
    });


    const reqObj = {
      payload: bodyVars,
      uriPathVars: pathVars,
      uriQuery: queryParams
    };


    try {
      // Make the call -
      // identifyRequest(entity, action, requestObj, returnDataFlag, callback)
      return this.requestHandlerInst.identifyRequest('Severity', 'getAdvisoryBySeverityLastpublished', reqObj, true, (irReturnData, irReturnError) => {
        // if we received an error or their is no response on the results
        // return an error
        if (irReturnError) {
          /* HERE IS WHERE YOU CAN ALTER THE ERROR MESSAGE */
          return callback(null, irReturnError);
        }
        if (!Object.hasOwnProperty.call(irReturnData, 'response')) {
          const errorObj = this.requestHandlerInst.formatErrorObject(this.id, meth, 'Invalid Response', ['getAdvisoryBySeverityLastpublished'], null, null, null);
          log.error(`${origin}: ${errorObj.IAPerror.displayString}`);
          return callback(null, errorObj);
        }

        /* HERE IS WHERE YOU CAN ALTER THE RETURN DATA */
        // return the response
        return callback(irReturnData, null);
      });
    } catch (ex) {
      const errorObj = this.requestHandlerInst.formatErrorObject(this.id, meth, 'Caught Exception', null, null, null, ex);
      log.error(`${origin}: ${errorObj.IAPerror.displayString}`);
      return callback(null, errorObj);
    }
  }

  /**
   * @summary Used to obtain all security advisories for a given security impact rating (critical, high, medium, or low) and additionally filter based of firstpublished start date and enddate.
   *
   * @function getAdvisoryBySeverityFirstpublished
   * @param {string} severity - Used to obtain all advisories that have a security impact rating of critical
   * @param {string} startDate - startDate param
   * @param {string} endDate - endDate param
   * @param {getCallback} callback - a callback function to return the result
   */
  /* YOU CAN CHANGE THE PARAMETERS YOU TAKE IN HERE AND IN THE pronghorn.json FILE */
  getAdvisoryBySeverityFirstpublished(severity = 'critical', startDate, endDate, callback) {
    const meth = 'adapter-getAdvisoryBySeverityFirstpublished';
    const origin = `${this.id}-${meth}`;
    log.trace(origin);

    /* HERE IS WHERE YOU VALIDATE DATA */
    if (!severity) {
      const errorObj = this.requestHandlerInst.formatErrorObject(this.id, meth, 'Missing Data', ['severity'], null, null, null);
      log.error(`${origin}: ${errorObj.IAPerror.displayString}`);
      return callback(null, errorObj);
    }
    if (!startDate) {
      const errorObj = this.requestHandlerInst.formatErrorObject(this.id, meth, 'Missing Data', ['startDate'], null, null, null);
      log.error(`${origin}: ${errorObj.IAPerror.displayString}`);
      return callback(null, errorObj);
    }
    if (!endDate) {
      const errorObj = this.requestHandlerInst.formatErrorObject(this.id, meth, 'Missing Data', ['endDate'], null, null, null);
      log.error(`${origin}: ${errorObj.IAPerror.displayString}`);
      return callback(null, errorObj);
    }

    /* HERE IS WHERE YOU SET THE DATA TO PASS INTO REQUEST */
    // set up the request object - payload, uriPathVars, uriQuery, uriOptions, addlHeaders

    const queryParamsAvailable = { startDate, endDate };
    const queryParams = {};
    const pathVars = [severity];
    const bodyVars = {};

    // loop in template. long callback arg name to avoid identifier conflicts
    Object.keys(queryParamsAvailable).forEach((thisKeyInQueryParamsAvailable) => {
      if (queryParamsAvailable[thisKeyInQueryParamsAvailable]) {
        queryParams[thisKeyInQueryParamsAvailable] = queryParamsAvailable[thisKeyInQueryParamsAvailable];
      }
    });


    const reqObj = {
      payload: bodyVars,
      uriPathVars: pathVars,
      uriQuery: queryParams
    };


    try {
      // Make the call -
      // identifyRequest(entity, action, requestObj, returnDataFlag, callback)
      return this.requestHandlerInst.identifyRequest('Severity', 'getAdvisoryBySeverityFirstpublished', reqObj, true, (irReturnData, irReturnError) => {
        // if we received an error or their is no response on the results
        // return an error
        if (irReturnError) {
          /* HERE IS WHERE YOU CAN ALTER THE ERROR MESSAGE */
          return callback(null, irReturnError);
        }
        if (!Object.hasOwnProperty.call(irReturnData, 'response')) {
          const errorObj = this.requestHandlerInst.formatErrorObject(this.id, meth, 'Invalid Response', ['getAdvisoryBySeverityFirstpublished'], null, null, null);
          log.error(`${origin}: ${errorObj.IAPerror.displayString}`);
          return callback(null, errorObj);
        }

        /* HERE IS WHERE YOU CAN ALTER THE RETURN DATA */
        // return the response
        return callback(irReturnData, null);
      });
    } catch (ex) {
      const errorObj = this.requestHandlerInst.formatErrorObject(this.id, meth, 'Caught Exception', null, null, null, ex);
      log.error(`${origin}: ${errorObj.IAPerror.displayString}`);
      return callback(null, errorObj);
    }
  }

  /**
   * @summary Obtain all security advisories that have were originally published in a specific year.
   *
   * @function getAdvisoryByYear
   * @param {string} year - The four digit year.
   * @param {getCallback} callback - a callback function to return the result
   */
  /* YOU CAN CHANGE THE PARAMETERS YOU TAKE IN HERE AND IN THE pronghorn.json FILE */
  getAdvisoryByYear(year, callback) {
    const meth = 'adapter-getAdvisoryByYear';
    const origin = `${this.id}-${meth}`;
    log.trace(origin);

    /* HERE IS WHERE YOU VALIDATE DATA */
    if (!year) {
      const errorObj = this.requestHandlerInst.formatErrorObject(this.id, meth, 'Missing Data', ['year'], null, null, null);
      log.error(`${origin}: ${errorObj.IAPerror.displayString}`);
      return callback(null, errorObj);
    }

    /* HERE IS WHERE YOU SET THE DATA TO PASS INTO REQUEST */
    // set up the request object - payload, uriPathVars, uriQuery, uriOptions, addlHeaders

    const queryParamsAvailable = {};
    const queryParams = {};
    const pathVars = [year];
    const bodyVars = {};

    // loop in template. long callback arg name to avoid identifier conflicts
    Object.keys(queryParamsAvailable).forEach((thisKeyInQueryParamsAvailable) => {
      if (queryParamsAvailable[thisKeyInQueryParamsAvailable]) {
        queryParams[thisKeyInQueryParamsAvailable] = queryParamsAvailable[thisKeyInQueryParamsAvailable];
      }
    });


    const reqObj = {
      payload: bodyVars,
      uriPathVars: pathVars,
      uriQuery: queryParams
    };


    try {
      // Make the call -
      // identifyRequest(entity, action, requestObj, returnDataFlag, callback)
      return this.requestHandlerInst.identifyRequest('Year', 'getAdvisoryByYear', reqObj, true, (irReturnData, irReturnError) => {
        // if we received an error or their is no response on the results
        // return an error
        if (irReturnError) {
          /* HERE IS WHERE YOU CAN ALTER THE ERROR MESSAGE */
          return callback(null, irReturnError);
        }
        if (!Object.hasOwnProperty.call(irReturnData, 'response')) {
          const errorObj = this.requestHandlerInst.formatErrorObject(this.id, meth, 'Invalid Response', ['getAdvisoryByYear'], null, null, null);
          log.error(`${origin}: ${errorObj.IAPerror.displayString}`);
          return callback(null, errorObj);
        }

        /* HERE IS WHERE YOU CAN ALTER THE RETURN DATA */
        // return the response
        return callback(irReturnData, null);
      });
    } catch (ex) {
      const errorObj = this.requestHandlerInst.formatErrorObject(this.id, meth, 'Caught Exception', null, null, null, ex);
      log.error(`${origin}: ${errorObj.IAPerror.displayString}`);
      return callback(null, errorObj);
    }
  }

  /**
   * @summary Obtain all the latest security advisories given an absolute number.
   *
   * @function getLatestAdvisoryByNumber
   * @param {number} number - An absolute number to obtain the latest security advisories.
   * @param {getCallback} callback - a callback function to return the result
   */
  /* YOU CAN CHANGE THE PARAMETERS YOU TAKE IN HERE AND IN THE pronghorn.json FILE */
  getLatestAdvisoryByNumber(number, callback) {
    const meth = 'adapter-getLatestAdvisoryByNumber';
    const origin = `${this.id}-${meth}`;
    log.trace(origin);

    /* HERE IS WHERE YOU VALIDATE DATA */
    if (!number) {
      const errorObj = this.requestHandlerInst.formatErrorObject(this.id, meth, 'Missing Data', ['number'], null, null, null);
      log.error(`${origin}: ${errorObj.IAPerror.displayString}`);
      return callback(null, errorObj);
    }

    /* HERE IS WHERE YOU SET THE DATA TO PASS INTO REQUEST */
    // set up the request object - payload, uriPathVars, uriQuery, uriOptions, addlHeaders

    const queryParamsAvailable = {};
    const queryParams = {};
    const pathVars = [number];
    const bodyVars = {};

    // loop in template. long callback arg name to avoid identifier conflicts
    Object.keys(queryParamsAvailable).forEach((thisKeyInQueryParamsAvailable) => {
      if (queryParamsAvailable[thisKeyInQueryParamsAvailable]) {
        queryParams[thisKeyInQueryParamsAvailable] = queryParamsAvailable[thisKeyInQueryParamsAvailable];
      }
    });


    const reqObj = {
      payload: bodyVars,
      uriPathVars: pathVars,
      uriQuery: queryParams
    };


    try {
      // Make the call -
      // identifyRequest(entity, action, requestObj, returnDataFlag, callback)
      return this.requestHandlerInst.identifyRequest('Latest', 'getLatestAdvisoryByNumber', reqObj, true, (irReturnData, irReturnError) => {
        // if we received an error or their is no response on the results
        // return an error
        if (irReturnError) {
          /* HERE IS WHERE YOU CAN ALTER THE ERROR MESSAGE */
          return callback(null, irReturnError);
        }
        if (!Object.hasOwnProperty.call(irReturnData, 'response')) {
          const errorObj = this.requestHandlerInst.formatErrorObject(this.id, meth, 'Invalid Response', ['getLatestAdvisoryByNumber'], null, null, null);
          log.error(`${origin}: ${errorObj.IAPerror.displayString}`);
          return callback(null, errorObj);
        }

        /* HERE IS WHERE YOU CAN ALTER THE RETURN DATA */
        // return the response
        return callback(irReturnData, null);
      });
    } catch (ex) {
      const errorObj = this.requestHandlerInst.formatErrorObject(this.id, meth, 'Caught Exception', null, null, null, ex);
      log.error(`${origin}: ${errorObj.IAPerror.displayString}`);
      return callback(null, errorObj);
    }
  }

  /**
   * @summary Obtain all the advisories that affects the given product name.
   *
   * @function getAdvisoryByProductName
   * @param {string} product - An product name to obtain security advisories that matches given product name.
   * @param {getCallback} callback - a callback function to return the result
   */
  /* YOU CAN CHANGE THE PARAMETERS YOU TAKE IN HERE AND IN THE pronghorn.json FILE */
  getAdvisoryByProductName(product, callback) {
    const meth = 'adapter-getAdvisoryByProductName';
    const origin = `${this.id}-${meth}`;
    log.trace(origin);

    /* HERE IS WHERE YOU VALIDATE DATA */
    if (!product) {
      const errorObj = this.requestHandlerInst.formatErrorObject(this.id, meth, 'Missing Data', ['product'], null, null, null);
      log.error(`${origin}: ${errorObj.IAPerror.displayString}`);
      return callback(null, errorObj);
    }

    /* HERE IS WHERE YOU SET THE DATA TO PASS INTO REQUEST */
    // set up the request object - payload, uriPathVars, uriQuery, uriOptions, addlHeaders

    const queryParamsAvailable = { product };
    const queryParams = {};
    const pathVars = [];
    const bodyVars = {};

    // loop in template. long callback arg name to avoid identifier conflicts
    Object.keys(queryParamsAvailable).forEach((thisKeyInQueryParamsAvailable) => {
      if (queryParamsAvailable[thisKeyInQueryParamsAvailable]) {
        queryParams[thisKeyInQueryParamsAvailable] = queryParamsAvailable[thisKeyInQueryParamsAvailable];
      }
    });


    const reqObj = {
      payload: bodyVars,
      uriPathVars: pathVars,
      uriQuery: queryParams
    };


    try {
      // Make the call -
      // identifyRequest(entity, action, requestObj, returnDataFlag, callback)
      return this.requestHandlerInst.identifyRequest('Product', 'getAdvisoryByProductName', reqObj, true, (irReturnData, irReturnError) => {
        // if we received an error or their is no response on the results
        // return an error
        if (irReturnError) {
          /* HERE IS WHERE YOU CAN ALTER THE ERROR MESSAGE */
          return callback(null, irReturnError);
        }
        if (!Object.hasOwnProperty.call(irReturnData, 'response')) {
          const errorObj = this.requestHandlerInst.formatErrorObject(this.id, meth, 'Invalid Response', ['getAdvisoryByProductName'], null, null, null);
          log.error(`${origin}: ${errorObj.IAPerror.displayString}`);
          return callback(null, errorObj);
        }

        /* HERE IS WHERE YOU CAN ALTER THE RETURN DATA */
        // return the response
        return callback(irReturnData, null);
      });
    } catch (ex) {
      const errorObj = this.requestHandlerInst.formatErrorObject(this.id, meth, 'Caught Exception', null, null, null, ex);
      log.error(`${origin}: ${errorObj.IAPerror.displayString}`);
      return callback(null, errorObj);
    }
  }

  /**
   * @summary Obtain all advisories that affects the given ios version
   *
   * @function getAdvisoryByIOSVersion
   * @param {string} version - IOS version to obtain security advisories
   * @param {getCallback} callback - a callback function to return the result
   */
  /* YOU CAN CHANGE THE PARAMETERS YOU TAKE IN HERE AND IN THE pronghorn.json FILE */
  getAdvisoryByIOSVersion(version, callback) {
    const meth = 'adapter-getAdvisoryByIOSVersion';
    const origin = `${this.id}-${meth}`;
    log.trace(origin);

    /* HERE IS WHERE YOU VALIDATE DATA */
    if (!version) {
      const errorObj = this.requestHandlerInst.formatErrorObject(this.id, meth, 'Missing Data', ['version'], null, null, null);
      log.error(`${origin}: ${errorObj.IAPerror.displayString}`);
      return callback(null, errorObj);
    }

    /* HERE IS WHERE YOU SET THE DATA TO PASS INTO REQUEST */
    // set up the request object - payload, uriPathVars, uriQuery, uriOptions, addlHeaders

    const queryParamsAvailable = { version };
    const queryParams = {};
    const pathVars = [];
    const bodyVars = {};

    // loop in template. long callback arg name to avoid identifier conflicts
    Object.keys(queryParamsAvailable).forEach((thisKeyInQueryParamsAvailable) => {
      if (queryParamsAvailable[thisKeyInQueryParamsAvailable]) {
        queryParams[thisKeyInQueryParamsAvailable] = queryParamsAvailable[thisKeyInQueryParamsAvailable];
      }
    });


    const reqObj = {
      payload: bodyVars,
      uriPathVars: pathVars,
      uriQuery: queryParams
    };


    try {
      // Make the call -
      // identifyRequest(entity, action, requestObj, returnDataFlag, callback)
      return this.requestHandlerInst.identifyRequest('Ios', 'getAdvisoryByIOSVersion', reqObj, true, (irReturnData, irReturnError) => {
        // if we received an error or their is no response on the results
        // return an error
        if (irReturnError) {
          /* HERE IS WHERE YOU CAN ALTER THE ERROR MESSAGE */
          return callback(null, irReturnError);
        }
        if (!Object.hasOwnProperty.call(irReturnData, 'response')) {
          const errorObj = this.requestHandlerInst.formatErrorObject(this.id, meth, 'Invalid Response', ['getAdvisoryByIOSVersion'], null, null, null);
          log.error(`${origin}: ${errorObj.IAPerror.displayString}`);
          return callback(null, errorObj);
        }

        /* HERE IS WHERE YOU CAN ALTER THE RETURN DATA */
        // return the response
        return callback(irReturnData, null);
      });
    } catch (ex) {
      const errorObj = this.requestHandlerInst.formatErrorObject(this.id, meth, 'Caught Exception', null, null, null, ex);
      log.error(`${origin}: ${errorObj.IAPerror.displayString}`);
      return callback(null, errorObj);
    }
  }

  /**
   * @summary Obtain all advisories that affects the given ios version.
   *
   * @function getAdvisoryByIOSXEVersion
   * @param {string} version - IOS version to obtain security advisories
   * @param {getCallback} callback - a callback function to return the result
   */
  /* YOU CAN CHANGE THE PARAMETERS YOU TAKE IN HERE AND IN THE pronghorn.json FILE */
  getAdvisoryByIOSXEVersion(version, callback) {
    const meth = 'adapter-getAdvisoryByIOSXEVersion';
    const origin = `${this.id}-${meth}`;
    log.trace(origin);

    /* HERE IS WHERE YOU VALIDATE DATA */
    if (!version) {
      const errorObj = this.requestHandlerInst.formatErrorObject(this.id, meth, 'Missing Data', ['version'], null, null, null);
      log.error(`${origin}: ${errorObj.IAPerror.displayString}`);
      return callback(null, errorObj);
    }

    /* HERE IS WHERE YOU SET THE DATA TO PASS INTO REQUEST */
    // set up the request object - payload, uriPathVars, uriQuery, uriOptions, addlHeaders

    const queryParamsAvailable = { version };
    const queryParams = {};
    const pathVars = [];
    const bodyVars = {};

    // loop in template. long callback arg name to avoid identifier conflicts
    Object.keys(queryParamsAvailable).forEach((thisKeyInQueryParamsAvailable) => {
      if (queryParamsAvailable[thisKeyInQueryParamsAvailable]) {
        queryParams[thisKeyInQueryParamsAvailable] = queryParamsAvailable[thisKeyInQueryParamsAvailable];
      }
    });


    const reqObj = {
      payload: bodyVars,
      uriPathVars: pathVars,
      uriQuery: queryParams
    };


    try {
      // Make the call -
      // identifyRequest(entity, action, requestObj, returnDataFlag, callback)
      return this.requestHandlerInst.identifyRequest('Iosxe', 'getAdvisoryByIOSXEVersion', reqObj, true, (irReturnData, irReturnError) => {
        // if we received an error or their is no response on the results
        // return an error
        if (irReturnError) {
          /* HERE IS WHERE YOU CAN ALTER THE ERROR MESSAGE */
          return callback(null, irReturnError);
        }
        if (!Object.hasOwnProperty.call(irReturnData, 'response')) {
          const errorObj = this.requestHandlerInst.formatErrorObject(this.id, meth, 'Invalid Response', ['getAdvisoryByIOSXEVersion'], null, null, null);
          log.error(`${origin}: ${errorObj.IAPerror.displayString}`);
          return callback(null, errorObj);
        }

        /* HERE IS WHERE YOU CAN ALTER THE RETURN DATA */
        // return the response
        return callback(irReturnData, null);
      });
    } catch (ex) {
      const errorObj = this.requestHandlerInst.formatErrorObject(this.id, meth, 'Caught Exception', null, null, null, ex);
      log.error(`${origin}: ${errorObj.IAPerror.displayString}`);
      return callback(null, errorObj);
    }
  }
}

module.exports = Psirt;
