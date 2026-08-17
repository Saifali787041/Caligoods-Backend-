'use strict';
const catchAsync = require('../../utils/catchAsync');
const { success } = require('../../helpers/apiResponse');
const audit = require('../../services/admin/auditLog.service');

const list = catchAsync(async (req, res) => {
  const { logs, meta } = await audit.list(req.query);
  return success(res, { message: 'Audit logs fetched', data: logs, meta });
});

module.exports = { list };
