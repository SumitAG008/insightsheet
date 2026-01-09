// components/dashboard/TemplateSelector.jsx - Template library selector
import React, { useState } from 'react';
import PropTypes from 'prop-types';
import { FileText, Sparkles, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { templates, getTemplateCategories, loadTemplate } from '../../templates';

export default function TemplateSelector({ onTemplateLoad }) {
  const [selectedCategory, setSelectedCategory] = useState(null);
  const [isOpen, setIsOpen] = useState(false);

  const categories = getTemplateCategories();

  const handleLoadTemplate = (templateKey) => {
    const templateData = loadTemplate(templateKey);
    if (templateData && onTemplateLoad) {
      onTemplateLoad(templateData);
      setIsOpen(false);
    }
  };

  const filteredTemplates = selectedCategory
    ? Object.entries(templates).filter(([_, template]) => template.category === selectedCategory)
    : Object.entries(templates);

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" className="border-slate-300 dark:border-slate-700">
          <Sparkles className="w-4 h-4 mr-2" />
          Templates
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-2xl font-bold flex items-center gap-2">
            <FileText className="w-6 h-6" />
            Data Templates Library
          </DialogTitle>
          <DialogDescription>
            Choose a pre-built template to get started quickly
          </DialogDescription>
        </DialogHeader>

        {/* Category Filter */}
        <div className="flex flex-wrap gap-2 mb-6">
          <Button
            variant={selectedCategory === null ? 'default' : 'outline'}
            size="sm"
            onClick={() => setSelectedCategory(null)}
          >
            All Templates
          </Button>
          {categories.map(category => (
            <Button
              key={category}
              variant={selectedCategory === category ? 'default' : 'outline'}
              size="sm"
              onClick={() => setSelectedCategory(category)}
            >
              {category}
            </Button>
          ))}
        </div>

        {/* Templates Grid */}
        <div className="grid md:grid-cols-2 gap-4">
          {filteredTemplates.map(([key, template]) => (
            <div
              key={key}
              className="border border-slate-200 dark:border-slate-700 rounded-lg p-4 hover:border-blue-500 dark:hover:border-blue-500 transition-colors cursor-pointer"
              onClick={() => handleLoadTemplate(key)}
            >
              <div className="flex items-start justify-between mb-2">
                <h3 className="font-bold text-lg text-slate-900 dark:text-white">
                  {template.name}
                </h3>
                <Badge variant="secondary" className="ml-2">
                  {template.category}
                </Badge>
              </div>
              <p className="text-sm text-slate-600 dark:text-slate-400 mb-3">
                {template.description}
              </p>
              <div className="flex items-center gap-4 text-xs text-slate-500 dark:text-slate-500">
                <span>{template.headers.length} columns</span>
                <span>•</span>
                <span>{template.sampleRows.length} sample rows</span>
              </div>
              <Button
                className="w-full mt-3"
                onClick={(e) => {
                  e.stopPropagation();
                  handleLoadTemplate(key);
                }}
              >
                Use Template
              </Button>
            </div>
          ))}
        </div>
      </DialogContent>
    </Dialog>
  );
}

TemplateSelector.propTypes = {
  onTemplateLoad: PropTypes.func.isRequired,
};
