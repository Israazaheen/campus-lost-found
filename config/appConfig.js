'use strict';

/**
 * Single source of truth for application version and deployment message.
 * Both the website footer and the /version endpoint read from this file.
 * To release a new version, update this file and nothing else.
 */
module.exports = {
  appName:           'Campus Lost & Found',
  version:           '1.0.0',
  deploymentMessage: 'Deployment demonstration version 1.0.0',
};
