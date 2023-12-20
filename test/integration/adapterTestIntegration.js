/* @copyright Itential, LLC 2019 (pre-modifications) */

// Set globals
/* global describe it log pronghornProps */
/* eslint no-unused-vars: warn */
/* eslint no-underscore-dangle: warn  */
/* eslint import/no-dynamic-require:warn */

// include required items for testing & logging
const assert = require('assert');
const fs = require('fs');
const path = require('path');
const util = require('util');
const mocha = require('mocha');
const winston = require('winston');
const { expect } = require('chai');
const { use } = require('chai');
const td = require('testdouble');

const anything = td.matchers.anything();

// stub and attemptTimeout are used throughout the code so set them here
let logLevel = 'none';
const isRapidFail = false;
const isSaveMockData = false;

// read in the properties from the sampleProperties files
let adaptdir = __dirname;
if (adaptdir.endsWith('/test/integration')) {
  adaptdir = adaptdir.substring(0, adaptdir.length - 17);
} else if (adaptdir.endsWith('/test/unit')) {
  adaptdir = adaptdir.substring(0, adaptdir.length - 10);
}
const samProps = require(`${adaptdir}/sampleProperties.json`).properties;

// these variables can be changed to run in integrated mode so easier to set them here
// always check these in with bogus data!!!
samProps.stub = true;
samProps.host = 'replace.hostorip.here';
samProps.authentication.username = 'username';
samProps.authentication.password = 'password';
samProps.protocol = 'http';
samProps.port = 80;
samProps.ssl.enabled = false;
samProps.ssl.accept_invalid_cert = false;
if (samProps.request.attempt_timeout < 30000) {
  samProps.request.attempt_timeout = 30000;
}
const attemptTimeout = samProps.request.attempt_timeout;
const { stub } = samProps;

// these are the adapter properties. You generally should not need to alter
// any of these after they are initially set up
global.pronghornProps = {
  pathProps: {
    encrypted: false
  },
  adapterProps: {
    adapters: [{
      id: 'Test-psirt',
      type: 'Psirt',
      properties: samProps
    }]
  }
};

global.$HOME = `${__dirname}/../..`;

// set the log levels that Pronghorn uses, spam and trace are not defaulted in so without
// this you may error on log.trace calls.
const myCustomLevels = {
  levels: {
    spam: 6,
    trace: 5,
    debug: 4,
    info: 3,
    warn: 2,
    error: 1,
    none: 0
  }
};

// need to see if there is a log level passed in
process.argv.forEach((val) => {
  // is there a log level defined to be passed in?
  if (val.indexOf('--LOG') === 0) {
    // get the desired log level
    const inputVal = val.split('=')[1];

    // validate the log level is supported, if so set it
    if (Object.hasOwnProperty.call(myCustomLevels.levels, inputVal)) {
      logLevel = inputVal;
    }
  }
});

// need to set global logging
global.log = winston.createLogger({
  level: logLevel,
  levels: myCustomLevels.levels,
  transports: [
    new winston.transports.Console()
  ]
});

/**
 * Runs the common asserts for test
 */
function runCommonAsserts(data, error) {
  assert.equal(undefined, error);
  assert.notEqual(undefined, data);
  assert.notEqual(null, data);
  assert.notEqual(undefined, data.response);
  assert.notEqual(null, data.response);
}

/**
 * Runs the error asserts for the test
 */
function runErrorAsserts(data, error, code, origin, displayStr) {
  assert.equal(null, data);
  assert.notEqual(undefined, error);
  assert.notEqual(null, error);
  assert.notEqual(undefined, error.IAPerror);
  assert.notEqual(null, error.IAPerror);
  assert.notEqual(undefined, error.IAPerror.displayString);
  assert.notEqual(null, error.IAPerror.displayString);
  assert.equal(code, error.icode);
  assert.equal(origin, error.IAPerror.origin);
  assert.equal(displayStr, error.IAPerror.displayString);
}

/**
 * @function saveMockData
 * Attempts to take data from responses and place them in MockDataFiles to help create Mockdata.
 * Note, this was built based on entity file structure for Adapter-Engine 1.6.x
 * @param {string} entityName - Name of the entity saving mock data for
 * @param {string} actionName -  Name of the action saving mock data for
 * @param {string} descriptor -  Something to describe this test (used as a type)
 * @param {string or object} responseData - The data to put in the mock file.
 */
