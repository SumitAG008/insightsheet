# AI & LLM Features in InsightSheet-lite 🤖

## 🎯 Overview

Your application uses **OpenAI GPT-4** for intelligent data analysis and processing. All AI features are **privacy-first** - prompts and responses are **NEVER stored** on your servers.

## 🧠 AI/LLM Architecture

```
User Input → Frontend → Backend API → OpenAI GPT-4 → Response → User
                              ↓
                        (NOT STORED)
                       Ephemeral Only
```

**Key Privacy Features:**
- ✅ Prompts sent to OpenAI but NOT stored in your database
- ✅ Responses returned to user but NOT logged
- ✅ Zero data retention policy
- ✅ Completely ephemeral processing

## 🚀 AI Features Implemented

### 1. **Data Analysis & Insights** 📊

**What it does:**
- Analyzes your spreadsheet data
- Identifies patterns and trends
- Provides actionable recommendations
- Summarizes key findings

**Endpoint:** `POST /api/integrations/llm/invoke`

**Example Usage:**

```javascript
// Frontend
import { backendApi } from '@/api/backendClient';

const result = await backendApi.llm.invoke(
  "Analyze this sales data and provide top 3 insights",
  { addContext: false }
);

console.log(result.response);
// Response: "Based on the data, I found:
// 1. Sales peaked in Q3 with 45% growth
// 2. Product A is your top seller at 32% of revenue
// 3. Customer retention rate is 78%, above industry average"
```

**Backend Processing:**

```python
# backend/app/services/ai_service.py

async def invoke_llm(prompt: str, ...):
    """
    ZERO STORAGE - Prompt and response are ephemeral
    """
    messages = [
        {
            "role": "system",
            "content": "You are a data analysis assistant..."
        },
        {
            "role": "user",
            "content": prompt  # NOT STORED
        }
    ]

    response = openai.chat.completions.create(
        model="gpt-4-turbo-preview",
        messages=messages,
        max_tokens=2000
    )

    return response.choices[0].message.content  # Returned but NOT STORED
```

**Privacy:**
- ✅ User's data description sent to OpenAI
- ❌ NOT stored in your database
- ❌ NOT logged in files
- ✅ Only usage count incremented for billing

---

### 2. **Smart Formula Generation** 🧮

**What it does:**
- Generates Excel formulas from natural language
- Explains what the formula does
- Provides usage examples

**Endpoint:** `POST /api/ai/formula`

**Example Usage:**

```javascript
// Generate formula
const formula = await backendApi.llm.generateFormula(
  "Sum all values in column A that are greater than 100",
  "Sales spreadsheet with revenue data"
);

console.log(formula);
// Response:
// {
//   "formula": "=SUMIF(A:A, \">100\")",
//   "explanation": "This formula sums all values in column A that exceed 100",
//   "example": "If A1=50, A2=150, A3=200, result = 350"
// }
```

**How it works:**

```python
# backend/app/services/ai_service.py

async def generate_formula(description: str, context: Optional[str]):
    prompt = f"""
    Generate an Excel formula based on this description:
    {description}

    Context: {context}

    Respond with JSON:
    {{
        "formula": "=THE_FORMULA_HERE",
        "explanation": "Simple explanation",
        "example": "Usage example"
    }}
    """

    response = await invoke_llm(
        prompt=prompt,
        response_schema={"type": "json_object"}
    )

    return response  # JSON formula object
```

**Privacy:** Same as above - prompt and response NOT stored.

---

### 3. **Intelligent Chart Suggestions** 📈

**What it does:**
- Analyzes your data columns
- Suggests best chart types
- Recommends X/Y axes
- Provides reasoning

**Endpoint:** `POST /api/ai/suggest-chart`

**Example Usage:**

