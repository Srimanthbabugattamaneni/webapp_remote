const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const User = sequelize.define('User', {
  id: {
    type: DataTypes.UUID,
    primaryKey: true,
    defaultValue: DataTypes.UUIDV4,
  },
  
  username: {
    type: DataTypes.STRING,
    allowNull: false,
    unique: true,
    validate: {
      isEmail: true,
    },
  },
  password: {
    type: DataTypes.STRING,
    allowNull: false,
  },
  first_name: { 
    type: DataTypes.STRING,
    allowNull: false
  },
  last_name: { 
    type: DataTypes.STRING,
    allowNull: false,
  },
  account_created: {
    type: DataTypes.DATE,
    defaultValue: DataTypes.NOW,
  },
  account_updated: {
    type: DataTypes.DATE,
    defaultValue: DataTypes.NOW,
  },
  isEmailVerified: {
    type: DataTypes.BOOLEAN,
    allowNull: false,
    defaultValue: false,  // Assuming new users are not verified by default
    },
  // create a new feiled to capture token
   verificationToken: {
    type: DataTypes.STRING,
   },
   tokenExpires: {
    type: DataTypes.DATE,
   },
   mailSentAt: {
    type:DataTypes.DATE,
   },
  
},
 {
  timestamps: false,
});

module.exports = User;
