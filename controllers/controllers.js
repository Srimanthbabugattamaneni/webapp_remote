const sequelize = require('../config/database'); 
const User = require('../model/user'); 
const bcrypt = require('bcrypt');
const basicAuth = require('basic-auth');
const authenticate = require('../middlewares/basicAuth');
const logger = require('../logger');

const healthCheck = async (req, res) => {
    try {
        await sequelize.authenticate();
        logger.info({
          severity: 'INFO',
          message: 'Database connection successful'
        });
        res.status(200).send();
    } catch (error) {
      logger.error({
        severity: 'ERROR',
        message: 'Database connection failed'
      });
        res.status(503).send();
    }
};

const createUser = async (req, res) => {
  try {
      const { username, password, first_name, last_name } = req.body; 
  
      const existingUser = await User.findOne({ where: { username } });
      if (existingUser) {
        logger.debug({
          severity: 'DEBUG',
          message: 'Attempt to create a user that already exists'
        });
        return res.status(400).send('User already exists with this username.');
      }
      const hashedPassword = await bcrypt.hash(password, 10);
      const user = await User.create({
        username,
        password: hashedPassword,
        first_name, 
        last_name, 
        account_created: new Date(),
        account_updated: new Date()
      });
      logger.info({
        severity: 'INFO',
        message: 'user created sucessfully'
      });
      res.status(201).json({
        id: user.id,
        username: user.username,
        first_name: user.first_name, 
        last_name: user.last_name, 
        accountCreated: user.account_created,
        accountUpdated: user.account_updated
      });
    } catch (error) {
       console.error(error);
       logger.error({
        severity: 'ERROR',
        message: 'User creation failed'
      });
      res.status(400).send('please enter valid details');
    }
};


const getUser = async (req, res) => {
    try {
        const basic = basicAuth(req);
        const user = await User.findOne({ 
          where: { username: basic.name } 
        });
        if (user === null) {
          logger.error({
            severity: 'ERROR',
            message: 'Auth not provided correctly'
          });
          return res.status(400).json({ error: "User Not Found" });
      } else {
        const auth = await authenticate(req, user);
        if(auth){
          
          const users = user.toJSON();
        if('password' in users){
            delete users.password;
          }
          logger.info({
            severity: 'INFO',
            message: 'Auth successfull'
          });

          
          res.status(200).json(users);
        }
        else{
          logger.warn({
            severity: 'WARN',
            message: 'unauthorised  user'
          });
          res.status(401).send("Unauthorised User");
        }
      }
      } catch (error) {
        console.error(error);
        logger.error({
          severity: 'ERROR',
          message: 'details not provided correctly'
        });
        res.status(400).json('incorrect username and password');
      }
};
const updateUser = async (req, res) => {
  const username = req.body.username; 
  const { first_name, last_name, password } = req.body; 

 
  if (!first_name && !last_name && !password) {
    logger.info({
      severity: 'INFO',
      message: 'update successfull'
    });
      return res.status(204).send();
  }

  try {
      const user = await User.findOne({ where: { username } });
      if (!user) {
        logger.warn({
          severity: 'WARN',
          message: 'User not found'
        });
          return res.status(404).send('User not found.');
      } else {
          const auth = await authenticate(req, user);
          if (auth) {
              let isUpdated = false; 
              if (first_name && user.first_name !== first_name) {
                  user.first_name = first_name;
                  isUpdated = true;
              }
              if (last_name && user.last_name !== last_name) {
                  user.last_name = last_name;
                  isUpdated = true;
              }
              if (password) {
                  const hashedPassword = await bcrypt.hash(password, 10);
                  if (!await bcrypt.compare(password, user.password)) { 
                      user.password = hashedPassword;
                      isUpdated = true;
                  }
              }

              if (isUpdated) {
                  user.account_updated = new Date();
                  await user.save();
                  res.send('User updated successfully.');
              } else {
                logger.info({
                  severity: 'INFO',
                  message: 'update successfull'
                });

                  return res.status(204).send();
              }
          } else {
            logger.warn({
              severity: 'WARN',
              message: 'Unauthorized User of update'
            });
              res.status(401).send("Unauthorized User");
          }
      }
  } catch (error) {
      console.error(error);
      logger.error({
        severity: 'ERROR',
        message: 'error updating the user'
      });
      res.status(500).send('Error updating user.');
  }
};



module.exports = {
    healthCheck , createUser, updateUser, getUser
};
