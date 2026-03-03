'use strict';
/**
 * Thin wrapper around the Task Mongoose model from @librechat/data-schemas.
 * The Task schema is added by Jules' PR #1 (branch: jules-add-objective-task-schemas-...).
 * Once that PR is merged and the package rebuilt, this re-export resolves correctly.
 */
const { Task } = require('@librechat/data-schemas');

module.exports = Task;
