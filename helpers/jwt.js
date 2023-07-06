/* eslint no-undef: "off" */
/* eslint  no-unused-expressions: "off" */
const jwt = require('jsonwebtoken');
require('dotenv').config();

exports.generateAccessToken = (user) => jwt.sign(user, process.env.ACCESS_TOKEN_SECRET, { expiresIn: '6h' });

exports.generateRefreshToken = (user) => jwt.sign(user, process.env.ACCESS_TOKEN_SECRET_REFRESH, { expiresIn: '72h' });

exports.generateAdminAccessToken = (user) => jwt.sign(user, process.env.ACCESS_TOKEN_SECRET, { expiresIn: '1h' });

exports.generateAdminRefreshToken = (user) => jwt.sign(user, process.env.ACCESS_TOKEN_SECRET_REFRESH, { expiresIn: '24h' });

exports.authenticateRefreshToken = (req, res, next) => {
  const authHeader = req.headers.authorization;
  const token = authHeader && authHeader.split(' ')[1];
  if (!token) return res.sendStatus(401);
  jwt.verify(token, process.env.ACCESS_TOKEN_SECRET_REFRESH, (err, user) => {
    if (err) return res.sendStatus(403);
    req.user = user;
    next();
  });
};

// authenticate access token
exports.authenticateAccessToken = (req, res, next) => {
  const authHeader = req.headers.authorization;
  const token = authHeader && authHeader.split(' ')[1];
  if (!token) return res.sendStatus(401);
  jwt.verify(token, process.env.ACCESS_TOKEN_SECRET, (err, user) => {
    if (err) return res.sendStatus(403);
    req.user = user;
    next();
  });
};
exports.authenticateToken = (req, res, next) => {
  const authHeader = req.headers.authorization;
  const token = authHeader && authHeader.split(' ')[1];

  if (token == null) return res.sendStatus(401);

  jwt.verify(token, process.env.ACCESS_TOKEN_SECRET, (err, user) => {
    if (err) return res.sendStatus(403);
    req.user = user;
    next();
  });
};

exports.authenticateTokenAdmin = (req, res, next) => {
  const authHeader = req.headers.authorization;
  const token = authHeader && authHeader.split(' ')[1];
  if (token == null) return res.sendStatus(401);
  jwt.verify(token, process.env.ACCESS_TOKEN_SECRET, (err, user) => {
    if (err) return res.sendStatus(403);
    if (user.role !== 'admin' && user.role !== 'superAdmin') return res.sendStatus(403);
    req.user = user;
    next();
  });
};

exports.authenticateTokenLawyer = (req, res, next) => {
  const authHeader = req.headers.authorization;
  const token = authHeader && authHeader.split(' ')[1];
  if (token == null) return res.sendStatus(401);

  jwt.verify(token, process.env.ACCESS_TOKEN_SECRET, (err, user) => {
    if (err) return res.sendStatus(403);
    if (user.role !== 'lawyer' && user.role !== 'admin' && user.role !== 'superAdmin') return res.sendStatus(403);
    req.user = user;
    next();
  });
};

exports.authenticateTokenGuest = (req, res, next) => {
  const authHeader = req.headers.authorization;
  const token = authHeader && authHeader.split(' ')[1];
  if (token == null) return res.sendStatus(401);

  jwt.verify(token, process.env.ACCESS_TOKEN_SECRET, (err, user) => {
    if (err) return res.sendStatus(403);
    if (user.role !== 'guest') return res.sendStatus(403);
    req.user = user;
    next();
  });
};

exports.authenticateTokenSuperAdmin = (req, res, next) => {
  const authHeader = req.headers.authorization;
  const token = authHeader && authHeader.split(' ')[1];
  if (token == null) return res.sendStatus(401);

  jwt.verify(token, process.env.ACCESS_TOKEN_SECRET, (err, user) => {
    if (err) return res.sendStatus(403);
    if (user.role !== 'superAdmin') return res.sendStatus(403);
    req.user = user;
    next();
  });
};
