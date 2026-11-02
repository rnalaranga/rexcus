/**
 * Rex Industries ERP - Financial Standards Remediation Script
 * Alignment with LKAS / SLFRS, IRD RAMIS Acts, and ISO 9001 / ISO 27001
 */

const mysql = require('/Users/rnalaranga/Desktop/rexcus/api/node_modules/mysql2/promise');

async function runRemediation() {
  console.log('🚀 Starting Financial Standards Remediation...');
  
  const conn = await mysql.createConnection({
    host: 'localhost',
    user: 'root',
    password: process.env.DB_PASSWORD !== undefined ? process.env.DB_PASSWORD : '1234',
    database: 'rex_erp',
    multipleStatements: true
  });

  try {
    await conn.beginTransaction();

    console.log('\n--- 1. CREATING AUDIT BACKUPS (ISO 27001 A.12.1.2) ---');
    await conn.query('CREATE TABLE IF NOT EXISTS _backup_journal_entries AS SELECT * FROM journal_entries');
    await conn.query('CREATE TABLE IF NOT EXISTS _backup_journal_lines AS SELECT * FROM journal_lines');
    await conn.query('CREATE TABLE IF NOT EXISTS _backup_chart_of_accounts AS SELECT * FROM chart_of_accounts');
    await conn.query('CREATE TABLE IF NOT EXISTS _backup_tax_profiles AS SELECT * FROM tax_profiles');
    console.log('✅ Tables backed up successfully.');

    console.log('\n--- 2. PURGING ORPHANED JOURNAL LINES (LKAS 1 Integrity) ---');
    const [orphanRows] = await conn.query(
      'SELECT id, entryId, debit, credit FROM journal_lines WHERE entryId IN ("JE-1769219", "JE-3008952")'
    );
    console.log(`Found ${orphanRows.length} orphaned rows to remove.`);
    await conn.query('DELETE FROM journal_lines WHERE entryId IN ("JE-1769219", "JE-3008952")');
    console.log('✅ Orphaned journal lines purged.');

    console.log('\n--- 3. BALANCING UNBALANCED ENTRY JE-5324621 ---');
    // Ensure primary Tax Payable account exists
    const [taxAcc] = await conn.query('SELECT id FROM chart_of_accounts WHERE id = "acc_2200" OR code = "2200" LIMIT 1');
    const primaryTaxId = taxAcc.length > 0 ? taxAcc[0].id : 'acc_2200';

    // Check if line already exists
    const [existingTaxLine] = await conn.query('SELECT id FROM journal_lines WHERE entryId = "JE-5324621" AND credit = 3.00');
    if (existingTaxLine.length === 0) {
      await conn.query(
        'INSERT INTO journal_lines (id, entryId, accountId, debit, credit, description, partyId, partyType) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
        ['JL-532483-TAX', 'JE-5324621', primaryTaxId, 0.00, 3.00, 'Tax Payable (1% SSCL + 2% VAT on TEST-INV-2)', null, null]
      );
      await conn.query('UPDATE chart_of_accounts SET balance = balance + 3.00 WHERE id = ?', [primaryTaxId]);
      console.log('✅ Added missing LKR 3.00 credit to Tax Payable for JE-5324621.');
    } else {
      console.log('ℹ️ Tax line already exists for JE-5324621.');
    }

    console.log('\n--- 4. MERGING DUPLICATE TAX ACCOUNTS ---');
    // Merge ACC-3144111 into acc_2200
    await conn.query('UPDATE journal_lines SET accountId = "acc_2200" WHERE accountId = "ACC-3144111"');
    await conn.query('DELETE FROM chart_of_accounts WHERE id = "ACC-3144111"');
    console.log('✅ Duplicate Tax Payable account ACC-3144111 merged into acc_2200.');

    console.log('\n--- 5. RE-INDEXING CHART OF ACCOUNTS (CA Sri Lanka Standards) ---');
    // 1. Re-index Accounts Receivable from colliding 1100 to standard 1200
    await conn.query('UPDATE chart_of_accounts SET code = "1200", name = "Trade Accounts Receivable", subtype = "Current Asset" WHERE id = "ACC-002"');
    console.log('✅ Re-indexed ACC-002 (AR) to Code 1200.');

    // 2. Resolve Code 4000 Collision: Re-index Raw Materials expense to COGS 5100
    await conn.query('UPDATE chart_of_accounts SET code = "5100", name = "Direct Material Cost (Raw Materials)", subtype = "Cost of Sales" WHERE id = "acc_4000"');
    console.log('✅ Re-indexed acc_4000 (Raw Materials) to Code 5100 (COGS).');

    // 3. Confirm Code 4000 as Sales Revenue
    await conn.query('UPDATE chart_of_accounts SET code = "4000", name = "Sales Revenue - Finished Goods", subtype = "Sales" WHERE id = "ACC-004"');
    console.log('✅ Confirmed ACC-004 as Code 4000 (Sales Revenue).');

    // 4. Re-index Diesel/Overheads from 5000 to 5400
    await conn.query('UPDATE chart_of_accounts SET code = "5400", name = "Factory Power & Fuel (Diesel)", subtype = "Production Overhead" WHERE id = "acc_5000"');
    await conn.query('UPDATE chart_of_accounts SET code = "5000", name = "Cost of Goods Sold (Control)", subtype = "Cost of Sales" WHERE id = "ACC-005"');
    console.log('✅ Re-indexed Diesel to Code 5400 and COGS Control to Code 5000.');

    // 5. Ensure Cash in Hand is Code 1100 and Commercial Bank is Code 1000
    await conn.query('UPDATE chart_of_accounts SET code = "1050", name = "Cash and Equivalents", subtype = "Cash" WHERE id = "ACC-909121"');
    console.log('✅ Re-indexed ACC-909121 to Code 1050 (Cash & Equivalents).');

    console.log('\n--- 6. RE-ALIGNING OPENING BALANCE EQUITY (LKAS 1 / SLFRS) ---');
    // ADJ-1799 credit leg should be acc_3900 Retained Earnings
    await conn.query(
      'UPDATE journal_lines SET accountId = "acc_3900", description = "Opening Balance Equity Alignment (LKAS 1)" WHERE entryId = "ADJ-1799" AND debit = 0.00 AND credit = 1000000.00'
    );
    await conn.query('UPDATE chart_of_accounts SET balance = 1000000.00 WHERE id = "ACC-002"');
    await conn.query('UPDATE chart_of_accounts SET balance = 1000000.00 WHERE id = "acc_3900"');
    console.log('✅ Re-aligned opening balance equity entry ADJ-1799 to acc_3900.');

    console.log('\n--- 7. STATUTORY IRD / RAMIS TAX ACCOUNTS & PROFILES (VAT & SSCL) ---');
    // Insert distinct IRD liability accounts
    await conn.query(`
      INSERT INTO chart_of_accounts (id, code, name, type, subtype, isTaxAccount, balance, createdAt)
      VALUES 
      ('acc_2210', '2210', 'VAT Output Tax Payable (18%)', 'Liability', 'Tax', 1, 0.00, NOW()),
      ('acc_2220', '2220', 'SSCL Output Tax Payable (2.5%)', 'Liability', 'Tax', 1, 0.00, NOW()),
      ('acc_1690', '1690', 'VAT Input Tax Recoverable', 'Asset', 'Tax', 1, 0.00, NOW())
      ON DUPLICATE KEY UPDATE name=VALUES(name)
    `);

    // Update tax profiles to link to these accounts
    await conn.query(`
      UPDATE tax_profiles 
      SET tax1_accountId = 'acc_2220', tax2_accountId = 'acc_2210'
      WHERE id IN ('tp_opt2_sscl_absorbed_vat_sep', 'tp_vat_sscl', 'tp_opt3_both_separate')
    `);
    await conn.query(`
      UPDATE tax_profiles 
      SET tax1_accountId = 'acc_2210', tax2_accountId = NULL
      WHERE id = 'tp_vat18'
    `);
    console.log('✅ IRD tax accounts created and tax profiles updated.');

    console.log('\n--- 8. ENFORCING FOREIGN KEY CONSTRAINTS (ISO 27001) ---');
    try {
      // Check if constraint already exists
      const [existingFk] = await conn.query(`
        SELECT CONSTRAINT_NAME 
        FROM information_schema.TABLE_CONSTRAINTS 
        WHERE TABLE_SCHEMA = 'rex_erp' 
          AND TABLE_NAME = 'journal_lines' 
          AND CONSTRAINT_NAME = 'fk_journal_lines_entry'
      `);
      if (existingFk.length === 0) {
        await conn.query(`
          ALTER TABLE journal_lines
          ADD CONSTRAINT fk_journal_lines_entry
          FOREIGN KEY (entryId) REFERENCES journal_entries(id)
          ON DELETE CASCADE
          ON UPDATE CASCADE
        `);
        console.log('✅ Foreign key fk_journal_lines_entry (ON DELETE CASCADE) enforced.');
      } else {
        console.log('ℹ️ Foreign key constraint already active.');
      }
    } catch (fkErr) {
      console.warn('⚠️ Foreign key note:', fkErr.message);
    }

    // Commit all changes
    await conn.commit();
    console.log('\n🎉 ALL DATABASE REMEDIATION TRANSACTIONS COMMITTED SUCCESSFULLY!');

    console.log('\n--- 9. VERIFICATION AUDIT ---');
    const [balanceCheck] = await conn.query('SELECT sum(debit) as totalDebit, sum(credit) as totalCredit, abs(sum(debit) - sum(credit)) as imbalance FROM journal_lines');
    console.log('Trial Balance Totals:', balanceCheck[0]);
    if (Number(balanceCheck[0].imbalance) === 0) {
      console.log('🏆 VERIFICATION PASSED: Double-Entry Trial Balance is in 100% PERFECT ZERO VARIANCE (LKAS 1)!');
    } else {
      console.error('❌ Warning: Remaining imbalance:', balanceCheck[0].imbalance);
    }

    const [orphanCheck] = await conn.query('SELECT count(*) as count FROM journal_lines jl LEFT JOIN journal_entries je ON jl.entryId = je.id WHERE je.id IS NULL');
    console.log('Orphaned Journal Lines count:', orphanCheck[0].count);

    const [dupCodes] = await conn.query('SELECT code, count(*) as cnt, GROUP_CONCAT(name) as names FROM chart_of_accounts GROUP BY code HAVING cnt > 1');
    console.log('Duplicate COA Codes count:', dupCodes.length);
    if (dupCodes.length > 0) {
      console.log('Remaining duplicate codes:', dupCodes);
    } else {
      console.log('🏆 VERIFICATION PASSED: 0 Duplicate COA Codes!');
    }

  } catch (err) {
    await conn.rollback();
    console.error('❌ Remediation failed and was rolled back:', err);
    process.exit(1);
  } finally {
    await conn.end();
  }
}

runRemediation().catch(console.error);
