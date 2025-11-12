"""
Fix any curly quotes in setup_database.py file
Run this if you get syntax errors about unterminated strings
"""

import sys

def fix_quotes(filename='setup_database.py'):
    """Replace curly quotes with straight quotes"""
    try:
        with open(filename, 'r', encoding='utf-8') as f:
            content = f.read()

        original_content = content

        # Replace curly single quotes
        content = content.replace('\u2018', "'")  # '
        content = content.replace('\u2019', "'")  # '

        # Replace curly double quotes
        content = content.replace('\u201c', '"')  # "
        content = content.replace('\u201d', '"')  # "

        if content != original_content:
            # Backup original
            with open(filename + '.backup', 'w', encoding='utf-8') as f:
                f.write(original_content)

            # Write fixed version
            with open(filename, 'w', encoding='utf-8') as f:
                f.write(content)

            print(f"✅ Fixed curly quotes in {filename}")
            print(f"📝 Original backed up to {filename}.backup")
            return True
        else:
            print(f"✅ No curly quotes found in {filename}")
            return True

    except Exception as e:
        print(f"❌ Error fixing quotes: {e}")
        return False

if __name__ == '__main__':
    success = fix_quotes()
    sys.exit(0 if success else 1)
