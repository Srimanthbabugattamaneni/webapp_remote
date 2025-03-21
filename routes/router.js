const express = require('express');
const router = express.Router();
const healthCheckMiddleware = require('../middlewares/healthCheck');
const { healthCheck, createUser, getUser, updateUser, verifyUser , verifyEmail } = require('../controllers/controllers');

router.get('/healthz', healthCheckMiddleware, healthCheck);
router.post('/v1/user', createUser); 
router.get('/v1/user/self', getUser); 
router.put('/v1/user/self', updateUser); 
router.get('/verify', verifyUser);
router.get('/v1/user/verify', verifyEmail);

router.all('/healthz', function(req, res) {
    res.status(405).send('Method Not Allowed');
  });

module.exports = router;
