import subprocess
import re
import json
import os

print("=" * 60)
print("  Rex ERP - Binlog Quotation Recovery Tool")
print("  Scanning for RSSQ-2205, RSSQ-2207 (and 2206/2208)...")
print("=" * 60)

targets = ["2205", "2206", "2207", "2208"]

cmd = "sudo mysqlbinlog -v --base64-output=DECODE-ROWS /var/lib/mysql/*bin*.[0-9]*"
proc = subprocess.Popen(cmd, shell=True, stdout=subprocess.PIPE, stderr=subprocess.DEVNULL, text=True, errors='replace')

recovered = {}
in_quote_event = False
fields = {}
current_key = None
current_val = []

def save_current():
    global fields, current_key, current_val
    if current_key is not None:
        fields[current_key] = "\n".join(current_val)
    if fields:
        raw_fields_str = " ".join(str(v) for v in fields.values())
        for t in targets:
            if t in raw_fields_str:
                q_no = fields.get(13, '').strip('\' "')
                if not q_no or q_no == 'NULL':
                    m = re.search(r'"quotationNo"\s*:\s*"([^"]+)"', raw_fields_str)
                    q_no = m.group(1) if m else f"RSSQ-{t}"
                if t in q_no:
                    new_len = len(str(fields.get(5, '')))
                    old_len = len(str(recovered.get(q_no, {}).get(5, '')))
                    if new_len >= old_len:
                        recovered[q_no] = dict(fields)
    fields = {}
    current_key = None
    current_val = []

for line in proc.stdout:
    if "Table_map: `rex_erp`.`quotations`" in line or "UPDATE `rex_erp`.`quotations`" in line or "INSERT INTO `rex_erp`.`quotations`" in line or "DELETE FROM `rex_erp`.`quotations`" in line:
        in_quote_event = True
    elif line.startswith("# at ") or line.startswith("COMMIT"):
        if in_quote_event:
            save_current()
            in_quote_event = False
    elif in_quote_event:
        if line.startswith("### SET") or line.startswith("### WHERE"):
            save_current()
        elif line.startswith("###   @"):
            m = re.match(r"^###\s+@(\d+)=(.*)", line)
            if m:
                if current_key is not None:
                    fields[current_key] = "\n".join(current_val)
                current_key = int(m.group(1))
                current_val = [m.group(2)]
        elif current_key is not None and line.startswith("###"):
            current_val.append(line[3:].strip())

save_current()
proc.wait()

print(f"\n[+] Scan finished. Found {len(recovered)} matching quotation(s):")
sql_statements = []

for q_no in sorted(recovered.keys()):
    f = recovered[q_no]
    qid = f.get(1, "''").strip("' ")
    leadId = f.get(2, "''").strip("' ")
    date_val = f.get(4, "'NOW()'").strip("' ")
    raw_data = f.get(5, "''").strip()
    if raw_data.startswith("'") and raw_data.endswith("'"):
        raw_data = raw_data[1:-1]
    
    # Unescape binary log double escaping
    raw_data = raw_data.replace('\\\\', '\\')
    
    customer = "Unknown"
    subject = ""
    total = 0.0
    try:
        j = json.loads(raw_data)
        customer = j.get("customerName", "Unknown")
        subject = j.get("subject", "")
        cust_tot = float(j.get("custTotals", {}).get("total", 0) or 0)
        job_tot = float(j.get("jobTotals", {}).get("totalCost", 0) or 0)
        total = cust_tot if cust_tot > 0 else job_tot
    except Exception:
        pass
    
    if total == 0:
        raw_tot = f.get(6, "0.00").strip("' ")
        try: total = float(raw_tot)
        except Exception: total = 0.0
    
    docNo = f.get(10, "'FO/PD/02'").strip("' ")
    issueNo = f.get(11, "'01'").strip("' ")
    issueDate = f.get(12, "'March 04, 2026'").strip("' ")
    actual_q_no = f.get(13, f"'{q_no}'").strip("' ")
    if actual_q_no == 'NULL': actual_q_no = q_no

    print(f"  • {actual_q_no.ljust(12)} | ID: {qid.ljust(10)} | Customer: {customer[:25].ljust(25)} | Subject: {subject[:15].ljust(15)} | Total: Rs. {total:,.2f}")
    
    sql_json = raw_data.replace("'", "''")
    sql = f"""INSERT INTO quotations (id, leadId, version, date, data, totalAmount, customAmount, type, status, docNo, issueNo, issueDate, quotationNo)
VALUES ('{qid}', '{leadId}', 1, '{date_val}', '{sql_json}', {total}, NULL, 'main', 'Approved', '{docNo}', '{issueNo}', '{issueDate}', '{actual_q_no}')
ON DUPLICATE KEY UPDATE data=VALUES(data), totalAmount=VALUES(totalAmount), type='main', status='Approved', quotationNo='{actual_q_no}';"""
    sql_statements.append(sql)

if sql_statements:
    sql_path = "/root/restore_recovered.sql"
    with open(sql_path, "w") as out:
        out.write("\n\n".join(sql_statements))
    print(f"\n[+] Generated SQL script: {sql_path}")
    print("[+] Restoring directly into MySQL database 'rex_erp'...")
    res = subprocess.run(f"mysql rex_erp < {sql_path}", shell=True)
    if res.returncode == 0:
        print("\n✅ SUCCESS! All recovered quotations restored to 'Approved' status in rex_erp.")
    else:
        print(f"\n⚠️  Restoration returned code {res.returncode}. You can inspect {sql_path}")
else:
    print("\n[-] No matching quotation records found in binlogs.")
