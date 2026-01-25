import json
import re
import os

def parse_super_lotto():
    # Paths
    base_dir = os.path.dirname(os.path.abspath(__file__))
    input_path = os.path.join(base_dir, 'super_lotto_raw.txt')
    output_path = os.path.join(base_dir, 'history_superlotto.json')

    if not os.path.exists(input_path):
        print(f"Error: Input file not found at {input_path}")
        return

    with open(input_path, 'r', encoding='utf-8') as f:
        lines = [line.strip() for line in f.readlines() if line.strip()]

    history = []
    current_entry = {}
    state = 'WAITING_FOR_PERIOD' # WAITING_FOR_PERIOD, WAITING_FOR_DATE, READING_NUMBERS
    
    # We need to collect 7 numbers per period
    collected_numbers = []

    for line in lines:
        # 1. Check for Period "第...期"
        if line.startswith('第') and line.endswith('期'):
            # If we had a previous entry pending, save it
            if current_entry and 'period' in current_entry and collected_numbers:
                # We expect 7 numbers
                if len(collected_numbers) == 7:
                    # Sort first 6, keep 7th as is
                    main_nums = sorted([int(n) for n in collected_numbers[:6]])
                    special_num = int(collected_numbers[6])
                    current_entry['numbers'] = main_nums + [special_num]
                    history.append(current_entry)
                else:
                    print(f"Warning: Period {current_entry.get('period')} has {len(collected_numbers)} numbers (expected 7). Skipping.")
            
            # Start new entry
            current_entry = {}
            collected_numbers = []
            period = line.replace('第', '').replace('期', '')
            current_entry['period'] = period
            state = 'WAITING_FOR_DATE'
            continue

        # 2. Check for Date "開獎日期:..."
        if line.startswith('開獎日期:'):
            if state == 'WAITING_FOR_DATE' or state == 'WAITING_FOR_PERIOD': # Sometimes user might paste weirdly
                date_str = line.replace('開獎日期:', '').strip()
                current_entry['date'] = date_str
                state = 'READING_NUMBERS'
            continue
        
        # 3. Skip Headers
        if line == '大小順序' or line == '開出順序':
            continue

        # 4. Read Numbers
        # Try to parse line as an integer
        if state == 'READING_NUMBERS' and line.isdigit():
            collected_numbers.append(int(line))

    # Handle the very last entry
    if current_entry and 'period' in current_entry and collected_numbers:
        if len(collected_numbers) == 7:
            main_nums = sorted([int(n) for n in collected_numbers[:6]])
            special_num = int(collected_numbers[6])
            current_entry['numbers'] = main_nums + [special_num]
            history.append(current_entry)
        else:
            print(f"Warning: Last Period {current_entry.get('period')} has {len(collected_numbers)} numbers (expected 7). Skipping.")

    # Write to JSON
    with open(output_path, 'w', encoding='utf-8') as f:
        json.dump(history, f, indent=4, ensure_ascii=False)
    
    print(f"Successfully parsed {len(history)} entries to {output_path}")

if __name__ == "__main__":
    parse_super_lotto()
