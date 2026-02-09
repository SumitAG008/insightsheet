# 📚 Complete User Guide: DB Schema, File Analysis & Agentic AI

## 🗄️ **1. DB Schema Builder**

### **What is it?**
Design and visualize database schemas with tables, columns, relationships, and generate SQL code.

### **How to Use:**

#### **Step 1: Access DB Schema**
1. Go to **"DB Schema"** in the navigation menu
2. You'll see the **Visual Canvas** tab (default)

#### **Step 2: Create Tables**

**Option A: Add Table Manually**
1. Click **"Add Table"** button (top of canvas)
2. A new table appears on the canvas
3. Click the table to select it
4. Use the **"Table Designer"** tab to:
   - Rename table
   - Add columns
   - Set column types (INTEGER, VARCHAR, DATE, etc.)
   - Set primary keys
   - Set nullable/not null

**Option B: Import from File**
1. Click **"Import Schema"** button
2. Upload a JSON or XML file containing schema definition
3. Tables will be automatically created

**Option C: Use AI Assistant**
1. Go to **"AI Assistant"** tab
2. Describe your schema: "Create a database for an e-commerce store with products, orders, and customers"
3. AI will generate the schema automatically

#### **Step 3: Create Relationships**

**Visual Method:**
1. Click on a column in one table
2. Drag to a column in another table
3. Relationship line appears
4. Select relationship type (One-to-One, One-to-Many, Many-to-Many)

**Manual Method:**
1. Go to **"Relationships"** tab
2. Click **"Add Relationship"**
3. Select:
   - From Table & Column
   - To Table & Column
   - Relationship Type

#### **Step 4: Generate SQL**
1. Go to **"SQL Generator"** tab
2. Click **"Generate SQL"**
3. SQL code for all tables and relationships is generated
4. Copy or download the SQL file

#### **Step 5: Export Schema**
1. Click **"Export"** button
2. Choose format: JSON or SQL
3. Download your schema

---

## 📊 **2. File Analyzer**

### **What is it?**
Upload Excel/CSV files to get AI-powered insights about structure, data quality, and suggested operations.

### **How to Use:**

#### **Step 1: Upload File**
1. Go to **"Analyzer"** in navigation
2. Click **"Upload Your File"** area or drag & drop
3. Supported formats: `.xlsx`, `.xls`, `.csv`
4. **File Size Limit:**
   - Free Plan: 10MB
   - Premium: 500MB

#### **Step 2: Analyze**
1. After upload, click **"Analyze File"** button
2. Wait for analysis (10-30 seconds)
3. Results appear below

#### **Step 3: Review Results**

**You'll see:**
- **File Structure:**
  - Number of sheets
  - Row and column counts
  - Column names and types

- **Data Quality:**
  - Missing values percentage
  - Duplicate rows
  - Data type issues

- **AI Insights:**
  - What type of data (sales, financial, inventory, etc.)
  - Key patterns and trends
  - Data quality assessment
  - Suggested operations

- **Recommendations:**
  - Actions to improve data quality
  - Suggested visualizations
  - Analysis suggestions

#### **Step 4: Use Insights**
- Copy insights for reports
- Use recommendations to clean data
- Export analysis results

---

## 🤖 **3. Agentic AI Assistant**

### **What is it?**
An autonomous AI agent that plans, executes, and reports on data analysis tasks automatically.

### **How to Use:**

#### **Step 1: Upload Data First** ⚠️ **IMPORTANT**
1. Go to **"Dashboard"** (main page)
2. Upload a CSV file using the upload area
3. Wait for file to load
4. **Data is stored in browser session** (not on server)

#### **Step 2: Access AI Assistant**
1. Go to **"AI Assistant"** in navigation
2. You'll see the Agentic AI interface

#### **Step 3: Describe Your Task**
Enter what you want the AI to do, for example:
- "Analyze this data and find the top 3 insights"
- "Clean the data: remove duplicates, fix missing values"
- "Find trends and predict next month's values"
- "Identify anomalies and potential errors"
- "Calculate key metrics: avg, median, mode, std deviation"
- "Generate a professional report summary"

#### **Step 4: Run Agent**
1. Click **"Run Agent"** button
2. AI will:
   - **Plan:** Create step-by-step execution plan
   - **Execute:** Perform each step autonomously
   - **Report:** Show what it did and results

#### **Step 5: Review Results**
- **Execution Plan:** See what steps AI planned
- **Results:** View analysis results
- **History:** Previous agent runs are saved

#### **Step 6: Iterate**
- Modify your task description
- Run again for different analysis
- Build on previous results

---

## 🔗 **How They Work Together**

### **Workflow Example:**

1. **Upload Data** → Dashboard
   - Upload your CSV/Excel file

2. **Analyze Structure** → Analyzer
   - Understand your data structure
   - Identify quality issues

3. **Design Schema** → DB Schema
   - Create database schema based on your data
   - Define relationships

4. **AI Analysis** → AI Assistant
   - Let AI analyze and clean data
   - Get insights automatically

5. **Generate Reports** → P&L Builder
   - Create financial statements
   - Generate formatted Excel files

---

## ⚠️ **Important Notes**

### **File Upload:**
- **Dashboard:** Upload CSV/Excel for data analysis
- **Analyzer:** Upload for structure analysis
- **AI Assistant:** Requires data uploaded in Dashboard first

### **Data Storage:**
- **Privacy First:** Files processed in browser/memory
- **No Server Storage:** Files never stored on server
- **Session Storage:** Data stays in browser session only

### **Authentication:**
- Some features require login
- Free plan has limits (file size, AI queries)
- Premium plan removes limits

---

## 🎯 **Quick Start Guide**

### **For Data Analysis:**
1. Dashboard → Upload CSV
2. Analyzer → Analyze structure
3. AI Assistant → Get insights

### **For Database Design:**
1. DB Schema → Add tables
2. Create relationships
3. Generate SQL

### **For Financial Reports:**
1. P&L Builder → Describe your statement
2. Generate Excel file
3. Download and use

---

## 🆘 **Troubleshooting**

### **"Data Required" Error in AI Assistant:**
- **Solution:** Upload CSV file in Dashboard first

### **"Not Found" Error:**
- **Solution:** Backend not connected. Check Railway deployment.

### **File Size Error:**
- **Solution:** Upgrade to Premium or reduce file size

### **Analysis Taking Too Long:**
- **Solution:** Large files take time. Wait 30-60 seconds.

---

**Need Help?** Check the console (F12) for detailed error messages.