```javascript
// Suggest chart type
const suggestion = await backendApi.llm.suggestChart(
  [
    { name: "Product", type: "text" },
    { name: "Revenue", type: "numeric" },
    { name: "Quarter", type: "text" }
  ],
  [
    { Product: "iPhone", Revenue: 50000, Quarter: "Q1" },
    { Product: "MacBook", Revenue: 35000, Quarter: "Q1" }
  ]
);

console.log(suggestion);
// Response:
// {
//   "primary_chart": {
//     "type": "bar",
//     "reason": "Best for comparing products"
//   },
//   "alternative_charts": [
//     { "type": "pie", "reason": "Show revenue distribution" }
//   ],
//   "x_axis": "Product",
//   "y_axis": "Revenue",
//   "grouping": "Quarter"
// }
```

**How it works:**

```python
async def suggest_chart_type(columns: List[Dict], data_preview: Optional[List]):
    prompt = f"""
    Given these data columns:
    {json.dumps(columns)}

    Sample data:
    {json.dumps(data_preview[:5])}

    Suggest the best chart types to visualize this data.

    Respond with JSON:
    {{
        "primary_chart": {{"type": "bar|line|pie|scatter", "reason": "..."}},
        "alternative_charts": [...],
        "x_axis": "suggested column",
        "y_axis": "suggested column",
        "grouping": "optional grouping column"
    }}
    """

    response = await invoke_llm(prompt, response_schema={"type": "json_object"})
    return response
```

---

### 4. **Data Analysis with Questions** ❓

**What it does:**
- Answer specific questions about your data
- Provide insights and patterns
- Make recommendations

**Endpoint:** `POST /api/ai/analyze`

**Example Usage:**

```javascript
// Ask specific question
const analysis = await backendApi.llm.analyzeData(
  "Sales data with columns: Product, Revenue, Date, Region",
  "Which region has the highest growth rate?"
);

console.log(analysis);
// Response:
// {
//   "insights": [
//     "North region shows 45% YoY growth",
//     "South region has highest absolute revenue",
//     "West region is emerging market with 30% growth"
//   ],
//   "recommendations": [
//     "Focus marketing budget on North region",
//     "Investigate why East region is declining"
//   ],
//   "patterns": [
//     "Q4 consistently strongest quarter",
//     "Product A drives 60% of growth"
//   ],
//   "summary": "North region leads in growth with 45% increase"
// }
```

---

### 5. **Image Generation (Premium)** 🎨

**What it does:**
- Generate images using DALL-E 3
- Create visualizations
- Design graphics for presentations

**Endpoint:** `POST /api/integrations/image/generate`

**Example Usage:**

```javascript
// Generate image (Premium only)
const result = await backendApi.llm.generateImage(
  "A professional business chart showing exponential growth",
  "1024x1024"
);

console.log(result.image_url);
// Response: "https://oaidalleapiprodscus.blob.core.windows.net/..."
// Temporary URL from OpenAI
```

**Privacy:**
- ✅ Image URL is temporary (expires in 1 hour)
- ❌ Image NOT stored on your servers
- ❌ Prompt NOT logged
- ✅ Only Premium users can access

---

## 🔐 AI Usage Limits

### Free Plan
- **5 AI queries per day**
- No image generation
- Basic features only

### Premium Plan ($9-10/month)
- **Unlimited AI queries**
- Image generation included
- All advanced features

**Enforcement:**

```python
# backend/app/main.py

@app.post("/api/integrations/llm/invoke")
async def invoke_llm_endpoint(request, current_user, db):
    subscription = db.query(Subscription).filter(
        Subscription.user_email == current_user["email"]
    ).first()

    # Check limit (skip for premium)
    if subscription.plan != "premium":
        if subscription.ai_queries_used >= subscription.ai_queries_limit:
            raise HTTPException(
                status_code=429,
                detail="AI query limit reached. Upgrade to Premium!"
            )

    # Invoke AI
    response = await invoke_llm(request.prompt, ...)

    # Increment usage (only for free plan)
    if subscription.plan != "premium":
        subscription.ai_queries_used += 1
        db.commit()

    return {"response": response}
```

---

## 🤖 Agentic AI (Future Enhancement)

**Current Status:** Basic implementation in `src/pages/AgenticAI.jsx`

**Planned Features:**
1. **Multi-step Task Execution**
   - User: "Clean my data, create 3 charts, and summarize findings"
   - AI plans steps and executes each one

