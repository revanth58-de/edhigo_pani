const fs = require('fs');
const path = require('path');

function walk(dir, callback) {
  fs.readdir(dir, (err, files) => {
    if (err) return;
    files.forEach(file => {
      let filepath = path.join(dir, file);
      fs.stat(filepath, (err, stat) => {
        if (err) return;
        if (stat.isDirectory()) {
          if (file !== 'node_modules' || dir === 'node_modules' || dir.includes('node_modules')) {
            walk(filepath, callback);
          }
        } else if (stat.isFile() && (file.endsWith('.js') || file.endsWith('.mjs') || file.endsWith('.ts') || file.endsWith('.tsx'))) {
          callback(filepath);
        }
      });
    });
  });
}

const nodeModulesPath = path.join(__dirname, 'node_modules');
console.log('Scanning node_modules for import.meta...');
walk(nodeModulesPath, (filepath) => {
  if (filepath.includes('babel') || filepath.includes('metro') || filepath.includes('acorn') || filepath.includes('typescript')) {
    return;
  }
  fs.readFile(filepath, 'utf8', (err, content) => {
    if (err) return;
    if (content.includes('import.meta')) {
      const lines = content.split('\n');
      lines.forEach((line, idx) => {
        if (line.includes('import.meta') && !line.trim().startsWith('*') && !line.trim().startsWith('//')) {
          console.log(`FOUND in ${filepath}:${idx + 1}`);
          console.log(`  > ${line.trim()}`);
        }
      });
    }
  });
});
