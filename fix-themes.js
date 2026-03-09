const fs = require('fs');
const path = require('path');

const dir = 'C:/Users/hardi/OneDrive/Desktop/project/GDG_Ai_nutritionist_frontend/src/components';

function replaceInFile(filePath) {
  let content = fs.readFileSync(filePath, 'utf8');
  let original = content;
  
  // Mass semantic replacement for light/dark mode compatibility
  content = content.replace(/border-white(\/\d+)?/g, 'border-border$1');
  content = content.replace(/bg-white(\/\d+)?/g, 'bg-foreground$1');
  content = content.replace(/hover:bg-white(\/\d+)?/g, 'hover:bg-foreground$1');
  content = content.replace(/hover:border-white(\/\d+)?/g, 'hover:border-border$1');
  // Be careful with text-white, mostly used against red or colored bgs. Leave text-white alone unless it's /opacity
  content = content.replace(/text-white(\/\d+)/g, 'text-foreground$1');
  content = content.replace(/from-white(\/\d+)?/g, 'from-foreground$1');
  content = content.replace(/ring-white(\/\d+)?/g, 'ring-border$1');
  content = content.replace(/placeholder:text-white(\/\d+)?/g, 'placeholder:text-muted');
  
  if (content !== original) {
    fs.writeFileSync(filePath, content, 'utf8');
    console.log(`Updated ${filePath}`);
  }
}

function walkDir(d) {
  fs.readdirSync(d).forEach(f => {
    let fullPath = path.join(d, f);
    if (fs.statSync(fullPath).isDirectory()) {
      walkDir(fullPath);
    } else if (f.endsWith('.js')) {
      replaceInFile(fullPath);
    }
  });
}

walkDir(dir);
console.log('Complete!');