2. **Autonomous Data Processing**
   - AI decides best cleaning operations
   - Automatically generates optimal visualizations
   - Writes summary report

3. **Chain of Thought**
   - AI shows its reasoning process
   - User can intervene at any step
   - Transparent decision making

**Example Flow:**

```
User: "Analyze my sales data and create a presentation"

Agent Step 1: "I'll first clean your data"
  → Remove duplicates
  → Fix date formats
  → Handle missing values

Agent Step 2: "Analyzing patterns"
  → GPT-4 analysis
  → Identify top products
  → Find growth trends

Agent Step 3: "Creating visualizations"
  → Bar chart for products
  → Line chart for trends
  → Pie chart for distribution

Agent Step 4: "Generating presentation"
  → Excel to PPT conversion
  → Add AI-generated insights
  → Professional formatting

Result: "Presentation ready for download!"
```

**Implementation (Future):**

```python
# backend/app/services/agent_service.py

class AIAgent:
    def __init__(self, user_email):
        self.user_email = user_email
        self.steps = []

    async def plan(self, user_request: str):
        """Plan the steps needed"""
        prompt = f"""
        User request: {user_request}

        Break this into steps. Respond with JSON:
        {{
            "steps": [
                {{"action": "clean_data", "params": {{}}}},
                {{"action": "analyze", "params": {{}}}},
                {{"action": "visualize", "params": {{}}}},
                {{"action": "generate_report", "params": {{}}}}
            ]
        }}
        """

        plan = await invoke_llm(prompt, response_schema={"type": "json_object"})
        self.steps = plan["steps"]
        return plan

    async def execute(self):
        """Execute each step"""
        for step in self.steps:
            if step["action"] == "clean_data":
                await self.clean_data(step["params"])
            elif step["action"] == "analyze":
                await self.analyze(step["params"])
            # ... etc
```

---

## 📊 AI Activity Logging (Admin Only)

**What's Logged:**

```python
# backend/app/database.py

class UserActivity(Base):
    __tablename__ = "user_activities"

    id = Column(Integer, primary_key=True)
    user_email = Column(String, index=True)
    activity_type = Column(String)  # "ai_query", "formula_generation", etc.
    page_name = Column(String)      # Where it happened
    created_date = Column(DateTime) # When it happened
    # NO details field - NO content stored!
```

**What's NOT Logged:**
- ❌ AI prompts
- ❌ AI responses
- ❌ User data content
- ❌ Any sensitive information

**Only logged for billing/analytics:**
- ✅ That an AI query occurred
- ✅ Which feature was used
- ✅ Timestamp
- ✅ User email (for usage counting)

---

## 🔒 Privacy & Security

### Data Flow

```
User Data → Frontend (Browser) → Backend API → OpenAI API
                                       ↓
                                 Count Usage
                                (NO CONTENT)
                                       ↓
                                   Database
                              (Only metadata)
```

### What Goes to OpenAI

✅ **Sent to OpenAI:**
- User's prompt/question
- Data summary (column names, sample values)
- Context provided by user

❌ **NOT sent to OpenAI:**
- Full spreadsheet content
- Personal identifying information
- Payment details
- Login credentials

### OpenAI's Policy

According to OpenAI's terms:
- API data NOT used for training
- Data NOT stored by OpenAI (ephemeral)
- 30-day retention for abuse monitoring only
- GDPR compliant

### Your Application's Policy

✅ **Your servers:**
- Count AI queries for billing
- Log activity type (not content)
- Enforce usage limits

❌ **Your servers NEVER store:**
- Prompts
- Responses
- Data content
- Any AI conversation history

---

## 🧪 Testing AI Features

### 1. Test Basic LLM

```bash
# Start backend
cd backend && ./run.sh

# In another terminal, test API:
curl -X POST http://localhost:8000/api/integrations/llm/invoke \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "prompt": "Explain what VLOOKUP does in Excel",
    "add_context_from_internet": false,
    "response_json_schema": null
  }'
```

### 2. Test Formula Generation

