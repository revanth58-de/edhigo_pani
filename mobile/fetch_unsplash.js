const https = require('https');
const terms = ['farmer-sowing-seeds', 'farmer-driving-tractor', 'farmer-spraying-crops', 'farmer-plowing-field', 'harvesting-crops', 'farm-irrigation', 'farm-workers', 'combine-harvester'];

function searchUnsplash(term) {
  return new Promise(resolve => {
    https.get('https://unsplash.com/s/photos/' + term, { headers: { 'User-Agent': 'Mozilla/5.0' } }, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        const regex = /href="\/photos\/([a-zA-Z0-9-]+)"/g;
        let match;
        let found = null;
        while ((match = regex.exec(data)) !== null) {
          if (!match[1].startsWith('premium')) {
            found = match[1];
            break;
          }
        }
        resolve(found);
      });
    });
  });
}

async function run() {
  for (let term of terms) {
    let id = await searchUnsplash(term);
    console.log(term + ': ' + id);
  }
}
run();
