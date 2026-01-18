import React, { useState } from 'react';
import { Sparkles, Wand2, BookOpen, Check, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import { InvokeLLM } from '@/api/integrations';
import { Subscription } from '@/api/entities';

const EXAMPLE_PROMPTS = [
  {
    title: 'E-commerce Platform',
    description: 'Create a schema for an e-commerce platform with users, products, orders, and reviews'
  },
  {
    title: 'Blog System',
    description: 'Design a blog database with authors, posts, comments, and categories'
  },
  {
    title: 'Library Management',
    description: 'Build a library system with books, authors, members, and borrowing records'
  },
  {
    title: 'Social Media App',
    description: 'Design a social network with users, posts, followers, likes, and comments'
  },
  {
    title: 'Task Management',
    description: 'Create a project management schema with projects, tasks, users, and assignments'
  },
  {
    title: 'Learning Platform',
    description: 'Build an online learning system with courses, students, instructors, and enrollments'
  }
];

export default function AISchemaAssistant({ currentSchema, onApplySchema, user }) {
  const [prompt, setPrompt] = useState('');
  const [loading, setLoading] = useState(false);
  const [generatedSchema, setGeneratedSchema] = useState(null);
  const [error, setError] = useState(null);

  const handleGenerateSchema = async () => {
    if (!prompt.trim()) {
      toast.error('Please enter a description');
      return;
    }

    setLoading(true);
    setError(null);
    setGeneratedSchema(null);

    try {
      // Check subscription limits
      if (user) {
        const subs = await Subscription.filter({ user_email: user.email });
        const subscription = subs[0];

        if (subscription) {
          const today = new Date().toISOString().split('T')[0];
          const lastUsed = subscription.ai_last_used?.split('T')[0];

          if (subscription.plan === 'free') {
            if (lastUsed === today && subscription.ai_queries_used >= 5) {
              toast.error('Daily AI limit reached. Upgrade to Premium for unlimited queries.');
              setLoading(false);
              return;
            }
          }
        }
      }

      const systemPrompt = `You are a database schema design expert. Generate a complete database schema based on the user's description.

Return ONLY a valid JSON object with this exact structure (no additional text, no markdown):
{
  "name": "Schema Name",
  "tables": [
    {
      "id": "table_1",
      "name": "TableName",
      "x": 100,
      "y": 100,
      "columns": [
        {
          "id": "col_1",
          "name": "column_name",
          "type": "VARCHAR",
          "primaryKey": false,
          "nullable": true,
          "unique": false,
          "autoIncrement": false,
          "defaultValue": ""
        }
      ]
    }
  ],
  "relationships": [
    {
      "id": "rel_1",
      "fromTable": "table_1",
      "fromColumn": "col_1",
      "toTable": "table_2",
      "toColumn": "col_2",
      "type": "many-to-one"
    }
  ]
}

Guidelines:
- Always include an 'id' primary key column (INTEGER, PRIMARY KEY, AUTO_INCREMENT) for each table
- Use appropriate data types: VARCHAR, INTEGER, BIGINT, TEXT, TIMESTAMP, BOOLEAN, DECIMAL, etc.
- Add created_at and updated_at TIMESTAMP columns where appropriate
- Create meaningful relationships between tables
- Use standard naming conventions (lowercase, underscores)
- Position tables in a grid layout (increment x by 350, y by 200 for each table)
- Relationship types: "one-to-one", "one-to-many", "many-to-one", "many-to-many"`;

      const result = await InvokeLLM({
        prompt: `${systemPrompt}\n\nUser Request: ${prompt}`,
        model: 'gpt-4o-mini',
        temperature: 0.7,
        max_tokens: 3000
      });

      // Parse the LLM response
      let schemaData;
      try {
        // Try to extract JSON from the response
        const jsonMatch = result.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
          schemaData = JSON.parse(jsonMatch[0]);
        } else {
          throw new Error('No JSON found in response');
        }
      } catch (parseError) {
        console.error('Failed to parse LLM response:', result);
        throw new Error('Failed to parse schema from AI response');
      }

      // Validate schema structure
      if (!schemaData.tables || !Array.isArray(schemaData.tables)) {
        throw new Error('Invalid schema structure');
      }

      setGeneratedSchema(schemaData);
      toast.success('Schema generated successfully!');

      // Update subscription usage
      if (user) {
        const subs = await Subscription.filter({ user_email: user.email });
        const subscription = subs[0];

        if (subscription) {
          const today = new Date().toISOString().split('T')[0];
          const lastUsed = subscription.ai_last_used?.split('T')[0];

          if (lastUsed !== today) {
            await subscription.update({
              ai_queries_used: 1,
              ai_last_used: new Date().toISOString()
            });
          } else {
            await subscription.update({
              ai_queries_used: subscription.ai_queries_used + 1
            });
          }
        }
      }
    } catch (err) {
      console.error('Schema generation error:', err);
      setError(err.message || 'Failed to generate schema');
      toast.error('Failed to generate schema. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleApplySchema = () => {
    if (generatedSchema) {
      onApplySchema(generatedSchema);
      setGeneratedSchema(null);
      setPrompt('');
    }
  };

  const handleUseExample = (example) => {
    setPrompt(example.description);
  };

  return (
    <div className="space-y-4">
      {/* Input Card */}
      <Card className="bg-slate-900/80 backdrop-blur-xl border border-slate-700/50 p-6">
        <div className="mb-6">
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2 bg-gradient-to-br from-blue-600 to-emerald-600 rounded-lg">
              <Sparkles className="w-5 h-5 text-white" />
            </div>
            <div>
              <h3 className="text-xl font-bold text-white">
                AI Schema Generator
              </h3>
              <p className="text-sm font-medium text-slate-300">
                Describe your database needs and let AI create the schema
              </p>
            </div>
          </div>
        </div>

        <div className="space-y-4">
          <div>
            <Label className="text-slate-200 font-semibold mb-2 block">
              Describe your database schema
            </Label>
            <Textarea
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              placeholder="Example: Create a database for a social media app with users, posts, comments, and likes. Users can follow each other and posts can have multiple tags..."
              className="bg-slate-800 border-slate-600 min-h-[120px] text-slate-100 font-medium"
              disabled={loading}
            />
          </div>

          <Button
            onClick={handleGenerateSchema}
            disabled={loading || !prompt.trim()}
            className="w-full bg-gradient-to-r from-blue-600 to-emerald-600 hover:from-blue-700 hover:to-emerald-700 text-white font-bold"
            size="lg"
          >
            {loading ? (
              <>
                <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                Generating Schema...
              </>
            ) : (
              <>
                <Wand2 className="w-5 h-5 mr-2" />
                Generate Schema with AI
              </>
            )}
          </Button>

          {error && (
            <div className="p-3 bg-red-900/20 border border-red-700 rounded-lg">
              <div className="text-sm text-red-400">{error}</div>
            </div>
          )}
        </div>
      </Card>

      {/* Generated Schema Preview */}
      {generatedSchema && (
        <Card className="bg-slate-900/80 backdrop-blur-xl border border-slate-700/50 p-6">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h4 className="text-lg font-bold text-white mb-1">
                Generated Schema
              </h4>
              <p className="text-sm font-medium text-slate-300">
                {generatedSchema.tables.length} tables •{' '}
                {generatedSchema.tables.reduce((sum, t) => sum + t.columns.length, 0)} columns •{' '}
                {generatedSchema.relationships?.length || 0} relationships
              </p>
            </div>
            <Button
              onClick={handleApplySchema}
              className="bg-gradient-to-r from-blue-600 to-emerald-600 font-semibold"
            >
              <Check className="w-4 h-4 mr-2" />
              Apply to Canvas
            </Button>
          </div>

          <div className="space-y-3 max-h-[400px] overflow-y-auto">
            {generatedSchema.tables.map(table => (
              <div
                key={table.id}
                className="bg-slate-800/50 border border-slate-600 rounded-lg p-4"
              >
                <div className="font-bold text-blue-400 mb-2">
                  {table.name}
                </div>
                <div className="space-y-1">
                  {table.columns.map(col => (
                    <div
                      key={col.id}
                      className="text-sm text-slate-300 flex items-center gap-2"
                    >
                      <span className="text-slate-400">•</span>
                      <span>{col.name}</span>
                      <span className="text-slate-500">:</span>
                      <span className="text-slate-400">{col.type}</span>
                      {col.primaryKey && (
                        <span className="text-yellow-400 text-xs">PK</span>
                      )}
                      {!col.nullable && (
                        <span className="text-red-400 text-xs">NOT NULL</span>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </Card>
      )}

      {/* Example Prompts */}
      <Card className="bg-slate-900/80 backdrop-blur-xl border border-slate-700/50 p-6">
        <div className="flex items-center gap-2 mb-4">
          <BookOpen className="w-5 h-5 text-blue-400" />
          <h4 className="text-lg font-bold text-white">
            Example Prompts
          </h4>
        </div>

        <div className="grid grid-cols-2 gap-3">
          {EXAMPLE_PROMPTS.map((example, index) => (
            <button
              key={index}
              onClick={() => handleUseExample(example)}
              disabled={loading}
              className="text-left p-3 bg-slate-800/50 border border-slate-600 rounded-lg hover:border-blue-500 hover:bg-slate-800 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <div className="text-sm font-bold text-blue-400 mb-1">
                {example.title}
              </div>
              <div className="text-xs font-medium text-slate-300">
                {example.description}
              </div>
            </button>
          ))}
        </div>
      </Card>

      {/* Tips Card */}
      <Card className="bg-slate-900/80 backdrop-blur-xl border border-slate-700/50 p-4">
        <h4 className="text-sm font-bold text-slate-200 mb-2">
          Tips for Better Results
        </h4>
        <ul className="space-y-1 text-xs font-medium text-slate-300">
          <li>• Be specific about the entities (users, products, orders, etc.)</li>
          <li>• Mention the relationships between entities</li>
          <li>• Include any special requirements (timestamps, soft deletes, etc.)</li>
          <li>• Specify if you need many-to-many relationships</li>
          <li>• Mention any specific data types or constraints needed</li>
        </ul>
      </Card>
    </div>
  );
}
