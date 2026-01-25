import re
import json

def parse_sixty_jiazi():
    input_file = "src/data/sixty_jiazi_raw.txt"
    output_file = "src/data/sixty_jiazi_poems.js"

    with open(input_file, "r", encoding="utf-8") as f:
        content = f.read()

    # Split by "六十甲子籤"
    raw_poems = re.split(r"六十甲子籤", content)
    poems = []

    for raw in raw_poems:
        if not raw.strip():
            continue

        lines = [l.strip() for l in raw.split('\n') if l.strip()]
        
        # Initialize structure
        poem_data = {
            "id": 0,
            "header": {},
            "meta": {},
            "poem": "",
            "predictions": {},
            "stories": []
        }

        # --- Parse Header ---
        # Example: 第十一籤【乙酉】
        header_match = re.search(r"第(.+)籤【(.+)】", raw)
        if header_match:
            poem_data["header"]["number"] = f"第{header_match.group(1)}籤"
            poem_data["header"]["stemBranch"] = header_match.group(2)
            # Try to convert chinese number to int for ID (simplified for now, need robust mapping if needed)
            # But we can also just use the index + 1 or a map if simpler
        
        # --- Parse Meta ---
        # Example: ●○●　●○●  or  屬水利冬　宜其北方
        # We look for the line containing symbols (circles) and the line with nature/direction
        for line in lines:
            if re.search(r"[●○]+", line):
                poem_data["meta"]["symbols"] = line.replace(" ", "").replace("　", " ")
            if "屬" in line and "宜" in line:
                parts = re.split(r"[ 　]+", line)
                if len(parts) >= 2:
                    poem_data["meta"]["nature"] = parts[0]
                    poem_data["meta"]["direction"] = parts[1]

        # --- Parse Sections ---
        # We can split by fixed headers: "籤解", "故事"
        # Everything before "籤解" (and after meta) is the poem
        # Between "籤解" and "故事" is predictions
        # After "故事" is stories

        parts_predictions = raw.split("籤解")
        if len(parts_predictions) > 1:
            pre_predictions = parts_predictions[0]
            rest = parts_predictions[1]
        else:
            pre_predictions = raw
            rest = ""
            
        parts_stories = rest.split("故事")
        if len(parts_stories) > 1:
            raw_predictions = parts_stories[0]
            raw_stories = parts_stories[1]
        else:
            raw_predictions = rest
            raw_stories = ""

        # --- Extract Poem ---
        # Poem lines usually follow the Meta lines. 
        # Strategy: Get lines unique to poem section, exclude header/meta lines
        poem_lines = []
        pre_lines = [l.strip() for l in pre_predictions.split('\n') if l.strip()]
        for line in pre_lines:
            if "第" in line and "籤" in line and "【" in line: continue
            if re.search(r"[●○]", line): continue
            if "屬" in line and "宜" in line: continue
            # Basic header filtering complete
            poem_lines.append(line)
        
        # Enforce 4 lines rule (User requirement)
        # We take the FIRST 4 lines found. 
        # (Assuming any extra text is a note AFTER the poem, or we handle preamble if it exists)
        # Based on inspection, poems are at the top.
        
        if len(poem_lines) > 4:
            # Check if text is preamble or postscript
            # Most cases it's postscript (e.g. note about characters)
            final_poem_lines = poem_lines[:4]
            # We could store the rest as 'note' if needed, but user said 'do not merge'.
        else:
            final_poem_lines = poem_lines

        # Clean Parentheses from Poem Text
        cleaned_poem_lines = []
        for pl in final_poem_lines:
             pl = re.sub(r"\(.*?\)|（.*?）", "", pl).strip()
             if pl: cleaned_poem_lines.append(pl)

        poem_data["poem"] = "\n".join(cleaned_poem_lines)

        # --- Extract Predictions ---
        # Format: Key Value (e.g., 凡事　大吉昌。)
        pred_lines = [l.strip() for l in raw_predictions.split('\n') if l.strip()]
        for line in pred_lines:
            # Split by space
            parts = re.split(r"[ 　]+", line, 1)
            if len(parts) == 2:
                key = parts[0]
                val = parts[1]
                poem_data["predictions"][key] = val

        # --- Extract Stories ---
        # Numbered list or just lines
        story_lines = [l.strip() for l in raw_stories.split('\n') if l.strip()]
        current_story = ""
        for line in story_lines:
            if re.match(r"^\d+\.", line):
                if current_story:
                    poem_data["stories"].append(current_story)
                current_story = line
            else:
                 if current_story:
                     current_story += "\n" + line
                 else:
                     # Attempt to catch stories without numbers if valid
                     # For now, just append as independent string if it looks like a title
                     if len(poem_data["stories"]) == 0 or re.match(r"^\d", line):
                         current_story = line
                     else:
                         current_story += "\n" + line # Append to previous
        
        if current_story:
             poem_data["stories"].append(current_story)

        # Clean up stories to remove numbers and parentheses
        clean_stories = []
        for s in poem_data["stories"]:
            s = re.sub(r"^\d+\.", "", s).strip()
            # Clean parentheses 
            s = re.sub(r"\(.*?\)|（.*?）", "", s) 
            clean_stories.append(s)
        poem_data["stories"] = clean_stories
        
        # Basic validation
        if poem_data["header"]:
             poems.append(poem_data)


    # Sort by ID if possible, otherwise we rely on file order (which is 1-60)
    # Re-assign integer IDs based on order
    for idx, p in enumerate(poems):
        p["id"] = idx + 1

    # --- Javascript Output ---
    js_content = "export const SIXTY_JIAZI_POEMS = " + json.dumps(poems, ensure_ascii=False, indent=2) + ";"
    
    with open(output_file, "w", encoding="utf-8") as f:
        f.write(js_content)
    
    print(f"Successfully parsed {len(poems)} poems.")

if __name__ == "__main__":
    parse_sixty_jiazi()
