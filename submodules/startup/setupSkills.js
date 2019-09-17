const botkitMongo = require('botkit-storage-mongo');

const path = require('path');
const fs = require('fs');

module.exports = controller => {
  const skillsPath = '../../skills';
  const normalizedSkillsSubfolderPath = path.join(__dirname, skillsPath);

  fs.readdirSync(normalizedSkillsSubfolderPath).forEach(file => {
    if (!file.endsWith('.js')) return;

    try {
      require(skillsPath + '/' + file)(controller);
      console.log(`Successfully loaded skill "${file.replace('.js','')}"`);
    } catch (e) {
      console.error(`Skill ${file} failed to load due to exception: `, e.stack || e.message || e);
    }
  });
};
