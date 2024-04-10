const express = require('express');
const sequelize = require('./config/database'); 
const router = require('./routes/router'); 

const app = express();

app.use(express.json());
app.use(router);

// Export the app instance for testing
module.exports = app;

sequelize.sync({ force: true }).then(() => {
  console.log('Database bootstrapped successfully');
  // Only start the server if not in test environment
  if (process.env.NODE_ENV !== 'test') {
    app.listen(5000, () => {
      console.log('Server is running on port 5000');
    });
  }
}).catch((error) => {
  console.error('Unable to sync the database:', error);
});


