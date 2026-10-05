import codecs

with codecs.open('H:/ANTIGRAVITY/REXNW/api/src/server.ts', 'r', 'utf-8') as f:
    content = f.read()
content = content.replace("ALTER TABLE users ADD COLUMN prefix VARCHAR(10) DEFAULT NULL", "ALTER TABLE customers ADD COLUMN prefix VARCHAR(10) DEFAULT NULL")
with codecs.open('H:/ANTIGRAVITY/REXNW/api/src/server.ts', 'w', 'utf-8') as f:
    f.write(content)

with codecs.open('H:/ANTIGRAVITY/REXNW/fix_db_schema.sql', 'r', 'utf-8') as f:
    content = f.read()
content = content.replace("ALTER TABLE users ADD COLUMN prefix VARCHAR(10) DEFAULT NULL;", "ALTER TABLE customers ADD COLUMN prefix VARCHAR(10) DEFAULT NULL;")
with codecs.open('H:/ANTIGRAVITY/REXNW/fix_db_schema.sql', 'w', 'utf-8') as f:
    f.write(content)