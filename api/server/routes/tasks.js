const express = require('express');
const { taskRouter } = require('@librechat/api');
const { requireJwtAuth, checkBan, uaParser } = require('~/server/middleware');

const router = express.Router();
router.use(requireJwtAuth);
router.use(checkBan);
router.use(uaParser);

router.use('/', taskRouter);

module.exports = router;
