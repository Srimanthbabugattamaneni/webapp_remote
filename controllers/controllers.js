const sequelize = require('../config/database'); 
const User = require('../model/user'); 
const bcrypt = require('bcrypt');
const basicAuth = require('basic-auth');
const authenticate = require('../middlewares/basicAuth');
const logger = require('../logger');
const { PubSub } = require('@google-cloud/pubsub');
const { formatISO, addMinutes } = require('date-fns');

 

const pubSubClient = new PubSub({
  projectId: process.env.cloud_project
});

// Helper function to generate a verification link
function generateVerificationLink(userId, expiresTime) {
  return `https://gsbcloudservices.me:5000/verify?userId=${userId}&expires=${encodeURIComponent(formatISO(expiresTime))}`;
}

// Function to create the message payload
function createMessagePayload(userId, username, first_name, last_name, expiresTime) {
  return JSON.stringify({
    userId,
    username,
    fullName: `${first_name} ${last_name}`,
    verificationLink: generateVerificationLink(userId, expiresTime)
  });
}

// Function to publish a message to a Pub/Sub topic
async function publishMessage(topicName, messageData) {
  const messageBuffer = Buffer.from(messageData);
  await pubSubClient.topic(topicName).publishMessage({ data: messageBuffer });
}

// The main function to publish the verification message
async function publishVerificationMessage(userId, username, first_name, last_name) {
  const expiresTime = addMinutes(new Date(), 2);
  const messageData = createMessagePayload(userId, username, first_name, last_name, expiresTime);
  
  try {
    await publishMessage('projects/devproject-414921/topics/verify_email', messageData);
    logger.info(`Verification email message published for user ${username}`);
  } catch (error) {
    logger.error(`Failed to publish verification email message for user ${userId}`, error);
  }
}



const healthCheck = async (req, res) => {
    try {
        await sequelize.authenticate();
        logger.debug({
          severity: 'DEBUG',
          message: 'Attempt to db connection'
        });
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
        logger.warn({
          severity: 'WARN',
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
      await publishVerificationMessage(user.id, username , first_name, last_name);
      await user.update({ mailSentAt: new Date() });

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

const verifyUser = async (req, res) => {
  const { id, token } = req.query; // Use a token instead of an expiration time

  if (!id) {
    logger.warn('User ID is missing');
    return res.status(400).json({ message: 'User ID is missing.' });
  }
  if (!token) {
    logger.warn('Verification token is missing');
    return res.status(400).json({ message: 'Verification token is missing.' });
  }

  const timestamp=User.mailSentAt;
  const currenttime= new Date();
  const differnece=(currenttime-new Date(timestamp))
  if(differnece>2) return res.status(400).json({message:'verified'})


  try {
    const user = await User.findByPk(id);

    if (!user) {
      logger.warn(`User not found during verification: ${id}`);
      return res.status(404).json({ message: 'User not found.' });
    }

    if (user.verificationToken !== token || new Date() > user.tokenExpires) {
      return res.status(400).json({ message: 'Invalid or expired verification token.' });
    }

    if (user.isEmailVerified) {
      logger.info(`User already verified: ${id}`);
      return res.status(400).json({ message: 'User already verified.' });
    }

    user.isEmailVerified = true;
    user.verificationToken = null; // Clear the token after verification
    await user.save();

    logger.info(`User email verified: ${id}`);
    res.status(200).json({ message: 'Email successfully verified.' });
  } catch (error) {
    logger.error('Email verification failed', error);
    res.status(500).json({ message: 'Failed to verify email.' });
  }
};


const verifyEmail = async (req, res) => {
  const { token } = req.query;

  if (!token) {
    return res.status(400).json({ message: 'Verification token is required.' });
  }

  try {
    const user = await User.findOne({
      where: { verificationToken: token, tokenExpires: { [Op.gt]: new Date() } }
    });

    if (!user) {
      return res.status(404).json({ message: 'Invalid or expired verification token.' });
    }

    user.isEmailVerified = true;
    await user.save();

    res.status(200).json({ message: 'Email successfully verified.' });
  } catch (error) {
    console.error('Verification error:', error);
    res.status(500).json({ message: 'Internal server error during verification.' });
  }
};

  

const getUser = async (req, res) => {
    try {
        const basic = basicAuth(req);
        const user = await User.findOne({ 
          where: { username: basic.name } 
        });
        if (user === null) {
          logger.warn({
            severity: 'WARN',
            message: 'Auth not provided correctly'
          });
          return res.status(400).json({ error: "User Not Found" });
      } if (!user.isEmailVerified) {
        logger.warn('Email not verified');
        return res.status(403).json({ message: "Please verify your email to proceed." });
      } 
      else {
        const auth = await authenticate(req, user);
        if(auth){
          
          const users = user.toJSON();
        if('password' in users){
            delete users.password;
          }
          ///// email isverifed 
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
      }
      if (!user.isEmailVerified) {
        logger.warn('Email not verified');
        return res.status(403).json({ message: "Please verify your email to proceed." });
      }
     else {
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
    healthCheck , createUser, updateUser, getUser, verifyUser, publishVerificationMessage , verifyEmail
    
};

publishVerificationMessage('123', 'john_doe', 'John', 'Doe')
  .then(() => console.log('Message published successfully'))
  .catch(console.error);
