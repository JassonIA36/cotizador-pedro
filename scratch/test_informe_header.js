const fs = require('fs');
const path = require('path');

console.log('--- TEST: Informe Header Layout & Multi-Page Margins ---');

// 1. Read files
const cssContent = fs.readFileSync(path.join(__dirname, '..', 'css', 'app.css'), 'utf8');
const appJsContent = fs.readFileSync(path.join(__dirname, '..', 'js', 'app.js'), 'utf8');
const pdfGenContent = fs.readFileSync(path.join(__dirname, '..', 'js', 'pdf-generator.js'), 'utf8');

// 2. Validate CSS rules
console.log('\n[1] Checking CSS rules in app.css...');
const cssChecks = [
  { name: '.doc-informe-header-row has display: flex', regex: /\.doc-informe-header-row\s*\{[^}]*display:\s*flex;/ },
  { name: '.doc-informe-header-row has gap: 16px', regex: /\.doc-informe-header-row\s*\{[^}]*gap:\s*16px;/ },
  { name: '.doc-informe-header-logo has max-height: 60px', regex: /\.doc-informe-header-logo[^\{]*\{[^}]*max-height:\s*60px;/ },
  { name: '.doc-informe-header-logo has object-fit: contain', regex: /\.doc-informe-header-logo[^\{]*\{[^}]*object-fit:\s*contain;/ },
  { name: '.doc-informe-header-logo has flex-shrink: 0', regex: /\.doc-informe-header-logo[^\{]*\{[^}]*flex-shrink:\s*0;/ },
  { name: '.doc-informe-title-block has margin-top: 16px', regex: /\.doc-informe-title-block\s*\{[^}]*margin-top:\s*16px;/ },
  { name: 'Print mode suppresses decorative before bar', regex: /\.doc-informe-paper::before\s*\{[^}]*display:\s*none\s*!important;/ },
  { name: 'Print mode reserves top padding', regex: /\.doc-informe-paper\s*\{[^}]*padding:\s*10px\s*0/ }
];

let cssPassed = 0;
for (const check of cssChecks) {
  if (check.regex.test(cssContent)) {
    console.log(`  ✓ ${check.name}`);
    cssPassed++;
  } else {
    console.error(`  ✗ FAIL: ${check.name}`);
  }
}
if (cssPassed !== cssChecks.length) {
  process.exit(1);
}

// 3. Test HTML rendering via string parsing
console.log('\n[2] Testing HTML output with logo ON and logo OFF...');

function escapeHtml(str) {
  if (!str) return '';
  return String(str).replace(/[&<>"']/g, m => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#039;'
  })[m]);
}

const mockDataWithLogo = {
  headerTag: 'SERVICIO TÉCNICO · INFORME DE DIAGNÓSTICO',
  title: 'INFORME TÉCNICO',
  subtitle: 'Diagnóstico general de hardware',
  number: 'INF-2026-001',
  showNumber: true,
  includeLogo: true
};

const mockDataWithoutLogo = {
  headerTag: 'SERVICIO TÉCNICO · INFORME DE DIAGNÓSTICO',
  title: 'INFORME TÉCNICO',
  subtitle: 'Diagnóstico general de hardware',
  number: 'INF-2026-001',
  showNumber: true,
  includeLogo: false
};

const fnMatch = appJsContent.match(/function renderInformeHeaderHtml\(data\) \{([\s\S]*?)\n  \}/);
if (!fnMatch) {
  console.error('  ✗ Could not find renderInformeHeaderHtml in js/app.js');
  process.exit(1);
}

const renderInformeHeaderHtml = new Function('data', 'escapeHtml', `
  ${fnMatch[1]}
`);

const htmlWithLogo = renderInformeHeaderHtml(mockDataWithLogo, escapeHtml);
const htmlWithoutLogo = renderInformeHeaderHtml(mockDataWithoutLogo, escapeHtml);

console.log('  Logo ON test:');
const hasLogoRow = htmlWithLogo.includes('doc-informe-header-row');
const hasLogoImg = htmlWithLogo.includes('doc-informe-header-logo');
const hasTitleBlock = htmlWithLogo.includes('doc-informe-title-block');
const hasTag = htmlWithLogo.includes('doc-informe-header-tag');

console.log('    - Header row present:', hasLogoRow);
console.log('    - Logo img present:', hasLogoImg);
console.log('    - Tag present:', hasTag);
console.log('    - Title block present:', hasTitleBlock);

if (!hasLogoRow || !hasLogoImg || !hasTitleBlock || !hasTag) {
  console.error('  ✗ HTML structure missing expected classes with logo ON');
  process.exit(1);
}

console.log('  Logo OFF test:');
const hasLogoImgOff = htmlWithoutLogo.includes('doc-informe-header-logo');
const hasTagOff = htmlWithoutLogo.includes('doc-informe-header-tag');
console.log('    - Logo img absent (0 space):', !hasLogoImgOff);
console.log('    - Tag present in row:', hasTagOff);

if (hasLogoImgOff) {
  console.error('  ✗ Logo element still present in HTML when includeLogo = false');
  process.exit(1);
}

// 4. Test jsPDF multi-page logic
console.log('\n[3] Testing jsPDF generation logic in pdf-generator.js...');
const jsPdfChecks = [
  { name: 'Logo positioned at left margin (x = margin)', regex: /doc\.addImage\(window\.PEDRO_ROA_LOGO,\s*'PNG',\s*margin,\s*yPos,\s*logoSize,\s*logoSize\)/ },
  { name: 'Header tag drawn at right in row 1', regex: /doc\.text\(headerTag,\s*pageWidth\s*-\s*margin,\s*yPos\s*\+\s*8\.5/ },
  { name: 'Margin to title block is at least 16px (6mm ~ 23px)', regex: /yPos\s*\+=\s*logoSize\s*\+\s*6/ },
  { name: 'Logo disabled takes 0 space on left', regex: /doc\.text\(headerTag,\s*pageWidth\s*-\s*margin,\s*yPos\s*\+\s*4/ },
  { name: 'checkPageBreak reserves top margin (yPos = 26)', regex: /yPos\s*=\s*26;/ },
  { name: 'Running header only drawn on page > 1', regex: /if\s*\(p\s*>\s*1\)\s*\{\s*doc\.setFont/ }
];

let jsPdfPassed = 0;
for (const check of jsPdfChecks) {
  if (check.regex.test(pdfGenContent)) {
    console.log(`  ✓ ${check.name}`);
    jsPdfPassed++;
  } else {
    console.error(`  ✗ FAIL: ${check.name}`);
  }
}
if (jsPdfPassed !== jsPdfChecks.length) {
  process.exit(1);
}

console.log('\nALL CODE AND LOGIC CHECKS PASSED SUCCESSFULLY!');
