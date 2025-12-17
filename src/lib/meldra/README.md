# Meldra Library

A comprehensive JavaScript library for AI, ML, UI, and backend utilities built specifically for the Meldra platform and InsightSheet application.

## Installation

The library is included in the project. Import modules as needed:

```javascript
import { core, ai, ml, ui, backend } from '@/lib/meldra';
```

## Modules

### Core Integrations (`core`)

Core platform integrations for LLM, email, file operations, and more.

```javascript
// Invoke LLM
const response = await core.InvokeLLM({
  prompt: 'Generate a database schema',
  model: 'gpt-4o-mini',
  temperature: 0.7,
  max_tokens: 2000
});

// Send Email
await core.SendEmail({
  to: 'user@example.com',
  subject: 'Welcome',
  body: '<h1>Welcome!</h1>'
});

// Upload File
const result = await core.UploadFile({
  file: fileBlob,
  folder: 'uploads'
});

// Generate Image
const image = await core.GenerateImage({
  prompt: 'A futuristic database visualization',
  size: '1024x1024'
});
```

### AI Utilities (`ai`)

High-level AI utilities for common tasks.

```javascript
// Generate database schema from description
const schema = await ai.generateDatabaseSchema(
  'Create an e-commerce platform with users, products, and orders'
);

// Analyze data
const insights = await ai.analyzeData(salesData, 'What are the top products?');

// Generate SQL from natural language
const sql = await ai.generateSQL('Get users who purchased last month', schema);

// Summarize text
const summary = await ai.summarizeText(longArticle, { maxLength: 150 });

// Extract structured data
const data = await ai.extractStructuredData(
  'John Doe, 30, works at Acme',
  { name: 'string', age: 'number', company: 'string' }
);
```

### ML Utilities (`ml`)

Machine learning and data processing functions.

```javascript
// Calculate statistics
const stats = ml.calculateStatistics([1, 2, 3, 4, 5]);
// { mean: 3, median: 3, stdDev: 1.41, min: 1, max: 5 }

// Normalize data (0-1 range)
const normalized = ml.normalizeData([10, 20, 30, 40, 50]);

// Standardize data (Z-score)
const standardized = ml.standardizeData([10, 20, 30, 40, 50]);

// Detect outliers
const outliers = ml.detectOutliers([1, 2, 3, 4, 5, 100]);
// { outliers: [100], cleanData: [1, 2, 3, 4, 5] }

// Fill missing values
const filled = ml.fillMissingValues([1, null, 3, null, 5], 'mean');

// Calculate correlation
const correlation = ml.calculateCorrelation([1, 2, 3], [2, 4, 6]);

// Bin continuous data
const binned = ml.binData([1, 2, 3, 4, 5, 6, 7, 8, 9, 10], 3);
```

### UI Utilities (`ui`)

Formatting and display utilities for user interfaces.

```javascript
// Format numbers
ui.formatNumber(1234567.89); // "1,234,567.89"

// Format currency
ui.formatCurrency(1234.56); // "$1,234.56"

// Format percentage
ui.formatPercentage(0.1234); // "12.3%"

// Format file size
ui.formatFileSize(1048576); // "1.00 MB"

// Format dates
ui.formatDate(new Date(), { format: 'long' }); // "December 17, 2024"

// Relative time
ui.formatRelativeTime(new Date(Date.now() - 3600000)); // "1 hour ago"

// Truncate strings
ui.truncateString('Hello World', 8); // "Hello..."

// Format duration
ui.formatDuration(90000); // "1m 30s"

// Format data types
ui.formatDataType('VARCHAR'); // "String"
```

### Backend Utilities (`backend`)

Backend API utilities for responses, pagination, and validation.

```javascript
// Create API response
const response = backend.createResponse({ users: [] }, 'Success', 200);

// Create error response
const error = backend.createError('Not found', 404);

// Paginate data
const paginated = backend.paginateData(users, 2, 10);
// { data: [...], page: 2, limit: 10, total: 100, totalPages: 10 }

// Validate required fields
const validation = backend.validateRequiredFields(
  { name: 'John' },
  ['name', 'email']
);
// { valid: false, missing: ['email'] }

// Sanitize object
const clean = backend.sanitizeObject({ a: 1, b: null, c: undefined });
// { a: 1 }
```

## Architecture

```
src/lib/meldra/
├── index.js                  # Main entry point
├── README.md                 # This file
├── core/
│   └── integrations.js       # Core platform integrations
├── ai/
│   └── llm.js                # LLM and AI utilities
├── ml/
│   └── data-processing.js    # ML and data processing
├── ui/
│   └── formatters.js         # UI formatting utilities
└── backend/
    └── api.js                # Backend API utilities
```

## Best Practices

1. **Import only what you need** - Tree-shaking will remove unused code
2. **Handle errors** - All async functions can throw errors
3. **Type safety** - Consider adding TypeScript definitions
4. **Performance** - ML functions can be CPU-intensive for large datasets

## Examples

### Complete Workflow: AI-Powered Schema Generation

```javascript
import { ai, core, ui } from '@/lib/meldra';

async function createSchemaFromDescription(description) {
  try {
    // Generate schema with AI
    const schema = await ai.generateDatabaseSchema(description);

    // Upload schema as JSON
    const blob = new Blob([JSON.stringify(schema, null, 2)], {
      type: 'application/json'
    });

    const uploadResult = await core.UploadFile({
      file: blob,
      folder: 'schemas'
    });

    // Send notification email
    await core.SendEmail({
      to: 'user@example.com',
      subject: 'Schema Generated',
      body: `Your schema has been generated with ${schema.tables.length} tables.`
    });

    return {
      schema,
      fileUrl: uploadResult.url,
      timestamp: ui.formatDate(new Date(), { format: 'datetime' })
    };
  } catch (error) {
    console.error('Schema generation failed:', error);
    throw error;
  }
}
```

### Data Analysis Pipeline

```javascript
import { ml, ai, ui } from '@/lib/meldra';

async function analyzeDataset(data, question) {
  // Calculate statistics
  const stats = ml.calculateStatistics(data);

  // Detect and remove outliers
  const { cleanData, outliers } = ml.detectOutliers(data);

  // Get AI insights
  const insights = await ai.analyzeData(cleanData, question);

  return {
    statistics: {
      mean: ui.formatNumber(stats.mean),
      median: ui.formatNumber(stats.median),
      stdDev: ui.formatNumber(stats.stdDev)
    },
    outliers: outliers.length,
    insights
  };
}
```

## Contributing

When adding new utilities:

1. Add the function to the appropriate module
2. Include JSDoc comments with examples
3. Update this README with usage examples
4. Test thoroughly before committing

## License

MIT License - Copyright (c) 2024 Meldra Team
