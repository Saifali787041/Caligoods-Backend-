'use strict';
const catchAsync = require('../../utils/catchAsync');
const { success } = require('../../helpers/apiResponse');
const taxonomy = require('../../services/inventory/taxonomy.service');

const opts = (req) => ({ refresh: req.query.refresh === 'true' });

const categories = catchAsync(async (req, res) =>
  success(res, { message: 'Categories (derived from items)', data: await taxonomy.getCategories(opts(req)) }));

const brands = catchAsync(async (req, res) =>
  success(res, { message: 'Brands (derived from items)', data: await taxonomy.getBrands(opts(req)) }));

const units = catchAsync(async (req, res) =>
  success(res, { message: 'Units (derived from items)', data: await taxonomy.getUnits(opts(req)) }));

module.exports = { categories, brands, units };
