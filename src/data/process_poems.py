import re
import json

INPUT_FILE = 'src/data/fortune_poems_input.txt'
OUTPUT_FILE = 'src/data/fortunePoems.js'

def parse_poems(file_path):
    with open(file_path, 'r', encoding='utf-8') as f:
        lines = [line.strip() for line in f.readlines()]

    poems = []
    current_poem = None
    state = 'SEARCH_ID' # SEARCH_ID, LUCK, POEM, EXPLANATION
    
    # Buffers
    luck_buffer = []
    poem_buffer = []
    explanation_buffer = []

    def save_current_poem():
        if current_poem:
            # Finalize explanation and prediction
            raw_text = "\n".join(explanation_buffer).strip()
            
            # Split by "願望："
            # Note: The colon might be fullwidth ：
            if "願望：" in raw_text:
                parts = raw_text.split("願望：", 1)
                meaning = parts[0].strip()
                predictions = "願望：" + parts[1].strip()
            # Sometimes it might be formatted differently, fallback
            else:
                meaning = raw_text
                predictions = ""

            # Construct title
            luck_str = "".join(luck_buffer)
            # Standardize 兇 to 凶 if needed
            luck_str = luck_str.replace('兇', '凶')
            
            title = f"第{current_poem['id']}籤 {luck_str}"
            
            # Construct poem text (4 lines usually)
            poem_text = "\n".join(poem_buffer)

            poems.append({
                "title": title,
                "poem_text": poem_text,
                "meaning": meaning,
                "predictions": predictions
            })

    i = 0
    while i < len(lines):
        line = lines[i]
        
        # Skip empty lines if we are searching for ID
        if state == 'SEARCH_ID':
            if re.match(r'^\d+$', line):
                save_current_poem() # Save previous if exists
                
                # Reset buffers for new poem
                current_poem = {'id': int(line)}
                luck_buffer = []
                poem_buffer = []
                explanation_buffer = []
                state = 'LUCK'
            elif line:
                pass

        elif state == 'LUCK':
            # Luck lines keep coming until we hit a long line (Poem)
            if len(line) <= 3 and re.match(r'^[大中小吉末凶兇平半]+$', line):
                luck_buffer.append(line)
            elif len(line) > 2:
                # Must be start of poem
                poem_buffer.append(line)
                state = 'POEM'
            elif re.match(r'^\d+$', line):
                pass

        elif state == 'POEM':
            if len(poem_buffer) < 4:
                if re.match(r'^\d+$', line):
                     state = 'SEARCH_ID'
                     i -= 1 
                else:
                    poem_buffer.append(line)
            else:
                explanation_buffer.append(line)
                state = 'EXPLANATION'

        elif state == 'EXPLANATION':
            if re.match(r'^\d+$', line):
                state = 'SEARCH_ID'
                i -= 1 
            else:
                explanation_buffer.append(line)
        
        i += 1

    # Save last poem
    save_current_poem()

    return poems

def generate_js(poems):
    js_content = "export const FORTUNE_POEMS = [\n"
    for p in poems:
        title = json.dumps(p['title'], ensure_ascii=False)
        text = json.dumps(p['poem_text'], ensure_ascii=False)
        meaning = json.dumps(p['meaning'], ensure_ascii=False)
        predictions = json.dumps(p['predictions'], ensure_ascii=False)
        
        js_content += f"    {{ title: {title}, text: {text}, meaning: {meaning}, predictions: {predictions} }},\n"
    js_content += "];\n"
    
    with open(OUTPUT_FILE, 'w', encoding='utf-8') as f:
        f.write(js_content)

if __name__ == "__main__":
    data = parse_poems(INPUT_FILE)
    generate_js(data)
    print(f"Successfully processed {len(data)} poems.")
