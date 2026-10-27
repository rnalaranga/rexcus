import subprocess

print("Scanning binlogs for original RSSQ-2208 BOM (QT-154395)...")
cmd = "sudo mysqlbinlog -v --base64-output=DECODE-ROWS /var/lib/mysql/*bin*.[0-9]*"
proc = subprocess.Popen(cmd, shell=True, stdout=subprocess.PIPE, stderr=subprocess.DEVNULL)
best = ""
capturing = False
val = []

for raw_line in proc.stdout:
    line = raw_line.decode('latin1', errors='replace')
    if line.startswith("###   @5='") and ("QT-154395" in line or "RSSQ-2208" in line):
        capturing = True
        val = [line[11:]]
    elif capturing:
        if line.startswith("###   @6="):
            capturing = False
            s = "\n".join(val).rstrip("\n'")
            if "BOM" in s and len(s) > len(best):
                best = s
        elif line.startswith("###"):
            val.append(line[3:].strip())
        else:
            capturing = False
proc.wait()

if best:
    clean = best.replace('\\\\', '\\').replace('\ufffd', '')
    clean = clean.encode('latin1', 'ignore').decode('latin1')
    sql_json = clean.replace("'", "''")
    sql = f"""/*!40101 SET NAMES latin1 */;
UPDATE quotations SET
  data = '{sql_json}',
  totalAmount = 14066.30,
  type = 'main',
  status = 'Approved',
  leadId = 'LEAD-9006'
WHERE quotationNo = 'RSSQ-2208';
"""
    with open('/root/bom.sql', 'w', encoding='latin1') as out:
        out.write(sql)
    subprocess.run("mysql -u root -p1234 rex_erp < /root/bom.sql", shell=True)
    print("\n✅ SUCCESS: RSSQ-2208 BOM Part 1 (EN 19) Restored to rex_erp!")
else:
    print("[-] BOM data not found in binlogs")
