const env = require('node-env-file');
env('./.env');

const SalesforceLib = require('../../submodules/sfLib/index');
const sfLib = new SalesforceLib();

(async () => {
  const caseNumber = '382233';
  var response = await sfLib.fetchCase(caseNumber);

  // do stuff with it
  console.log(`reply: `, response);
})();