function saveMockData(entityName, actionName, descriptor, responseData) {
  // do not need to save mockdata if we are running in stub mode (already has mock data) or if told not to save
  if (stub || !isSaveMockData) {
    return false;
  }

  // must have a response in order to store the response
  if (responseData && responseData.response) {
    let data = responseData.response;

    // if there was a raw response that one is better as it is untranslated
    if (responseData.raw) {
      data = responseData.raw;

      try {
        const temp = JSON.parse(data);
        data = temp;
      } catch (pex) {
        // do not care if it did not parse as we will just use data
      }
    }

    try {
      const base = path.join(__dirname, `../../entities/${entityName}/`);
      const mockdatafolder = 'mockdatafiles';
      const filename = `mockdatafiles/${actionName}-${descriptor}.json`;

      if (!fs.existsSync(base + mockdatafolder)) {
        fs.mkdirSync(base + mockdatafolder);
      }

      // write the data we retrieved
      fs.writeFile(base + filename, JSON.stringify(data, null, 2), 'utf8', (errWritingMock) => {
        if (errWritingMock) throw errWritingMock;

        // update the action file to reflect the changes. Note: We're replacing the default object for now!
        fs.readFile(`${base}action.json`, (errRead, content) => {
          if (errRead) throw errRead;

          // parse the action file into JSON
          const parsedJson = JSON.parse(content);

          // The object update we'll write in.
          const responseObj = {
            type: descriptor,
            key: '',
            mockFile: filename
          };

          // get the object for method we're trying to change.
          const currentMethodAction = parsedJson.actions.find((obj) => obj.name === actionName);

          // if the method was not found - should never happen but...
          if (!currentMethodAction) {
            throw Error('Can\'t find an action for this method in the provided entity.');
          }

          // if there is a response object, we want to replace the Response object. Otherwise we'll create one.
          const actionResponseObj = currentMethodAction.responseObjects.find((obj) => obj.type === descriptor);

          // Add the action responseObj back into the array of response objects.
          if (!actionResponseObj) {
            // if there is a default response object, we want to get the key.
            const defaultResponseObj = currentMethodAction.responseObjects.find((obj) => obj.type === 'default');

            // save the default key into the new response object
            if (defaultResponseObj) {
              responseObj.key = defaultResponseObj.key;
            }

            // save the new response object
            currentMethodAction.responseObjects = [responseObj];
          } else {
            // update the location of the mock data file
            actionResponseObj.mockFile = responseObj.mockFile;
          }

          // Save results
          fs.writeFile(`${base}action.json`, JSON.stringify(parsedJson, null, 2), (err) => {
            if (err) throw err;
          });
        });
      });
    } catch (e) {
      log.debug(`Failed to save mock data for ${actionName}. ${e.message}`);
      return false;
    }
  }

  // no response to save
  log.debug(`No data passed to save into mockdata for ${actionName}`);
  return false;
}

// require the adapter that we are going to be using
const Psirt = require('../../adapter');

