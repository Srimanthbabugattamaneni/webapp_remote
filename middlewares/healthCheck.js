const healthCheckMiddleware = (req, res, next) => {
    res.setHeader('Cache-Control', 'no-cache');

    if (req.method !== 'GET') {
        return res.status(405).send('');
    }

    if (Object.keys(req.body).length !== 0 || Object.keys(req.query).length !== 0) {
        return res.status(400).send();
    }

    next();
};

module.exports = healthCheckMiddleware;
