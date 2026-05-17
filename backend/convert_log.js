const fs = require('fs');
try {
  const content = fs.readFileSync('error.log', 'utf16le');
  fs.writeFileSync('error_utf8.log', content, 'utf8');
} catch (e) {
  console.error(e);
}
