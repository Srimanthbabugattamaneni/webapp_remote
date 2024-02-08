const sequelize = require('../config/database'); 
const User = require('../model/user'); 
const bcrypt = require('bcrypt');
const basicAuth = require('basic-auth');
const authenticate = require('../middlewares/basicAuth');

const healthCheck = async (req, res) => {
    try {
        await sequelize.authenticate();
        res.status(200).send();
    } catch (error) {
        res.status(503).send();
    }
};

const createUser = async (req, res) => {
  try {
      const { username, password, first_name, last_name } = req.body; 
  
      const existingUser = await User.findOne({ where: { username } });
      if (existingUser) {
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
          return res.status(400).json({ error: "User Not Found" });
      } else {
        const auth = await authenticate(req, user);
        if(auth){
          
          const users = user.toJSON();
        if('password' in users){
            delete users.password;
          }

          
          res.status(200).json(users);
        }
        else{
          res.status(401).send("Unauthorised User");
        }
      }
      } catch (error) {
        console.error(error);
        res.status(400).json('incorrect username and password');
      }
};
const updateUser = async (req, res) => {
  const username = req.body.username; 
  const { first_name, last_name, password } = req.body; 

 
  if (!first_name && !last_name && !password) {
      return res.status(204).send();
  }

  try {
      const user = await User.findOne({ where: { username } });
      if (!user) {
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
                  return res.status(204).send();
              }
          } else {
              res.status(401).send("Unauthorized User");
          }
      }
  } catch (error) {
      console.error(error);
      res.status(500).send('Error updating user.');
  }
};



module.exports = {
    healthCheck , createUser, updateUser, getUser
};