```bash
curl -X POST http://localhost:8000/api/ai/formula \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "description": "Sum values in column A",
    "context": "Sales data"
  }'
```

### 3. Test in Frontend

```javascript
// In browser console after logging in
import { backendApi } from '@/api/backendClient';

// Test AI query
const result = await backendApi.llm.invoke(
  "What is the best chart for sales data?"
);
console.log(result.response);

// Check usage
const subscription = await backendApi.subscriptions.getMy();
console.log(`Used: ${subscription.ai_queries_used}/${subscription.ai_queries_limit}`);
```

---

## 💡 Best Practices for AI Features

### 1. **Provide Context**

❌ Bad:
```javascript
await backendApi.llm.invoke("Analyze this");
```

✅ Good:
```javascript
await backendApi.llm.invoke(
  "Analyze sales data with columns: Product, Revenue, Date. " +
  "Sample: iPhone $50k, MacBook $35k. " +
  "Question: Which product has highest growth?"
);
```

### 2. **Use Structured Outputs**

```javascript
// Request JSON response for easier parsing
const result = await backendApi.llm.invoke(
  "Provide 3 insights about this data",
  {
    responseSchema: {
      type: "json_object"
    }
  }
);

// Result: {"insights": ["...", "...", "..."]}
```

### 3. **Handle Errors Gracefully**

```javascript
try {
  const result = await backendApi.llm.invoke(prompt);
} catch (error) {
  if (error.message.includes('limit reached')) {
    // Show upgrade modal
    showUpgradePrompt();
  } else {
    // Show error message
    alert('AI query failed. Please try again.');
  }
}
```

### 4. **Monitor Usage**

```javascript
// Check before making query
const subscription = await backendApi.subscriptions.getMy();

if (subscription.plan === 'free') {
  const remaining = subscription.ai_queries_limit - subscription.ai_queries_used;
  if (remaining <= 0) {
    alert('Daily limit reached. Upgrade to Premium for unlimited queries!');
    return;
  }
  console.log(`${remaining} AI queries remaining today`);
}
```

---

## 🚀 Future AI Enhancements

### Phase 1 (Current)
- ✅ Basic LLM integration
- ✅ Formula generation
- ✅ Chart suggestions
- ✅ Data analysis

### Phase 2 (Planned)
- 🔄 Agentic AI with multi-step execution
- 🔄 Conversation history (ephemeral, in-session only)
- 🔄 Advanced data transformations
- 🔄 Custom AI agents per user

### Phase 3 (Future)
- 📋 Fine-tuned models for specific industries
- 📋 Batch processing of multiple files
- 📋 Automated report generation
- 📋 Predictive analytics

---

## 📞 OpenAI API Configuration

### Required: OpenAI API Key

Get your API key from: https://platform.openai.com/api-keys

**Add to backend/.env:**
```env
OPENAI_API_KEY=sk-your-key-here
```

### Models Used

1. **GPT-4 Turbo Preview**
   - Text analysis
   - Formula generation
   - Data insights
   - Cost: ~$0.01 per 1K input tokens

2. **DALL-E 3**
   - Image generation (Premium only)
   - Cost: ~$0.04 per image (1024x1024)

### Cost Management

Average costs per user:
- **Free plan (5 queries/day)**: ~$0.05/month
- **Premium (unlimited)**: ~$1-5/month (depending on usage)

With 100 users:
- Free users: ~$5/month
- Premium users: ~$100-500/month

**Your monthly AI cost: $100-500** (manageable with Premium pricing of $9-10/user/month)

---

## 🎯 Summary

Your InsightSheet-lite application includes:

✅ **AI Data Analysis** - GPT-4 powered insights
✅ **Smart Formulas** - Natural language to Excel
✅ **Chart Suggestions** - Intelligent visualization
✅ **Image Generation** - DALL-E for graphics (Premium)
✅ **Privacy-First** - Zero data storage
✅ **Usage Limits** - Free (5/day) vs Premium (unlimited)
✅ **Secure** - No content logging, ephemeral only

**All AI features work with your Python backend and are ready to use!** 🚀
