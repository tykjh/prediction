import re
import json

def parse_penghu_poems():
    input_file = "src/data/penghu_raw.txt"
    output_file = "src/data/penghu_poems.js"

    with open(input_file, "r", encoding="utf-8") as f:
        content = f.read()

    lines_all = [l.strip() for l in content.split('\n') if l.strip()]
    
    poem_blocks = []
    current_block = []
    
    for line in lines_all:
        if line == "澎湖天后宮一百籤":
            continue
        # Check for header like "第一籤", "第二十一籤"
        if re.match(r"^第[一二三四五六七八九十百0-9]+籤$", line):
            if current_block:
                poem_blocks.append(current_block)
            current_block = [line]
        else:
            if current_block:
                current_block.append(line)
    
    if current_block:
        poem_blocks.append(current_block)

    poems = []

    for block in poem_blocks:
        poem_data = {
            "id": 0,
            "header": {},
            "poem": "",
            "search_keywords": [],
            "predictions": {}
        }

        # Header is first line
        poem_data["header"]["number"] = block[0]
        lines = block[1:]

        # --- Check for Dual Poems ---
        full_text = "\n".join(lines)
        
        # Helper to parse one poem block
        def parse_block(block_lines):
            # Clean up 【籤詩一】 if present
            cleaned_lines = []
            for l in block_lines:
                if "【籤詩一】" in l: continue
                cleaned_lines.append(l)
            
            p_lines = []
            pred_map = {}
            prediction_keys = ["功名", "生意", "六甲", "疾病", "婚姻", "出行", "丁口", "求財", "時運", "失物", "耕作", "官司", "行人", "田畜"]
            
            for line in cleaned_lines:
                line = line.strip()
                if not line: continue
                
                is_pred = False
                for key in prediction_keys:
                    # Strict check: Must start with key AND have a separator (space/tab)
                    # Because some poem lines start with "疾病" etc.
                    if line.startswith(key):
                        # Check for separator
                        if re.search(r"[ 　\t]", line):
                            is_pred = True
                            # Parse predicton line
                            parts = re.split(r"[ 　\t]+", line)
                            if len(parts) >= 2:
                                k = parts[0]
                                v = " ".join(parts[1:])
                                pred_map[k] = v
                            break
                
                if not is_pred:
                    # Append to poem if we have < 4 lines
                    # Note: Explanations/Notes often appearing after 4 lines are ignored
                    if len(p_lines) < 4:
                        p_lines.append(line)
            
            return "\n".join(p_lines), pred_map

        if "【籤詩二】" in full_text:
            parts = full_text.split("【籤詩二】")
            part1_lines = parts[0].split('\n')
            part2_lines = parts[1].split('\n')
            
            p1_text, p1_preds = parse_block(part1_lines)
            p2_text, p2_preds = parse_block(part2_lines)
            
            poem_data["poem"] = p1_text + "\n\n【籤詩二】\n" + p2_text
            
            # Merge predictions
            all_keys = set(list(p1_preds.keys()) + list(p2_preds.keys()))
            # Sort keys based on predefined order for consistency? JS object keys order isn't guaranteed but usually insertion order
            # Let's use the prediction_keys list order
            prediction_keys = ["功名", "生意", "六甲", "疾病", "婚姻", "出行", "丁口", "求財", "時運", "失物", "耕作", "官司", "行人", "田畜"]
            
            sorted_keys = [k for k in prediction_keys if k in all_keys] 
            # Add any extra keys not in standard list
            for k in all_keys:
                if k not in sorted_keys:
                    sorted_keys.append(k)

            for k in sorted_keys:
                v1 = p1_preds.get(k, "")
                v2 = p2_preds.get(k, "")
                
                if v1 and v2:
                    poem_data["predictions"][k] = f"{v1} / {v2}"
                elif v1:
                    poem_data["predictions"][k] = v1
                elif v2:
                    poem_data["predictions"][k] = v2

        else:
            # Single Poem
            p_text, p_preds = parse_block(lines)
            poem_data["poem"] = p_text
            poem_data["predictions"] = p_preds

        if poem_data["header"]:
            poems.append(poem_data)

    # Assign IDs
    for idx, p in enumerate(poems):
        p["id"] = idx + 1

    # Output JS
    js_content = "export const PENGHU_POEMS = " + json.dumps(poems, ensure_ascii=False, indent=2) + ";"
    
    with open(output_file, "w", encoding="utf-8") as f:
        f.write(js_content)

    print(f"Successfully parsed {len(poems)} poems.")

if __name__ == "__main__":
    parse_penghu_poems()
