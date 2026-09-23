require('mysql2/promise').createConnection({
  host:'localhost',user:'root',password:'1234',database:'rex_erp'
}).then(async c => {
  const [wos] = await c.query("SELECT id, title FROM work_orders WHERE title LIKE 'WO: %'");
  console.log('Found:', wos.length, 'bad titles');
  for (const wo of wos) {
    const cleanTitle = wo.title.replace(/^WO:\s*/, '').trim();
    await c.query('UPDATE work_orders SET title=? WHERE id=?', [cleanTitle, wo.id]);
    console.log('Fixed:', wo.id, '->', cleanTitle);
  }
  c.end();
}).catch(e => { console.error(e.message); });