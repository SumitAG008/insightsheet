// Data Templates Library - Pre-built templates for common use cases

export const templates = {
  sales: {
    name: 'Sales Dashboard',
    description: 'Track sales performance with revenue, products, and customer data',
    category: 'Business',
    headers: ['Date', 'Product', 'Customer', 'Quantity', 'Unit Price', 'Total Revenue', 'Region', 'Sales Rep'],
    sampleRows: [
      { Date: '2024-01-15', Product: 'Widget A', Customer: 'Acme Corp', Quantity: 50, 'Unit Price': 25.99, 'Total Revenue': 1299.50, Region: 'North', 'Sales Rep': 'John Smith' },
      { Date: '2024-01-16', Product: 'Widget B', Customer: 'Tech Inc', Quantity: 30, 'Unit Price': 45.00, 'Total Revenue': 1350.00, Region: 'South', 'Sales Rep': 'Jane Doe' },
      { Date: '2024-01-17', Product: 'Widget A', Customer: 'Global Ltd', Quantity: 100, 'Unit Price': 25.99, 'Total Revenue': 2599.00, Region: 'East', 'Sales Rep': 'Bob Johnson' },
      { Date: '2024-01-18', Product: 'Widget C', Customer: 'Startup Co', Quantity: 20, 'Unit Price': 75.50, 'Total Revenue': 1510.00, Region: 'West', 'Sales Rep': 'Alice Brown' },
      { Date: '2024-01-19', Product: 'Widget B', Customer: 'Acme Corp', Quantity: 40, 'Unit Price': 45.00, 'Total Revenue': 1800.00, Region: 'North', 'Sales Rep': 'John Smith' },
    ]
  },
  
  finance: {
    name: 'Financial Tracker',
    description: 'Manage income, expenses, and budget tracking',
    category: 'Finance',
    headers: ['Date', 'Category', 'Description', 'Type', 'Amount', 'Account', 'Status'],
    sampleRows: [
      { Date: '2024-01-01', Category: 'Income', Description: 'Salary', Type: 'Income', Amount: 5000.00, Account: 'Checking', Status: 'Cleared' },
      { Date: '2024-01-02', Category: 'Housing', Description: 'Rent', Type: 'Expense', Amount: -1200.00, Account: 'Checking', Status: 'Cleared' },
      { Date: '2024-01-03', Category: 'Food', Description: 'Groceries', Type: 'Expense', Amount: -150.00, Account: 'Credit Card', Status: 'Pending' },
      { Date: '2024-01-05', Category: 'Transportation', Description: 'Gas', Type: 'Expense', Amount: -60.00, Account: 'Credit Card', Status: 'Cleared' },
      { Date: '2024-01-10', Category: 'Income', Description: 'Freelance Work', Type: 'Income', Amount: 800.00, Account: 'Savings', Status: 'Cleared' },
    ]
  },
  
  inventory: {
    name: 'Inventory Management',
    description: 'Track product inventory levels and stock movements',
    category: 'Business',
    headers: ['Product ID', 'Product Name', 'Category', 'Current Stock', 'Min Stock', 'Max Stock', 'Unit Price', 'Supplier', 'Last Updated'],
    sampleRows: [
      { 'Product ID': 'P001', 'Product Name': 'Laptop', Category: 'Electronics', 'Current Stock': 45, 'Min Stock': 20, 'Max Stock': 100, 'Unit Price': 899.99, Supplier: 'TechSupply', 'Last Updated': '2024-01-15' },
      { 'Product ID': 'P002', 'Product Name': 'Mouse', Category: 'Electronics', 'Current Stock': 120, 'Min Stock': 50, 'Max Stock': 200, 'Unit Price': 29.99, Supplier: 'TechSupply', 'Last Updated': '2024-01-14' },
      { 'Product ID': 'P003', 'Product Name': 'Keyboard', Category: 'Electronics', 'Current Stock': 35, 'Min Stock': 30, 'Max Stock': 150, 'Unit Price': 79.99, Supplier: 'KeyCorp', 'Last Updated': '2024-01-16' },
      { 'Product ID': 'P004', 'Product Name': 'Monitor', Category: 'Electronics', 'Current Stock': 25, 'Min Stock': 15, 'Max Stock': 80, 'Unit Price': 249.99, Supplier: 'DisplayPro', 'Last Updated': '2024-01-13' },
    ]
  },
  
  hr: {
    name: 'Employee Database',
    description: 'Manage employee information and records',
    category: 'HR',
    headers: ['Employee ID', 'First Name', 'Last Name', 'Email', 'Department', 'Position', 'Hire Date', 'Salary', 'Status'],
    sampleRows: [
      { 'Employee ID': 'E001', 'First Name': 'John', 'Last Name': 'Smith', Email: 'john.smith@company.com', Department: 'Engineering', Position: 'Software Engineer', 'Hire Date': '2023-01-15', Salary: 95000, Status: 'Active' },
      { 'Employee ID': 'E002', 'First Name': 'Jane', 'Last Name': 'Doe', Email: 'jane.doe@company.com', Department: 'Marketing', Position: 'Marketing Manager', 'Hire Date': '2022-06-20', Salary: 110000, Status: 'Active' },
      { 'Employee ID': 'E003', 'First Name': 'Bob', 'Last Name': 'Johnson', Email: 'bob.johnson@company.com', Department: 'Sales', Position: 'Sales Representative', 'Hire Date': '2023-03-10', Salary: 75000, Status: 'Active' },
      { 'Employee ID': 'E004', 'First Name': 'Alice', 'Last Name': 'Brown', Email: 'alice.brown@company.com', Department: 'HR', Position: 'HR Manager', 'Hire Date': '2021-09-05', Salary: 105000, Status: 'Active' },
    ]
  },
  
  project: {
    name: 'Project Tracker',
    description: 'Track project progress, tasks, and timelines',
    category: 'Project Management',
    headers: ['Task ID', 'Task Name', 'Project', 'Assignee', 'Status', 'Priority', 'Start Date', 'Due Date', 'Progress %'],
    sampleRows: [
      { 'Task ID': 'T001', 'Task Name': 'Design UI Mockups', Project: 'Website Redesign', Assignee: 'John Smith', Status: 'In Progress', Priority: 'High', 'Start Date': '2024-01-10', 'Due Date': '2024-01-25', 'Progress %': 65 },
      { 'Task ID': 'T002', 'Task Name': 'Develop API', Project: 'Website Redesign', Assignee: 'Jane Doe', Status: 'Not Started', Priority: 'High', 'Start Date': '2024-01-20', 'Due Date': '2024-02-10', 'Progress %': 0 },
      { 'Task ID': 'T003', 'Task Name': 'Write Documentation', Project: 'Website Redesign', Assignee: 'Bob Johnson', Status: 'Completed', Priority: 'Medium', 'Start Date': '2024-01-05', 'Due Date': '2024-01-15', 'Progress %': 100 },
      { 'Task ID': 'T004', 'Task Name': 'Testing', Project: 'Website Redesign', Assignee: 'Alice Brown', Status: 'In Progress', Priority: 'High', 'Start Date': '2024-01-18', 'Due Date': '2024-02-05', 'Progress %': 30 },
    ]
  },
  
  customer: {
    name: 'Customer Database',
    description: 'Manage customer information and contact details',
    category: 'CRM',
    headers: ['Customer ID', 'Company Name', 'Contact Person', 'Email', 'Phone', 'Industry', 'Country', 'Status', 'Last Contact'],
    sampleRows: [
      { 'Customer ID': 'C001', 'Company Name': 'Acme Corp', 'Contact Person': 'John Manager', Email: 'john@acme.com', Phone: '+1-555-0101', Industry: 'Technology', Country: 'USA', Status: 'Active', 'Last Contact': '2024-01-15' },
      { 'Customer ID': 'C002', 'Company Name': 'Tech Inc', 'Contact Person': 'Jane Director', Email: 'jane@techinc.com', Phone: '+1-555-0102', Industry: 'Software', Country: 'USA', Status: 'Active', 'Last Contact': '2024-01-12' },
      { 'Customer ID': 'C003', 'Company Name': 'Global Ltd', 'Contact Person': 'Bob CEO', Email: 'bob@globalltd.com', Phone: '+44-20-1234-5678', Industry: 'Consulting', Country: 'UK', Status: 'Prospect', 'Last Contact': '2024-01-10' },
      { 'Customer ID': 'C004', 'Company Name': 'Startup Co', 'Contact Person': 'Alice Founder', Email: 'alice@startup.com', Phone: '+1-555-0104', Industry: 'E-commerce', Country: 'USA', Status: 'Active', 'Last Contact': '2024-01-18' },
    ]
  },
  
  expense: {
    name: 'Expense Tracker',
    description: 'Track and categorize business expenses',
    category: 'Finance',
    headers: ['Date', 'Category', 'Vendor', 'Description', 'Amount', 'Payment Method', 'Receipt', 'Status'],
    sampleRows: [
      { Date: '2024-01-05', Category: 'Travel', Vendor: 'Airline Co', Description: 'Flight to Conference', Amount: 450.00, 'Payment Method': 'Corporate Card', Receipt: 'Yes', Status: 'Reimbursed' },
      { Date: '2024-01-08', Category: 'Meals', Vendor: 'Restaurant', Description: 'Client Dinner', Amount: 125.50, 'Payment Method': 'Corporate Card', Receipt: 'Yes', Status: 'Pending' },
      { Date: '2024-01-10', Category: 'Office Supplies', Vendor: 'Office Depot', Description: 'Printer Paper', Amount: 35.99, 'Payment Method': 'Corporate Card', Receipt: 'Yes', Status: 'Approved' },
      { Date: '2024-01-12', Category: 'Software', Vendor: 'Software Co', Description: 'Monthly Subscription', Amount: 99.00, 'Payment Method': 'Auto-pay', Receipt: 'Yes', Status: 'Approved' },
    ]
  },
  
  budget: {
    name: 'Budget Planner',
    description: 'Plan and track monthly/annual budgets',
    category: 'Finance',
    headers: ['Category', 'Budgeted Amount', 'Spent Amount', 'Remaining', 'Percentage Used', 'Status'],
    sampleRows: [
      { Category: 'Housing', 'Budgeted Amount': 1200.00, 'Spent Amount': 1200.00, Remaining: 0.00, 'Percentage Used': 100, Status: 'At Limit' },
      { Category: 'Food', 'Budgeted Amount': 600.00, 'Spent Amount': 450.00, Remaining: 150.00, 'Percentage Used': 75, Status: 'On Track' },
      { Category: 'Transportation', 'Budgeted Amount': 300.00, 'Spent Amount': 280.00, Remaining: 20.00, 'Percentage Used': 93, Status: 'On Track' },
      { Category: 'Entertainment', 'Budgeted Amount': 200.00, 'Spent Amount': 150.00, Remaining: 50.00, 'Percentage Used': 75, Status: 'On Track' },
      { Category: 'Savings', 'Budgeted Amount': 1000.00, 'Spent Amount': 1000.00, Remaining: 0.00, 'Percentage Used': 100, Status: 'At Limit' },
    ]
  }
};

export const getTemplateCategories = () => {
  const categories = [...new Set(Object.values(templates).map(t => t.category))];
  return categories;
};

export const getTemplatesByCategory = (category) => {
  return Object.entries(templates)
    .filter(([_, template]) => template.category === category)
    .map(([key, template]) => ({ key, ...template }));
};

export const loadTemplate = (templateKey) => {
  const template = templates[templateKey];
  if (!template) return null;
  
  return {
    headers: template.headers,
    rows: template.sampleRows.map(row => {
      const newRow = {};
      template.headers.forEach(header => {
        newRow[header] = row[header] ?? '';
      });
      return newRow;
    })
  };
};
