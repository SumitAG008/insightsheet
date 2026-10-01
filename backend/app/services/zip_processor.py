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
                        logger.warning("ZIP entry too large")
                        return False

                    total_size += info.file_size
                    if total_size > self.max_file_size:
                        logger.warning("Total uncompressed size exceeds limit")
                        return False

                    # Check for directory traversal
                    parts = info.filename.replace('\\', '/').split('/')
                    if '..' in parts or info.filename.startswith(('/', '\\')):
                        logger.warning("ZIP entry with an unsafe path")
                        return False

                    # Check for dangerous extensions
                    dangerous_exts = ['.exe', '.dll', '.bat', '.cmd', '.sh', '.ps1']
                    if any(info.filename.lower().endswith(ext) for ext in dangerous_exts):
                        logger.warning("ZIP entry with a blocked file type")
                        return False

            return True

        except Exception as e:
            logger.error(f"Error validating ZIP: {str(e)}")
            return False

    @staticmethod
    def expand_char_set(spec: Optional[str]) -> Optional[set]:
        """'a-z0-9-_' -> the letters a..z, digits 0..9, '-' and '_' (a '-' at either end is literal)."""
        if not spec:
            return None
        chars = set()
        i = 0
        while i < len(spec):
            if i + 2 < len(spec) and spec[i + 1] == '-' and ord(spec[i]) <= ord(spec[i + 2]):
                chars.update(chr(c) for c in range(ord(spec[i]), ord(spec[i + 2]) + 1))
                i += 3
            else:
                chars.add(spec[i])
                i += 1
        return chars

    def sanitize_filename(
        self,
        filename: str,
        allowed_chars: Optional[str] = None,
        disallowed_chars: Optional[str] = None,
        replace_char: str = '_',
        remove_spaces: bool = False,
        max_length: int = 255,
        language_replacements: Optional[Dict[str, str]] = None,
        keep_extension: bool = True,
    ) -> str:
        """
        Clean one file or folder name. The extension is kept (and lowercased only if needed to
        pass the allowed characters). Allowed characters accept ranges such as 'a-z0-9'; a letter
        whose lowercase form is allowed is lowercased rather than replaced.
        """
        rep = replace_char or ''
        try:
            name = "".join(ch for ch in filename if ord(ch) >= 32)
            # Language rules first, before accents are stripped (so German ä can become ae).
            for old, new in (language_replacements or {}).items():
                name = name.replace(old, new)

            dot = name.rfind('.')
            if keep_extension and 0 < dot < len(name) - 1:
                base, ext = name[:dot], name[dot:]
            else:
                base, ext = name, ''

            allowed = self.expand_char_set(allowed_chars)
            if allowed is not None and ext:
                allowed = allowed | {'.'}

            def clean(part: str) -> str:
                part = unicodedata.normalize('NFD', part)
                part = ''.join(c for c in part if unicodedata.category(c) != 'Mn')
                part = unicodedata.normalize('NFKC', part)
                if remove_spaces:
                    part = part.replace(' ', '')
                if disallowed_chars:
                    part = ''.join(rep if c in disallowed_chars else c for c in part)
                if allowed is not None:
                    part = ''.join(
                        c if c in allowed else (c.lower() if c.lower() in allowed else rep) for c in part
                    )
                # Keep printable ASCII only (anything else becomes the replacement character).
                return ''.join(c if c.isascii() and c.isprintable() else rep for c in part)

            base, ext = clean(base), clean(ext)
            if rep:
                base = re.sub(f'(?:{re.escape(rep)}){{2,}}', rep, base)
            base = re.sub(r'[._-]{2,}', lambda m: m.group(0)[0], base)
            base = base.strip('. ' + rep)

            if max_length and len(base) + len(ext) > max_length:
                base = base[: max(1, max_length - len(ext))]
            return (base or 'file') + ext

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
            used_paths: set = set()

            with zipfile.ZipFile(temp_input, 'r') as source_zip:
                for item in source_zip.infolist():
                    # Skip directories
                    if item.filename.endswith('/'):
                        continue

                    try:
                        clean_opts = dict(
                            allowed_chars=options.get('allowed_chars'),
                            disallowed_chars=options.get('disallowed_chars'),
                            replace_char=options.get('replace_char', '_'),
                            remove_spaces=options.get('remove_spaces', False),
                            max_length=options.get('max_length', 255),
                            language_replacements=options.get('language_replacements'),
                        )
                        # Clean every folder name and the file name, keeping the structure.
                        segments = [p for p in item.filename.replace('\\', '/').split('/') if p and p != '.']
                        cleaned = [
                            self.sanitize_filename(seg, keep_extension=(i == len(segments) - 1), **clean_opts)
                            for i, seg in enumerate(segments)
                        ]
                        new_path = self._unique_path('/'.join(cleaned), used_paths, clean_opts['replace_char'] or '-')

                        with source_zip.open(item) as source:
                            content = source.read()

                        processed_files.append({
                            'path': new_path,
                            'content': content,
                            'original': item.filename,
                            'date_time': item.date_time,
                        })

                    except Exception as e:
                        logger.error(f"Error processing a ZIP entry: {type(e).__name__}")
                        continue

            # Create output ZIP
            temp_output = os.path.join(temp_dir, f"output_{secrets.token_hex(8)}.zip")

            with zipfile.ZipFile(temp_output, 'w', zipfile.ZIP_DEFLATED) as target_zip:
                for file_info in processed_files:
                    info = zipfile.ZipInfo(file_info['path'], date_time=file_info['date_time'])
                    info.compress_type = zipfile.ZIP_DEFLATED
                    target_zip.writestr(info, file_info['content'])

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

    @staticmethod
    def _unique_path(path: str, used: set, sep: str) -> str:
        """Add -2, -3, ... when a cleaned path clashes with one already written (case-insensitive)."""
        candidate, n = path, 2
        folder, _, name = path.rpartition('/')
        dot = name.rfind('.')
        base, ext = (name[:dot], name[dot:]) if dot > 0 else (name, '')
        while candidate.lower() in used:
            candidate = f"{folder + '/' if folder else ''}{base}{sep}{n}{ext}"
            n += 1
        used.add(candidate.lower())
        return candidate

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
