import json
import codecs

subagent_log_path = r"C:\Users\RR\.gemini\antigravity\brain\2108153c-f15d-4735-a9c4-aba42b631d17\.system_generated\logs\transcript_full.jsonl"
grn_log_path = r"C:\Users\RR\.gemini\antigravity\brain\60fb206a-34bb-4493-b802-2067d4cd49fe\.system_generated\logs\transcript_full.jsonl"

best_content = None

for path in [subagent_log_path, grn_log_path]:
    try:
        with codecs.open(path, 'r', 'utf-8') as f:
            for line in f:
                data = json.loads(line)
                if 'tool_calls' in data:
                    for call in data['tool_calls']:
                        if call.get('name') in ['default_api:write_to_file', 'default_api:replace_file_content', 'write_to_file', 'replace_file_content']:
                            args = call.get('arguments', {})
                            if 'Quotations.tsx' in args.get('TargetFile', ''):
                                if 'CodeContent' in args:
                                    best_content = args['CodeContent']
                                elif 'ReplacementContent' in args:
                                    # If it was a replace, it might not be the full file.
                                    pass
    except Exception as e:
        print(f"Error on {path}: {e}")

if best_content:
    with codecs.open('H:/ANTIGRAVITY/REXNW/src/pages/crm/Quotations.tsx', 'w', 'utf-8') as f:
        f.write(best_content)
    print("RESTORED QUOTATIONS FROM LOG!")
else:
    print("Could not find full file content.")