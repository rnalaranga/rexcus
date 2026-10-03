import json
import os

# Search all nested subagent conversations spawned from our main conversation
brain_path = 'C:/Users/RR/.gemini/antigravity/brain'

# Get all conversation dirs
dirs = [d for d in os.listdir(brain_path) if os.path.isdir(os.path.join(brain_path, d))]

best_content = None
best_line_count = 0

for conv_id in dirs:
    log_path = os.path.join(brain_path, conv_id, '.system_generated', 'logs', 'transcript_full.jsonl')
    if not os.path.exists(log_path):
        continue
    
    try:
        with open(log_path, 'r', encoding='utf-8', errors='ignore') as f:
            for line in f:
                try:
                    data = json.loads(line)
                except:
                    continue
                
                if data.get('type') == 'PLANNER_RESPONSE' and 'tool_calls' in data:
                    for tc in data['tool_calls']:
                        if tc.get('name') in ('write_to_file', 'default_api:write_to_file'):
                            args = tc.get('args', tc.get('arguments', {}))
                            target = args.get('TargetFile', '')
                            code = args.get('CodeContent', '')
                            if 'QuotationBuilder.tsx' in target and 'QuotationPrintView' in code and len(code.splitlines()) > best_line_count:
                                best_line_count = len(code.splitlines())
                                best_content = code
                                print(f'Found better version in {conv_id}: {best_line_count} lines')
    except Exception as e:
        pass

if best_content:
    with open('H:/ANTIGRAVITY/REXNW/src/pages/crm/QuotationBuilder.tsx', 'w', encoding='utf-8') as f:
        f.write(best_content)
    print(f'Saved best version with {best_line_count} lines')
else:
    print('No better version found')
