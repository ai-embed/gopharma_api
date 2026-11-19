const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

function fixImportsInDir(dir) {
  const files = fs.readdirSync(dir, { withFileTypes: true });
  
  for (const file of files) {
    const fullPath = path.join(dir, file.name);
    
    if (file.isDirectory()) {
      fixImportsInDir(fullPath);
    } else if (file.name.endsWith('.ts')) {
      let content = fs.readFileSync(fullPath, 'utf8');
      let modified = false;
      
      // Replace all 'src/' imports with relative paths
      const lines = content.split('\n');
      const newLines = lines.map(line => {
        if (line.includes("from 'src/")) {
          modified = true;
          const currentDir = path.dirname(fullPath);
          const relativePath = path.relative(currentDir, path.join(process.cwd(), 'src'));
          const importPath = line.match(/from 'src\/([^']+)'/)[1];
          const targetPath = path.join(relativePath, importPath).replace(/\\/g, '/');
          const normalizedPath = targetPath.startsWith('../') ? targetPath : './' + targetPath;
          return line.replace(/from 'src\/[^']+'/, `from '${normalizedPath}'`);
        }
        return line;
      });
      
      if (modified) {
        fs.writeFileSync(fullPath, newLines.join('\n'), 'utf8');
        console.log(`Fixed imports in: ${fullPath}`);
      }
    }
  }
}

// Fix imports in src directory
const srcDir = path.join(__dirname, '../src');
console.log('Fixing imports...');
fixImportsInDir(srcDir);
console.log('Imports fixed successfully!');
