const fs = require('fs');
const html = fs.readFileSync('index.html', 'utf8');
const js = fs.readFileSync('js/app.js', 'utf8');

// Find all IDs in index.html
const idRegex = /id=["']([^"']+)["']/g;
const ids = new Set();
let m;
while ((m = idRegex.exec(html)) !== null) {
  ids.add(m[1]);
}

// Find all $('id').addEventListener or document.getElementById('id').addEventListener
const addEventListenerRegex = /\$\(['"]([^'"]+)['"]\)\.addEventListener/g;
const unsafeCalls = [];
while ((m = addEventListenerRegex.exec(js)) !== null) {
  const id = m[1];
  if (!ids.has(id)) {
    unsafeCalls.push(id);
  }
}

const regex2 = /document\.getElementById\(['"]([^'"]+)['"]\)\.addEventListener/g;
while ((m = regex2.exec(js)) !== null) {
  const id = m[1];
  if (!ids.has(id)) {
    unsafeCalls.push('document.getElementById: ' + id);
  }
}

const regex3 = /document\.querySelector\(['"]#([^'"\s]+)['"]\)\.addEventListener/g;
while ((m = regex3.exec(js)) !== null) {
  const id = m[1];
  if (!ids.has(id)) {
    unsafeCalls.push('document.querySelector: #' + id);
  }
}

console.log('Unsafe calls:');
console.log(unsafeCalls);
