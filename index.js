const express = require('express');
const sequelize = require('./config/database'); 
const router = require('./routes/router'); 

const app = express();

app.use(express.json());
app.use(router);

sequelize.sync({ force: true }).then(() => {
  console.log('Database bootstrapped successfully');
  app.listen(5000, () => {
    console.log('Server is running on port 5000');
  });
}).catch((error) => {
  console.error('Unable to sync the database:', error);
});


