"""
ZIP File Processor Service for InsightSheet-lite
Secure filename cleaning with Unicode support
"""
import zipfile
import os
import re
import unicodedata
import secrets
import tempfile
import shutil
from typing import List, Dict, Optional, BinaryIO
from pathlib import Path
import logging

logger = logging.getLogger(__name__)


class ZipProcessorService:
    """Secure ZIP file processor with advanced filename cleaning"""

    def __init__(self, temp_dir: Optional[str] = None):
        self.temp_dir = temp_dir or tempfile.gettempdir()
        self.max_file_size = 2 * 1024 * 1024 * 1024  # 2GB uncompressed limit

    def is_safe_zip(self, zip_path: str) -> bool:
        """
        Verify ZIP file integrity and content safety
        Prevents ZIP bombs and directory traversal attacks
        """
        try:
            with zipfile.ZipFile(zip_path, 'r') as zip_ref:
                total_size = 0

                for info in zip_ref.infolist():
                    # Check for ZIP bombs
                    if info.file_size > self.max_file_size:
                        logger.warning(f"File too large: {info.filename}")
                        return False

                    total_size += info.file_size
                    if total_size > self.max_file_size:
                        logger.warning("Total uncompressed size exceeds limit")
                        return False

                    # Check for directory traversal
                    if '..' in info.filename or info.filename.startswith('/'):
                        logger.warning(f"Suspicious path: {info.filename}")
                        return False

                    # Check for dangerous extensions
                    dangerous_exts = ['.exe', '.dll', '.bat', '.cmd', '.sh', '.ps1']
                    if any(info.filename.lower().endswith(ext) for ext in dangerous_exts):
                        logger.warning(f"Dangerous file type: {info.filename}")
                        return False

            return True

        except Exception as e:
            logger.error(f"Error validating ZIP: {str(e)}")
            return False

    def sanitize_filename(
        self,
        filename: str,
        allowed_chars: Optional[str] = None,
        disallowed_chars: Optional[str] = None,
        replace_char: str = '_',
        remove_spaces: bool = False,
        max_length: int = 255,
        language_replacements: Optional[Dict[str, str]] = None
    ) -> str:
        """
        Sanitize filename with advanced options

        Args:
            filename: Original filename
            allowed_chars: Allowed characters (whitelist)
            disallowed_chars: Disallowed characters (blacklist)
            replace_char: Character to use for replacements
            remove_spaces: Whether to remove spaces
            max_length: Maximum filename length
            language_replacements: Language-specific character replacements

        Returns:
            str: Sanitized filename
        """
        try:
            # Remove null bytes and control characters
            filename = "".join(char for char in filename if ord(char) >= 32)

            # Normalize Unicode to ASCII (handles ü→u, é→e, etc.)
            filename = unicodedata.normalize('NFD', filename)
            # Remove combining diacritical marks (Unicode category: Mn - Mark, nonspacing)
            filename = ''.join(
                c for c in filename
                if unicodedata.category(c) != 'Mn'
            )
            # Normalize back to NFC
            filename = unicodedata.normalize('NFC', filename)

            # Handle language-specific replacements
            if language_replacements:
                for old_char, new_char in language_replacements.items():
                    filename = filename.replace(old_char, new_char)

            # Handle disallowed characters
            if disallowed_chars:
                pattern = '[' + re.escape(disallowed_chars) + ']'
                filename = re.sub(pattern, replace_char if replace_char else '', filename)

            # Handle allowed characters (whitelist)
            if allowed_chars:
                allowed_set = set(allowed_chars)
                filename = ''.join(
                    c if c in allowed_set else replace_char
                    for c in filename
                )

            # Normalize Unicode
            filename = unicodedata.normalize('NFKD', filename)
            filename = ''.join(
                c for c in filename
                if c.isascii() and (c.isprintable() or c in '-_.')
            )

            # Handle spaces
            if remove_spaces:
                filename = filename.replace(' ', '')

            # Clean up multiple dots/dashes/underscores
            filename = re.sub(r'[._-]+', lambda m: m.group(0)[0], filename)

            # Remove leading/trailing dots and spaces
            filename = filename.strip('. ')

            # Truncate if too long
            if len(filename) > max_length:
                filename = filename[:max_length]

            # Ensure filename isn't empty
            if not filename or filename.isspace():
                filename = f"renamed_file_{secrets.token_hex(4)}"

            return filename

        except Exception as e:
            logger.error(f"Error sanitizing filename: {str(e)}")
            return f"renamed_file_{secrets.token_hex(4)}"

    async def process_zip(
        self,
        zip_file: BinaryIO,
        options: Dict[str, any]
    ) -> bytes:
        """
        Process ZIP file with filename cleaning

        Args:
            zip_file: ZIP file binary data
            options: Processing options

        Returns:
            bytes: Processed ZIP file data
        """
        temp_input = None
        temp_output = None
        temp_dir = None

        try:
            # Create secure temporary directory
            temp_dir = tempfile.mkdtemp(prefix='zipproc_', dir=self.temp_dir)

            # Save uploaded file
            temp_input = os.path.join(temp_dir, f"input_{secrets.token_hex(8)}.zip")
            with open(temp_input, 'wb') as f:
                f.write(zip_file.read() if hasattr(zip_file, 'read') else zip_file)

            # Verify safety
            if not self.is_safe_zip(temp_input):
                raise ValueError("Invalid or unsafe ZIP file")

            # Process files
            processed_files = []

            with zipfile.ZipFile(temp_input, 'r') as source_zip:
                for item in source_zip.infolist():
                    # Skip directories
                    if item.filename.endswith('/'):
                        continue

                    try:
                        # Get original name
                        original_name = os.path.basename(item.filename)

                        # Sanitize filename
                        new_name = self.sanitize_filename(
                            original_name,
                            allowed_chars=options.get('allowed_chars'),
                            disallowed_chars=options.get('disallowed_chars'),
                            replace_char=options.get('replace_char', '_'),
                            remove_spaces=options.get('remove_spaces', False),
                            max_length=options.get('max_length', 255),
                            language_replacements=options.get('language_replacements')
                        )

                        # Maintain directory structure
                        new_path = os.path.normpath(
                            os.path.join(
                                os.path.dirname(item.filename),
                                new_name
                            )
                        ).replace('\\', '/')

                        # Prevent directory traversal
                        if '..' in new_path or new_path.startswith('/'):
                            logger.warning(f"Skipping suspicious path: {new_path}")
                            continue

                        # Read file content
                        with source_zip.open(item) as source:
                            content = source.read()

                        processed_files.append({
                            'path': new_path,
                            'content': content,
                            'original': item.filename
                        })

                    except Exception as e:
                        logger.error(f"Error processing file {item.filename}: {str(e)}")
                        continue

            # Create output ZIP
            temp_output = os.path.join(temp_dir, f"output_{secrets.token_hex(8)}.zip")

            with zipfile.ZipFile(temp_output, 'w', zipfile.ZIP_DEFLATED) as target_zip:
                for file_info in processed_files:
                    target_zip.writestr(file_info['path'], file_info['content'])

            # Read output file
            with open(temp_output, 'rb') as f:
                result = f.read()

            return result

        except Exception as e:
            logger.error(f"Error processing ZIP: {str(e)}")
            raise

        finally:
            # Cleanup
            if temp_dir and os.path.exists(temp_dir):
                shutil.rmtree(temp_dir, ignore_errors=True)

    def get_language_replacements(self, languages: List[str]) -> Dict[str, str]:
        """
        Get character replacements for specified languages

        Args:
            languages: List of language codes

        Returns:
            dict: Character replacement map
        """
        language_maps = {
            'german': {'ä': 'ae', 'ö': 'oe', 'ü': 'ue', 'ß': 'ss', 'Ä': 'Ae', 'Ö': 'Oe', 'Ü': 'Ue'},
            'italian': {'à': 'a', 'è': 'e', 'é': 'e', 'ì': 'i', 'ò': 'o', 'ù': 'u'},
            'spanish': {'á': 'a', 'é': 'e', 'í': 'i', 'ó': 'o', 'ú': 'u', 'ñ': 'n', 'ü': 'u'},
            'french': {'à': 'a', 'â': 'a', 'ç': 'c', 'é': 'e', 'è': 'e', 'ê': 'e', 'ë': 'e'},
        }

        replacements = {}
        for lang in languages:
            if lang.lower() in language_maps:
                replacements.update(language_maps[lang.lower()])

        return replacements
