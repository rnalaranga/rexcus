require('mysql2/promise').createConnection({
  host:'localhost',user:'root',password:'1234',database:'rex_erp'
}).then(async c => {
  const [wos] = await c.query("SELECT id, quoteId, notes FROM work_orders");
  for (const wo of wos) {
    if (wo.quoteId && (!wo.notes || wo.notes.startsWith('Imported from'))) {
      const [qs] = await c.query("SELECT data FROM quotations WHERE id = ?", [wo.quoteId]);
      if (qs.length > 0) {
        try {
          const snap = JSON.parse(qs[0].data);
          let newNotes = null;
          if (snap.jobItems && snap.jobItems.length > 0) {
            newNotes = snap.jobItems.map((ji, i) => `${i+1}. ${ji.text}`).join('\n');
          }
          if (newNotes) {
            await c.query("UPDATE work_orders SET notes = ? WHERE id = ?", [newNotes, wo.id]);
            console.log('Fixed notes for:', wo.id);
          }
        } catch(e) {}
      }
    }
  }
  c.end();
  console.log('DB Update complete');
}).catch(e => { console.error(e.message); });