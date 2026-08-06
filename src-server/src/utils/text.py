import unicodedata

def get_visual_length(text: str) -> float:
    total_units = 0.0
    for char in text:
        # unicodedata.east_asian_width returns the East Asian width category of a character
        # 'F' (Fullwidth), 'W' (Wide), 'A' (Ambiguous) occupy 2 times the English character
        if unicodedata.east_asian_width(char) in ('F', 'W', 'A'):
            total_units += 2.0
        else:
            total_units += 1
    return total_units
