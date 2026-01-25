import re
import json
import os

def parse_guanyin_poems():
    input_path = 'src/data/guanyin_raw.txt'
    output_path = 'src/data/guanyin_poems.js'
    
    with open(input_path, 'r', encoding='utf-8') as f:
        content = f.read()

    lines = content.split('\n')
    poem_blocks = []
    current_block = []
    
    for line in lines:
        if re.match(r"^第[一二三四五六七八九十百0-9]+籤", line):
            if current_block:
                poem_blocks.append(current_block)
            current_block = [line]
        else:
            if current_block:
                current_block.append(line)
    
    if current_block:
        poem_blocks.append(current_block)

    poems = []
    
    for i, block in enumerate(poem_blocks):
        data = {
            "id": i + 1,
            "header": {},
            "poem": "",
            "meaning": "",
            "explanation": "",
            "intent": {},
            "story": {}
        }
        
        full_text = "\n".join(block)
        header_line = block[0].strip()
        
        # 1. Header
        num_match = re.match(r"^(第[一二三四五六七八九十百0-9]+籤)", header_line)
        if num_match:
            data["header"]["number"] = num_match.group(1)
            
        luck_match = re.search(r"(上上|上中|中上|中平|中下|下下|上籤|中籤|下籤)", full_text)
        if luck_match:
            data["header"]["luck"] = luck_match.group(1)
            
        palace_match = re.search(r"([子丑寅卯辰巳午未申酉戌亥]宮)", full_text)
        if palace_match:
            data["header"]["palace"] = palace_match.group(1)

        # 2. Extract Sections helper
        def extract_section(text, start_marker, end_markers):
            if start_marker not in text:
                return ""
            start_idx = text.find(start_marker) + len(start_marker)
            sub_text = text[start_idx:]
            nearest_end_idx = len(sub_text)
            for marker in end_markers:
                idx = sub_text.find(marker)
                if idx != -1 and idx < nearest_end_idx:
                    nearest_end_idx = idx
            return sub_text[:nearest_end_idx].strip()

        # 3. Poem 1
        data["poem"] = extract_section(full_text, "詩曰一", ["詩曰二", "詩意"])
        if not data["poem"]:
             # Fallback: maybe just "詩曰"
             data["poem"] = extract_section(full_text, "詩曰", ["詩意", "解曰"])
        
        # CLEANUP: strictly take the first 4 lines to remove inline notes (e.g. "鵾：音同昆")
        if data["poem"]:
            lines = [l.strip() for l in data["poem"].split('\n') if l.strip()]
            if len(lines) > 4:
                lines = lines[:4]
            data["poem"] = "\n".join(lines)

        # 4. Meaning & Explanation
        data["meaning"] = extract_section(full_text, "詩意", ["解曰"])
        data["explanation"] = extract_section(full_text, "解曰", ["聖意", "故事"])
        
        # 5. Intent (聖意)
        intent_raw = extract_section(full_text, "聖意", ["故事"])
        intent_map = {}
        for line in intent_raw.split('\n'):
            line = line.strip()
            if not line: continue
            parts = re.split(r"[ 　\t]+", line, 1)
            if len(parts) >= 2:
                intent_map[parts[0]] = parts[1]
        data["intent"] = intent_map
        
        # 6. Story
        story_raw = extract_section(full_text, "故事", ["$END$"])
        story_lines = [l.strip() for l in story_raw.split('\n') if l.strip()]
        if story_lines:
            title_line = story_lines[0]
            # Remove "1." or "2." prefix
            title = re.sub(r"^\d+\.", "", title_line).strip()
            content = "\n".join(story_lines[1:]).strip()
            data["story"] = {"title": title, "content": content}
            
        poems.append(data)
        
    js_content = "export const GUANYIN_POEMS = " + json.dumps(poems, ensure_ascii=False, indent=2) + ";"
    
    with open(output_path, 'w', encoding='utf-8') as f:
        f.write(js_content)
    
    print(f"Successfully parsed {len(poems)} poems.")

if __name__ == "__main__":
    parse_guanyin_poems()
