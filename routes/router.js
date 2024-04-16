const express = require('express');
const router = express.Router();
const healthCheckMiddleware = require('../middlewares/healthCheck');
const { healthCheck, createUser, getUser, updateUser, verifyUser , verifyEmail } = require('../controllers/controllers');

router.get('/healthz', healthCheckMiddleware, healthCheck);
router.post('/v2/user', createUser); 
router.get('/v2/user/self', getUser); 
router.put('/v2/user/self', updateUser); 
router.get('/verify', verifyUser);
router.get('/v2/user/verify', verifyEmail);

router.all('/healthz', function(req, res) {
    res.status(405).send('Method Not Allowed');
  });

module.exports = router;
