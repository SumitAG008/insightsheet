import { useState } from 'react';
import PropTypes from 'prop-types';
import { Button } from '@/components/ui/button';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { ChevronDown, Download, FileSpreadsheet, FileText, FileType2, Presentation, Sheet } from 'lucide-react';

const ITEMS = {
  pdf: ['PDF', FileText],
  pptx: ['PowerPoint', Presentation],
  docx: ['Word', FileType2],
  xlsx: ['Excel', FileSpreadsheet],
  csv: ['CSV', Sheet],
};

/** "Download ▾" with PDF, PowerPoint, Word, Excel (and CSV for one answer). */
export default function DownloadMenu({ formats, onPick, label = 'Download' }) {
  const [busy, setBusy] = useState(null);
  const pick = async (f) => {
    setBusy(f);
    try {
      await onPick(f);
    } finally {
      setBusy(null);
    }
  };
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="sm" disabled={Boolean(busy)}>
          <Download className="mr-1.5 h-3.5 w-3.5" />{busy ? `Creating ${ITEMS[busy][0]}…` : label}<ChevronDown className="ml-1 h-3.5 w-3.5" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start">
        {formats.map((f) => {
          const [name, Icon] = ITEMS[f];
          return <DropdownMenuItem key={f} onSelect={() => pick(f)}><Icon className="mr-2 h-4 w-4" />{name}</DropdownMenuItem>;
        })}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

DownloadMenu.propTypes = { formats: PropTypes.arrayOf(PropTypes.string).isRequired, onPick: PropTypes.func.isRequired, label: PropTypes.string };
