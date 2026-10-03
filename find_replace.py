import json
import os

# Search for the most recent REPLACE operations on QuotationBuilder from the main conversation
brain_path = 'C:/Users/RR/.gemini/antigravity/brain'
main_conv = 'dbdbf433-fa1d-429f-aeca-58829092cab4'

log_path = os.path.join(brain_path, main_conv, '.system_generated', 'logs', 'transcript_full.jsonl')

replacements = []

with open(log_path, 'r', encoding='utf-8', errors='ignore') as f:
    for line in f:
        try:
            data = json.loads(line)
        except:
            continue
        
        if data.get('type') == 'PLANNER_RESPONSE' and 'tool_calls' in data:
            for tc in data['tool_calls']:
                if tc.get('name') in ('replace_file_content', 'default_api:replace_file_content'):
                    args = tc.get('args', tc.get('arguments', {}))
                    target = args.get('TargetFile', '')
                    if 'QuotationBuilder.tsx' in target:
                        replacements.append({
                            'step': data.get('step_index', 0),
                            'instruction': args.get('Instruction', '')[:80],
                            'target': args.get('TargetContent', '')[:80],
                            'replacement': args.get('ReplacementContent', '')[:80]
                        })

print(f'Found {len(replacements)} replacements:')
for r in replacements:
    print(f"  Step {r['step']}: {r['instruction']}")