// begin the testing - these should be pretty well defined between the describe and the it!
describe('[integration] Psirt Adapter Test', () => {
  describe('Psirt Class Tests', () => {
    const a = new Psirt(
      pronghornProps.adapterProps.adapters[0].id,
      pronghornProps.adapterProps.adapters[0].properties
    );

    if (isRapidFail) {
      const state = {};
      state.passed = true;

      mocha.afterEach(function x() {
        state.passed = state.passed
        && (this.currentTest.state === 'passed');
      });
      mocha.beforeEach(function x() {
        if (!state.passed) {
          return this.currentTest.skip();
        }
        return true;
      });
    }

    describe('#class instance created', () => {
      it('should be a class with properties', (done) => {
        try {
          assert.notEqual(null, a);
          assert.notEqual(undefined, a);
          const checkId = global.pronghornProps.adapterProps.adapters[0].id;
          assert.equal(checkId, a.id);
          assert.notEqual(null, a.allProps);
          const check = global.pronghornProps.adapterProps.adapters[0].properties.healthcheck.type;
          assert.equal(check, a.healthcheckType);
          done();
        } catch (error) {
          log.error(`Test Failure: ${error}`);
          done(error);
        }
      }).timeout(attemptTimeout);
    });

    describe('#connect', () => {
      it('should get connected - no healthcheck', (done) => {
        try {
          a.healthcheckType = 'none';
          a.connect();

          try {
            assert.equal(true, a.alive);
            done();
          } catch (error) {
            log.error(`Test Failure: ${error}`);
            done(error);
          }
        } catch (error) {
          log.error(`Adapter Exception: ${error}`);
          done(error);
        }
      });
      it('should get connected - startup healthcheck', (done) => {
        try {
          a.healthcheckType = 'startup';
          a.connect();

          try {
            assert.equal(true, a.alive);
            done();
          } catch (error) {
            log.error(`Test Failure: ${error}`);
            done(error);
          }
        } catch (error) {
          log.error(`Adapter Exception: ${error}`);
          done(error);
        }
      });
    });

    describe('#healthCheck', () => {
      it('should be healthy', (done) => {
        try {
          a.healthCheck(null, (data) => {
            try {
              assert.equal(true, a.healthy);
              saveMockData('system', 'healthcheck', 'default', data);
              done();
            } catch (err) {
              log.error(`Test Failure: ${err}`);
              done(err);
            }
          });
        } catch (error) {
          log.error(`Adapter Exception: ${error}`);
          done(error);
        }
      }).timeout(attemptTimeout);
    });

    // broker tests
    describe('#getDevicesFiltered - errors', () => {
      it('should work if integrated but since no mockdata should error when run standalone', (done) => {
        try {
          const opts = {
            filter: {
              name: 'deviceName'
            }
          };
          a.getDevicesFiltered(opts, (data, error) => {
            try {
              if (stub) {
                if (samProps.devicebroker.getDevicesFiltered[0].handleFailure === 'ignore') {
                  assert.equal(null, error);
                  assert.notEqual(undefined, data);
                  assert.notEqual(null, data);
                  assert.equal(0, data.total);
                  assert.equal(0, data.list.length);
                } else {
                  const displayE = 'Error 400 received on request';
                  runErrorAsserts(data, error, 'AD.500', 'Test-psirt-connectorRest-handleEndResponse', displayE);
                }
              } else {
                runCommonAsserts(data, error);
              }
              done();
            } catch (err) {
              log.error(`Test Failure: ${err}`);
              done(err);
            }
          });
        } catch (error) {
          log.error(`Adapter Exception: ${error}`);
          done(error);
        }
      }).timeout(attemptTimeout);
    });

    describe('#iapGetDeviceCount - errors', () => {
      it('should work if integrated but since no mockdata should error when run standalone', (done) => {
        try {
          const opts = {
            filter: {
              name: 'deviceName'
            }
          };
          a.iapGetDeviceCount((data, error) => {
            try {
              if (stub) {
                if (samProps.devicebroker.getDevicesFiltered[0].handleFailure === 'ignore') {
                  assert.equal(null, error);
                  assert.notEqual(undefined, data);
                  assert.notEqual(null, data);
                  assert.equal(0, data.count);
                } else {
                  const displayE = 'Error 400 received on request';
                  runErrorAsserts(data, error, 'AD.500', 'Test-psirt-connectorRest-handleEndResponse', displayE);
                }
              } else {
                runCommonAsserts(data, error);
              }
              done();
            } catch (err) {
              log.error(`Test Failure: ${err}`);
              done(err);
            }
          });
        } catch (error) {
          log.error(`Adapter Exception: ${error}`);
          done(error);
        }
      }).timeout(attemptTimeout);
    });

    // exposed cache tests
    describe('#iapPopulateEntityCache - errors', () => {
      it('should work if integrated but since no mockdata should error when run standalone', (done) => {
        try {
          a.iapPopulateEntityCache('Device', (data, error) => {
            try {
              if (stub) {
                assert.equal(null, data);
                assert.notEqual(undefined, error);
                assert.notEqual(null, error);
                done();
              } else {
                assert.equal(undefined, error);
                assert.equal('success', data[0]);
                done();
              }
            } catch (err) {
              log.error(`Test Failure: ${err}`);
              done(err);
            }
          });
        } catch (error) {
          log.error(`Adapter Exception: ${error}`);
          done(error);
        }
      }).timeout(attemptTimeout);
    });

    describe('#iapRetrieveEntitiesCache - errors', () => {
      it('should work if integrated but since no mockdata should error when run standalone', (done) => {
        try {
          a.iapRetrieveEntitiesCache('Device', {}, (data, error) => {
            try {
              if (stub) {
                assert.equal(null, data);
                assert.notEqual(null, error);
                assert.notEqual(undefined, error);
              } else {
                assert.equal(undefined, error);
                assert.notEqual(null, data);
                assert.notEqual(undefined, data);
              }
              done();
            } catch (err) {
              log.error(`Test Failure: ${err}`);
              done(err);
            }
          });
        } catch (error) {
          log.error(`Adapter Exception: ${error}`);
          done(error);
        }
      }).timeout(attemptTimeout);
    });
    /*
    -----------------------------------------------------------------------
    -----------------------------------------------------------------------
    *** All code above this comment will be replaced during a migration ***
    ******************* DO NOT REMOVE THIS COMMENT BLOCK ******************
    -----------------------------------------------------------------------
    -----------------------------------------------------------------------
    */

    describe('#getAllAdvisories - errors', () => {
      it('should work if integrated but since no mockdata should error when run standalone', (done) => {
        try {
          a.getAllAdvisories((data, error) => {
            try {
              runCommonAsserts(data, error);
              if (stub) {
                assert.equal('cisco-sa-20191002-asa-dos', data.response.advisories[0].advisoryId);
              } else {
                runCommonAsserts(data, error);
              }
              saveMockData('All', 'getAllAdvisories', 'default', data);
              done();
            } catch (err) {
              log.error(`Test Failure: ${err}`);
              done(err);
            }
          });
        } catch (error) {
          log.error(`Adapter Exception: ${error}`);
          done(error);
        }
      }).timeout(attemptTimeout);
    });

    const cveCveId = 'CVE-2019-12673';

    describe('#getAdvisoryByCveId - errors', () => {
      it('should work if integrated but since no mockdata should error when run standalone', (done) => {
        try {
          a.getAdvisoryByCveId(cveCveId, (data, error) => {
            try {
              runCommonAsserts(data, error);
              if (stub) {
                assert.equal('CVE-2019-12673', data.response.advisories[0].cves);
              } else {
                runCommonAsserts(data, error);
              }
              saveMockData('Cve', 'getAdvisoryByCveId', 'default', data);

              done();
            } catch (err) {
              log.error(`Test Failure: ${err}`);
              done(err);
            }
          });
        } catch (error) {
          log.error(`Adapter Exception: ${error}`);
          done(error);
        }
      }).timeout(attemptTimeout);
    });

    const advisoryAdvisoryId = 'cisco-sa-20191002-asa-dos';

    describe('#getAdvisoryByAdvisoryId - errors', () => {
      it('should work if integrated but since no mockdata should error when run standalone', (done) => {
        try {
          a.getAdvisoryByAdvisoryId(advisoryAdvisoryId, (data, error) => {
            try {
              runCommonAsserts(data, error);
              if (stub) {
                assert.equal('cisco-sa-20191002-asa-dos', data.response.advisories[0].advisoryId);
              } else {
                runCommonAsserts(data, error);
              }
              saveMockData('Advisory', 'getAdvisoryByAdvisoryId', 'default', data);
              done();
            } catch (err) {
              log.error(`Test Failure: ${err}`);
              done(err);
            }
          });
        } catch (error) {
          log.error(`Adapter Exception: ${error}`);
          done(error);
        }
      }).timeout(attemptTimeout);
    });

    const severitySeverity = 'critical';

    describe('#getAdvisoryBySeverity - errors', () => {
      it('should work if integrated but since no mockdata should error when run standalone', (done) => {
        try {
          a.getAdvisoryBySeverity(severitySeverity, (data, error) => {
            try {
              runCommonAsserts(data, error);
              if (stub) {
                assert.equal('Critical', data.response.advisories[0].sir);
              } else {
                runCommonAsserts(data, error);
              }
              saveMockData('Severity', 'getAdvisoryBySeverity', 'default', data);
              done();
            } catch (err) {
              log.error(`Test Failure: ${err}`);
              done(err);
            }
          });
        } catch (error) {
          log.error(`Adapter Exception: ${error}`);
          done(error);
        }
      }).timeout(attemptTimeout);
    });

    const severityStartDate = '2019-08-28';
    const severityEndDate = '2019-10-18';

    describe('#getAdvisoryBySeverityFirstpublished - errors', () => {
      it('should work if integrated but since no mockdata should error when run standalone', (done) => {
        try {
          a.getAdvisoryBySeverityFirstpublished(severitySeverity, severityStartDate, severityEndDate, (data, error) => {
            try {
              runCommonAsserts(data, error);
              if (stub) {
                assert.equal('2019-08-28T16:00:00-0700', data.response.advisories[0].firstPublished);
              } else {
                runCommonAsserts(data, error);
              }
              saveMockData('Severity', 'getAdvisoryBySeverityFirstpublished', 'default', data);
              done();
            } catch (err) {
              log.error(`Test Failure: ${err}`);
              done(err);
            }
          });
        } catch (error) {
          log.error(`Adapter Exception: ${error}`);
          done(error);
        }
      }).timeout(attemptTimeout);
    });

    describe('#getAdvisoryBySeverityLastpublished - errors', () => {
      it('should work if integrated but since no mockdata should error when run standalone', (done) => {
        try {
          a.getAdvisoryBySeverityLastpublished(severitySeverity, severityStartDate, severityEndDate, (data, error) => {
            try {
              runCommonAsserts(data, error);
              if (stub) {
                assert.equal('2019-10-18T16:08:02-0700', data.response.advisories[0].lastUpdated);
              } else {
                runCommonAsserts(data, error);
              }
              saveMockData('Severity', 'getAdvisoryBySeverityLastpublished', 'default', data);
              done();
            } catch (err) {
              log.error(`Test Failure: ${err}`);
              done(err);
            }
          });
        } catch (error) {
          log.error(`Adapter Exception: ${error}`);
          done(error);
        }
      }).timeout(attemptTimeout);
    });

    const yearYear = '2019';

    describe('#getAdvisoryByYear - errors', () => {
      it('should work if integrated but since no mockdata should error when run standalone', (done) => {
        try {
          a.getAdvisoryByYear(yearYear, (data, error) => {
            try {
              runCommonAsserts(data, error);
              if (stub) {
                assert.equal('cisco-sa-20191016-airo-capwap-dos', data.response.advisories[0].advisoryId);
              } else {
                runCommonAsserts(data, error);
              }
              saveMockData('Year', 'getAdvisoryByYear', 'default', data);
              done();
            } catch (err) {
              log.error(`Test Failure: ${err}`);
              done(err);
            }
          });
        } catch (error) {
          log.error(`Adapter Exception: ${error}`);
          done(error);
        }
      }).timeout(attemptTimeout);
    });

    const latestNumber = 5;

    describe('#getLatestAdvisoryByNumber - errors', () => {
      it('should work if integrated but since no mockdata should error when run standalone', (done) => {
        try {
          a.getLatestAdvisoryByNumber(latestNumber, (data, error) => {
            try {
              runCommonAsserts(data, error);
              if (stub) {
                assert.equal('cisco-sa-20191016-wlc-pathtrav', data.response.advisories[0].advisoryId);
              } else {
                runCommonAsserts(data, error);
              }
              saveMockData('Latest', 'getLatestAdvisoryByNumber', 'default', data);
              done();
            } catch (err) {
              log.error(`Test Failure: ${err}`);
              done(err);
            }
          });
        } catch (error) {
          log.error(`Adapter Exception: ${error}`);
          done(error);
        }
      }).timeout(attemptTimeout);
    });

    const productProduct = 'Cisco Adaptive Security Appliance (ASA) Software';

    describe('#getAdvisoryByProductName - errors', () => {
      it('should work if integrated but since no mockdata should error when run standalone', (done) => {
        try {
          a.getAdvisoryByProductName(productProduct, (data, error) => {
            try {
              runCommonAsserts(data, error);
              if (stub) {
                assert.equal('Cisco Adaptive Security Appliance (ASA) Software ', data.response.advisories[0].productNames[0]);
              } else {
                runCommonAsserts(data, error);
              }
              saveMockData('Product', 'getAdvisoryByProductName', 'default', data);
              done();
            } catch (err) {
              log.error(`Test Failure: ${err}`);
              done(err);
            }
          });
        } catch (error) {
          log.error(`Adapter Exception: ${error}`);
          done(error);
        }
      }).timeout(attemptTimeout);
    });

    const iosVersion = '15.9(3)m1';

    describe('#getAdvisoryByIOSVersion - errors', () => {
      it('should work if integrated but since no mockdata should error when run standalone', (done) => {
        try {
          a.getAdvisoryByIOSVersion(iosVersion, (data, error) => {
            try {
              runCommonAsserts(data, error);
              if (stub) {
                assert.equal('15.9(3)M1', data.response.advisories[0].iosRelease[0]);
              } else {
                runCommonAsserts(data, error);
              }
              saveMockData('Ios', 'getAdvisoryByIOSVersion', 'default', data);
              done();
            } catch (err) {
              log.error(`Test Failure: ${err}`);
              done(err);
            }
          });
        } catch (error) {
          log.error(`Adapter Exception: ${error}`);
          done(error);
        }
      }).timeout(attemptTimeout);
    });

    const iosxeVersion = '17.6.1';

    describe('#getAdvisoryByIOSXEVersion - errors', () => {
      it('should work if integrated but since no mockdata should error when run standalone', (done) => {
        try {
          a.getAdvisoryByIOSXEVersion(iosxeVersion, (data, error) => {
            try {
              runCommonAsserts(data, error);
              if (stub) {
                assert.equal('17.6.1', data.response.advisories[0].iosRelease[0]);
              } else {
                runCommonAsserts(data, error);
              }
              saveMockData('Iosxe', 'getAdvisoryByIOSXEVersion', 'default', data);
              done();
            } catch (err) {
              log.error(`Test Failure: ${err}`);
              done(err);
            }
          });
        } catch (error) {
          log.error(`Adapter Exception: ${error}`);
          done(error);
        }
      }).timeout(attemptTimeout);
    });

    describe('#getSecurityAdvisoriesBugidByBugId - errors', () => {
      it('should work if integrated but since no mockdata should error when run standalone', (done) => {
        try {
          a.getSecurityAdvisoriesBugidByBugId('fakedata', (data, error) => {
            try {
              if (stub) {
                const displayE = 'Error 400 received on request';
                runErrorAsserts(data, error, 'AD.500', 'Test-psirt-connectorRest-handleEndResponse', displayE);
              } else {
                runCommonAsserts(data, error);
              }
              saveMockData('Security', 'getSecurityAdvisoriesBugidByBugId', 'default', data);
              done();
            } catch (err) {
              log.error(`Test Failure: ${err}`);
              done(err);
            }
          });
        } catch (error) {
          log.error(`Adapter Exception: ${error}`);
          done(error);
        }
      }).timeout(attemptTimeout);
    });

    describe('#getSecurityAdvisoriesAci - errors', () => {
      it('should work if integrated but since no mockdata should error when run standalone', (done) => {
        try {
          a.getSecurityAdvisoriesAci('fakedata', (data, error) => {
            try {
              if (stub) {
                const displayE = 'Error 400 received on request';
                runErrorAsserts(data, error, 'AD.500', 'Test-psirt-connectorRest-handleEndResponse', displayE);
              } else {
                runCommonAsserts(data, error);
              }
              saveMockData('Security', 'getSecurityAdvisoriesAci', 'default', data);
              done();
            } catch (err) {
              log.error(`Test Failure: ${err}`);
              done(err);
            }
          });
        } catch (error) {
          log.error(`Adapter Exception: ${error}`);
          done(error);
        }
      }).timeout(attemptTimeout);
    });

    describe('#getSecurityAdvisoriesNxos - errors', () => {
      it('should work if integrated but since no mockdata should error when run standalone', (done) => {
        try {
          a.getSecurityAdvisoriesNxos('fakedata', (data, error) => {
            try {
              if (stub) {
                const displayE = 'Error 400 received on request';
                runErrorAsserts(data, error, 'AD.500', 'Test-psirt-connectorRest-handleEndResponse', displayE);
              } else {
                runCommonAsserts(data, error);
              }
              saveMockData('Security', 'getSecurityAdvisoriesNxos', 'default', data);
              done();
            } catch (err) {
              log.error(`Test Failure: ${err}`);
              done(err);
            }
          });
        } catch (error) {
          log.error(`Adapter Exception: ${error}`);
          done(error);
        }
      }).timeout(attemptTimeout);
    });
  });
});
