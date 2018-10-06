var express = require('express');

var router = express.Router();
var rates = require('./api/rates.route');

router.use('/rates', rates);

module.exports = router;