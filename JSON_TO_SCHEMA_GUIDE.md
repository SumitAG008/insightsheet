# JSON/XML to DB Schema Converter Guide

## ✅ Feature Added

You can now import **JSON data** (like your user data) and it will automatically:
1. Analyze the data structure
2. Infer column types and properties
3. Convert to visual DB Schema
4. Display on the canvas

---

## 🚀 How to Use

### Step 1: Prepare Your JSON Data

Your JSON can be:
- **Array of objects** (like your user data)
- **Single object**
- **Schema file** (with tables/columns structure)

### Step 2: Import in DB Schema Page

1. Go to **DB Schema** page
2. Click **"Import JSON/XML"** button
3. Select your JSON file
4. The system will:
   - Detect if it's data or schema
   - Convert data to schema automatically
   - Display on Visual Canvas

---

## 📋 Example: Your User Data

Your JSON array:
```json
[{
  "user_id": "70000000-0000-0000-0000-000000000001",
  "username": "alice.chen",
  "email": "alice.chen@democorp.com",
  ...
}]
```

**Will be converted to:**

### Table: Users
- **user_id** (UUID, Primary Key)
- **tenant_id** (UUID)
- **username** (VARCHAR)
- **email** (VARCHAR)
- **email_verified** (BOOLEAN)
- **email_verified_at** (TIMESTAMP)
- **password_hash** (VARCHAR, nullable)
- **first_name** (VARCHAR)
- **last_name** (VARCHAR)
- ... and all other fields

---

## 🔍 How It Works

### 1. **Data Analysis**
- Scans all objects in array
- Collects all unique field names
- Analyzes sample values

### 2. **Type Inference**
- **UUID**: Detects UUID format strings
- **INTEGER**: Whole numbers
- **DECIMAL**: Decimal numbers
- **BOOLEAN**: true/false values
- **TIMESTAMP**: Date/time strings
- **VARCHAR**: Text strings
- **JSON**: Objects/arrays

### 3. **Property Detection**
- **Primary Key**: Fields ending with `_id` or `id`, or unique UUIDs
- **Nullable**: Fields that have null values
- **Unique**: Fields where all values are different

### 4. **Schema Generation**
- Creates table with inferred name
- Adds all columns with proper types
- Sets primary keys
- Positions table on canvas

---

## 📝 Supported Formats

### JSON Formats:
1. **Data Array** (your case):
   ```json
   [{...}, {...}]
   ```

2. **Single Object**:
   ```json
   {...}
   ```

3. **Schema File**:
   ```json
   {
     "name": "My Schema",
     "tables": [...],
     "relationships": [...]
   }
   ```

### XML Format:
```xml
<users>
  <user>
    <user_id>...</user_id>
    <username>...</username>
  </user>
</users>
```

---

## 🎯 Features

### Auto-Detection
- Automatically detects JSON vs XML
- Detects data vs schema format
- Handles both formats seamlessly

### Smart Type Inference
- Analyzes actual values, not just structure
- Detects UUIDs, dates, emails, etc.
- Sets appropriate data types

### Primary Key Detection
- Auto-detects `id` or `*_id` fields
- Detects unique UUID fields
- Marks as primary key

### Visual Display
- Automatically switches to Visual Canvas
- Tables positioned automatically
- Ready to edit and customize

---

## 💡 Tips

1. **Better Table Names**: If your JSON has an `id` field like `user_id`, the table will be named "Users"

2. **Multiple Tables**: If you have related data in separate arrays, import them separately or combine into one schema

3. **Customization**: After import, you can:
   - Rename tables
   - Adjust column types
   - Add relationships
   - Export as SQL

---

## 🐛 Troubleshooting

### "Invalid file format"
- Ensure JSON is valid
- Check file extension (.json, .xml, .js)

### "Empty array"
- JSON array must have at least one object

### "Failed to parse"
- Check JSON syntax
- Ensure proper encoding (UTF-8)

---

## ✅ What's Fixed

1. ✅ **Menu backgrounds** - All consistent now
2. ✅ **Upload page background** - Clean and consistent
3. ✅ **JSON to Schema converter** - Automatically converts data to schema
4. ✅ **XML support** - Can import XML files too
5. ✅ **Smart detection** - Auto-detects format and structure

---

**Try it now with your user data JSON!** 🎉
