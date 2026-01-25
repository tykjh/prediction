
import re
import json
import os

INPUT_FILE = 'src/data/leiyushi_raw.txt'
OUTPUT_FILE = 'src/data/leiyushi_poems.js'

def parse_header(line):
    # Match: 第[Num]籤【 [Luck]。[Cycle]】
    # Be flexible with spaces and brackets
    match = re.search(r'第(\S+)籤\s*[【\[]\s*(\S+)\s*[。.]\s*(\S+)\s*[】\]]', line)
    if match:
        return {
            'number': match.group(1),
            'luck': match.group(2),
            'cycle': match.group(3)
        }
    return None

def main():
    if not os.path.exists(INPUT_FILE):
        print(f"Error: {INPUT_FILE} not found.")
        return

    with open(INPUT_FILE, 'r', encoding='utf-8') as f:
        content = f.read()

    # Split into chunks based on the header pattern "第...籤"
    # We use a lookahead to keep the delimiter or just splitting
    # Regex split might be easier.
    
    # Normalize newlines
    content = content.replace('\r\n', '\n')
    
    # Split by lines that look like a header
    # But we need to keep the header line.
    chunks = re.split(r'(?=\n第\S+籤)', '\n' + content)
    
    poems = []
    
    section_map = {
        '聖意': 'shengYi',
        '東坡解': 'dongPoJie',
        '碧仙註': 'biXianZhu',
        '解曰': 'jieYue',
        '釋義': 'shiYi',
        '占驗': 'zhanYan',
        '故事': 'stories'
    }

    for chunk in chunks:
        if not chunk.strip():
            continue
            
        lines = [l.strip() for l in chunk.strip().split('\n') if l.strip()]
        if not lines:
            continue

        header_line = lines[0]
        header = parse_header(header_line)
        if not header:
            # Skip noise if any
            continue

        current_poem = {
            'header': header,
            'poem': '',
            'shengYi': [],
            'dongPoJie': [],
            'biXianZhu': [],
            'jieYue': [],
            'shiYi': [],
            'zhanYan': [],
            'stories': []
        }

        # Identify sections
        # We iterate lines.
        # State: 'poem', or one of the sections.
        current_section = 'poem'
        buffer = []

        def flush_buffer(section_key):
            if not buffer:
                return
            text = '\n'.join(buffer)
            if section_key == 'poem':
                current_poem['poem'] = text
            elif section_key == 'stories':
                # Split stories if they strictly start with (一), (二)
                # But sometimes there is just one story without numbering.
                # Or titles like 故事\n(一)Title\nContent...
                # Simple heuristic: Just keep the text block for now, possibly split by (digit) if multiple found?
                # The user requirement: "support multiple stories".
                # Let's try to split by `(一)`, `(二)` etc.
                parts = re.split(r'[(（][一二三四五][)）]', text)
                if len(parts) > 1:
                     # part[0] might be intro content or empty
                     if parts[0].strip():
                         current_poem[section_key].append(parts[0].strip())
                     for p in parts[1:]:
                         if p.strip():
                             current_poem[section_key].append(p.strip())
                else:
                    current_poem[section_key].append(text)
            elif isinstance(current_poem[section_key], list):
                current_poem[section_key].append(text)
            else:
                 # Should probably be a list or we join?
                 # Schema: JieYue, ShiYi, ZhanYan usually single block text.
                 # But input might change. I'll store as list and join later if needed?
                 # The prompt said "ShengYi... merging or listing".
                 # Let's simple check if we want list or string.
                 # For now, append to list.
                 current_poem[section_key].append(text)
            
            buffer.clear()

        # Regex for section headers
        # Matches: "聖意", "聖意一", "聖意二", "東坡解" etc.
        section_pattern = re.compile(r'^(聖意|東坡解|碧仙註|解曰|釋義|占驗|故事)([一二三]?)$')

        for line in lines[1:]:
            # Check if line is a section header
            # Sometimes headers are like "聖意一" or just "聖意"
            match = section_pattern.match(line)
            if match:
                # Flush previous contents
                flush_buffer(current_section)
                
                # Set new section
                raw_section = match.group(1)
                if raw_section in section_map:
                    current_section = section_map[raw_section]
                else:
                    # Generic fallback or continue current?
                    # Should not happen given pattern
                    pass
            else:
                buffer.append(line)

        # Flush last buffer
        flush_buffer(current_section)
        
        # Post-process: Join array fields that should be strings if desired, or keep as arrays.
        # User defined:
        # Poem: string
        # ShengYi: list
        # DongPoJie: list (often has 1, 2)
        # BiXianZhu: list (often has 1, 2)
        # JieYue: single block usually, but list is safe.
        # ShiYi: single block.
        # ZhanYan: single block.
        # Stories: list.
        
        # Format for output
        processed_poem = {
            'header': current_poem['header'],
            'poem': current_poem['poem'],
            'shengYi': current_poem['shengYi'],
            'dongPoJie': current_poem['dongPoJie'],
            'biXianZhu': current_poem['biXianZhu'],
            'jieYue': '\n'.join(current_poem['jieYue']),
            'shiYi': '\n'.join(current_poem['shiYi']),
            'zhanYan': '\n'.join(current_poem['zhanYan']),
            'stories': current_poem['stories']
        }
        
        poems.append(processed_poem)


    
    # Sort poems by number
    def parse_chinese_number(num_str):
        cn_map = {
            '一': 1, '二': 2, '三': 3, '四': 4, '五': 5,
            '六': 6, '七': 7, '八': 8, '九': 9, '十': 10,
            'O': 0, '０': 0, '一百': 100
        }
        if num_str in cn_map:
            return cn_map[num_str]
        
        # Handle "八八" (88) or "五十" (50) or "十五" (15)
        if len(num_str) == 2:
            first = num_str[0]
            second = num_str[1]
            if first == '十': # 11-19
                return 10 + cn_map.get(second, 0)
            elif second == '十': # 10, 20, 30... 90
                return cn_map.get(first, 0) * 10
            else: # 21, 88, 89
                return cn_map.get(first, 0) * 10 + cn_map.get(second, 0)
        
        # Handle "二十五" -> 25
        if len(num_str) == 3 and num_str[1] == '十':
             return cn_map.get(num_str[0], 0) * 10 + cn_map.get(num_str[2], 0)
             
        # Fallback
        return 0

    poems.sort(key=lambda x: parse_chinese_number(x['header']['number']))
    
    # Check for duplicates or missing (optional debugging)
    seen_numbers = set()
    unique_poems = []
    
    for p in poems:
        num = p['header']['number']
        # If we have duplicate 88 for example, we might want to skip the first or second? 
        # But wait, user provided 89. I should make sure I don't have duplicate 88.
        # Let's clean up by number.
        if num not in seen_numbers:
            unique_poems.append(p)
            seen_numbers.add(num)
        else:
            print(f"Warning: Duplicate poem number found: {num}. Keeping only first occurrence.")
            
    poems = unique_poems

    # Convert to JS
    json_str = json.dumps(poems, ensure_ascii=False, indent=2)
    js_content = f"export const LEI_YU_SHI_POEMS = {json_str};\n"


    with open(OUTPUT_FILE, 'w', encoding='utf-8') as f:
        f.write(js_content)
    
    print(f"Parsed {len(poems)} poems.")

if __name__ == '__main__':
    main()
