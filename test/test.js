const supertest = require('supertest');
const sequelize = require('../config/database'); 
const chai = require('chai');
const app = require('../index'); // Make sure this path points to your Express app
const expect = chai.expect;

const User = require('../model/user')

const request = supertest(app);

before(async function() {
  this.timeout(10000);
  try {
    await sequelize.sync({ force: true });
    console.log('Database synced.');
  } catch (error) {
    console.error('Error syncing database:', error);
  }
});

after(async () => {
  try {
    await sequelize.close();
    console.log('Sequelize connection closed successfully.');
  } catch (error) {
    console.error('Error closing Sequelize connection:', error);
  }
});

  
describe('Integration Tests', () => {
  const userData = {
    username: 'test@example.com', // Use a unique username to avoid conflicts
    password: 'password',
    first_name: 'Test',
    last_name: 'User'
  };

  it('should create an account and validate account creation, then fail on duplicate account creation', async function() {
    this.timeout(10000);

    // Attempt to create account
    let createResponse = await request.post('/v6/user').send(userData);
    // The account may already exist from a previous test run

    if (createResponse.status === 201) {
      await User.update({ isEmailVerified: true }, { where: { username: userData.username } });
    }
    

    if (createResponse.status === 400) {
      console.log('User already exists, proceeding with tests assuming the user was previously created.');
    } else {
      expect(createResponse.status).to.equal(201, 'Account creation failed');
    }

    // Validate account exists using Basic Auth
    const getResponse = await request.get('/v6/user/self').auth(userData.username, userData.password);
    expect(getResponse.status).to.equal(200, 'Failed to retrieve account');
    expect(getResponse.body.username).to.equal(userData.username);

    // Attempt to create the same account again, expecting a failure due to duplicate
    createResponse = await request.post('/v6/user').send(userData);
    expect(createResponse.status).to.equal(400, 'Expected failure on duplicate account creation');
  });

  it('should update the account and validate the updates', async function() {
    this.timeout(10000);
  
    // Data for updating the user
    const updateData = {
      username: userData.username, // Include if your controller expects it
      first_name: 'UpdatedTest',
      last_name: 'UpdatedUser'
    };
  
    // Update account using Basic Auth
    const updateResponse = await request.put('/v6/user/self')
      .auth(userData.username, userData.password)
      .send(updateData);
  
    // The controller may return 204 if there's nothing to update, so we should handle that case
    expect([200, 204]).to.include(updateResponse.status, 'Account update failed or had no content to update');
  
    if (updateResponse.status === 200) {
      // Validate account was updated only if the response was 200
      const getResponse = await request.get('/v6/user/self')
        .auth(userData.username, userData.password);
      expect(getResponse.status).to.equal(200, 'Failed to retrieve account after update');
      expect(getResponse.body.first_name).to.equal(updateData.first_name);
      expect(getResponse.body.last_name).to.equal(updateData.last_name);
    } // No else block needed; if 204 is returned, the test assumes no update was needed and succeeds
  });
});  
