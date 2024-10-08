var express = require('express');
var router = express.Router();

router.get('/', function (req, res) {
  res.send('User profile page');
});

module.exports = router;
