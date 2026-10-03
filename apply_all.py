import json
import os
import sys

# Read all replacements from the main conversation and replay them
brain_path = 'C:/Users/RR/.gemini/antigravity/brain'
main_conv = 'dbdbf433-fa1d-429f-aeca-58829092cab4'

log_path = os.path.join(brain_path, main_conv, '.system_generated', 'logs', 'transcript_full.jsonl')

replacements = []
writes = []

with open(log_path, 'r', encoding='utf-8', errors='ignore') as f:
    for line in f:
        try:
            data = json.loads(line)
        except:
            continue
        
        if data.get('type') == 'PLANNER_RESPONSE' and 'tool_calls' in data:
            step = data.get('step_index', 0)
            for tc in data['tool_calls']:
                if tc.get('name') in ('replace_file_content', 'default_api:replace_file_content'):
                    args = tc.get('args', tc.get('arguments', {}))
                    target = args.get('TargetFile', '')
                    if 'QuotationBuilder.tsx' in target:
                        replacements.append({
                            'step': step,
                            'instruction': args.get('Instruction', ''),
                            'target': args.get('TargetContent', ''),
                            'replacement': args.get('ReplacementContent', '')
                        })
                elif tc.get('name') in ('write_to_file', 'default_api:write_to_file'):
                    args = tc.get('args', tc.get('arguments', {}))
                    target = args.get('TargetFile', '')
                    code = args.get('CodeContent', '')
                    if 'QuotationBuilder.tsx' in target and len(code.splitlines()) > 500:
                        writes.append({'step': step, 'code': code})

# Sort by step
replacements.sort(key=lambda x: x['step'])
writes.sort(key=lambda x: x['step'])

print(f'Found {len(writes)} full writes, {len(replacements)} replacements')

# We already have the best write. Now we need to replay replacements from AFTER the last write.
# The subagent write was at step 927 from the 61db5963 conversation.
# All replacements in main conversation were on top.

file_path = 'H:/ANTIGRAVITY/REXNW/src/pages/crm/QuotationBuilder.tsx'
with open(file_path, 'r', encoding='utf-8') as f:
    content = f.read()

# Apply all replacements from main conversation
applied = 0
failed = 0
for r in replacements:
    target = r['target']
    replacement = r['replacement']
    if target and target in content:
        content = content.replace(target, replacement, 1)
        print(f"  Applied step {r['step']}: {r['instruction'][:60]}")
        applied += 1
    else:
        print(f"  SKIP step {r['step']} (target not found): {r['instruction'][:60]}")
        failed += 1

print(f'Applied {applied}, failed {failed}')

with open(file_path, 'w', encoding='utf-8') as f:
    f.write(content)
