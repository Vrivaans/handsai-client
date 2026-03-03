const express = require('express');
const { objectiveRouter } = require('@librechat/api');
const { requireJwtAuth, checkBan, uaParser } = require('~/server/middleware');

const router = express.Router();
router.use(requireJwtAuth);
router.use(checkBan);
router.use(uaParser);

router.use('/', objectiveRouter);

module.exports = router;
