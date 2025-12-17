# InsightSheet-lite

**Privacy-first data analysis and database design platform powered by Meldra AI**

A comprehensive React application built with Vite that provides data analysis, AI-powered insights, database schema design, and file management tools.

## Features

- 📊 **CSV/Excel Analysis** - Upload and analyze data with AI-powered insights
- 🗄️ **Data Model Creator** - Visual database schema designer with AI generation
- 🤖 **Agentic AI** - Natural language data operations
- 📄 **File to PPT** - Convert files to PowerPoint presentations
- 🗂️ **ZIP Cleaner** - Batch filename cleaning utility
- 🔒 **Privacy-first** - All data processing happens in your browser

## Tech Stack

- **Frontend**: React 18 + Vite 6
- **UI**: Tailwind CSS + Radix UI
- **Backend**: Meldra SDK + Base44 Platform
- **AI/ML**: Custom Meldra Library (`src/lib/meldra`)

## Running the App

```bash
# Install dependencies
npm install

# Start development server
npm run dev

# Build for production
npm run build

# Preview production build
npm run preview
```

## Meldra Library

The application includes a comprehensive utility library at `src/lib/meldra/`:

- **Core**: LLM, Email, File operations
- **AI**: Schema generation, Data analysis, SQL generation
- **ML**: Statistics, Normalization, Outlier detection
- **UI**: Number, Currency, Date formatting
- **Backend**: API utilities, Pagination, Validation

See `src/lib/meldra/README.md` for complete documentation.

## Project Structure

```
src/
├── api/                    # API client and entities
│   ├── meldraClient.js    # Meldra SDK client
│   ├── entities.js        # Database entities
│   └── integrations.js    # Core integrations
├── lib/meldra/            # Meldra utility library
├── components/            # React components
├── pages/                 # Page components
└── main.jsx              # Application entry point
```

## Environment

- Development: `npm run dev` - http://localhost:5173
- Production: `npm run build`

## Support

For issues and support, please visit: https://github.com/SumitAG008/insightsheet

Built with ❤️ using Meldra Platform