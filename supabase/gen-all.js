/* รวมไฟล์ SQL ทั้ง 4 เป็นไฟล์เดียวตามลำดับที่ถูกต้อง — รัน: node supabase/gen-all.js */
const fs = require('fs');
const files = ['01_schema.sql', '02_views.sql', '03_rls.sql', '04_seed.sql'];
const bar = '═'.repeat(72);
const head = fs.readFileSync(__dirname + '/all-in-one.header.txt', 'utf8');
const body = files.map(f =>
  `\n\n-- ${bar}\n-- ▓▓▓  ${f}\n-- ${bar}\n\n` + fs.readFileSync(`${__dirname}/${f}`, 'utf8')
).join('\n');
fs.writeFileSync(__dirname + '/all-in-one.sql', head + body + '\n');
console.log('เขียน supabase/all-in-one.sql แล้ว');
