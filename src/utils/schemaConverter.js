/**
 * JSON/XML to DB Schema Converter
 * Converts JSON data or XML to database schema metadata, then to visual schema format
 */

/**
 * Infer data type from a value
 */
function inferType(value) {
  if (value === null || value === undefined) {
    return 'VARCHAR';
  }
  
  if (typeof value === 'boolean') {
    return 'BOOLEAN';
  }
  
  if (typeof value === 'number') {
    if (Number.isInteger(value)) {
      return 'INTEGER';
    }
    return 'DECIMAL';
  }
  
  if (typeof value === 'string') {
    // Check if it's a date
    if (/^\d{4}-\d{2}-\d{2}/.test(value) || /^\d{4}-\d{2}-\d{2}T/.test(value)) {
      return 'TIMESTAMP';
    }
    // Check if it's a UUID
    if (/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(value)) {
      return 'UUID';
    }
    // Check if it's an email
    if (/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)) {
      return 'VARCHAR';
    }
    return 'VARCHAR';
  }
  
  if (Array.isArray(value)) {
    return 'JSON';
  }
  
  if (typeof value === 'object') {
    return 'JSON';
  }
  
  return 'VARCHAR';
}

/**
 * Analyze a JSON array and extract schema metadata
 */
export function jsonToMetadata(jsonData) {
  if (!Array.isArray(jsonData) || jsonData.length === 0) {
    throw new Error('JSON data must be a non-empty array');
  }

  // Get all unique keys from all objects
  const allKeys = new Set();
  jsonData.forEach(item => {
    if (typeof item === 'object' && item !== null) {
      Object.keys(item).forEach(key => allKeys.add(key));
    }
  });

  // Analyze each field
  const columns = Array.from(allKeys).map(key => {
    const values = jsonData
      .map(item => item[key])
      .filter(v => v !== null && v !== undefined);
    
    // Determine type from sample values
    let type = 'VARCHAR';
    let nullable = true;
    let primaryKey = false;
    let unique = false;
    
    if (values.length > 0) {
      // Check if all values are same type
      const types = values.map(v => inferType(v));
      type = types[0]; // Use first non-null value's type
      
      // Check if nullable
      const nullCount = jsonData.filter(item => item[key] === null || item[key] === undefined).length;
      nullable = nullCount > 0;
      
      // Check if unique (all values are different)
      const uniqueValues = new Set(values.map(v => String(v)));
      unique = uniqueValues.size === values.length && values.length === jsonData.length;
      
      // Check if looks like primary key (ends with _id, is UUID, or is unique integer)
      if (
        key.toLowerCase().endsWith('_id') ||
        key.toLowerCase() === 'id' ||
        (unique && type === 'UUID') ||
        (unique && type === 'INTEGER' && key.toLowerCase().includes('id'))
      ) {
        primaryKey = true;
      }
    }

    return {
      name: key,
      type: type,
      nullable: nullable,
      primaryKey: primaryKey,
      unique: unique,
      sampleValues: values.slice(0, 3) // First 3 sample values
    };
  });

  // Determine table name from data structure
  let tableName = 'ImportedTable';
  if (jsonData.length > 0) {
    const firstItem = jsonData[0];
    // Try to infer table name from keys
    const idKey = Object.keys(firstItem).find(k => 
      k.toLowerCase().endsWith('_id') || k.toLowerCase() === 'id'
    );
    if (idKey) {
      tableName = idKey.replace(/_id$/i, '').replace(/^id$/i, 'table');
      // Capitalize and pluralize
      tableName = tableName.charAt(0).toUpperCase() + tableName.slice(1) + 's';
    }
  }

  return {
    tableName: tableName,
    columns: columns,
    rowCount: jsonData.length
  };
}

/**
 * Convert metadata to visual schema format
 */
export function metadataToSchema(metadata, tableName = null) {
  const name = tableName || metadata.tableName || 'ImportedTable';
  
  // Generate table with columns
  const table = {
    id: `table_${Date.now()}`,
    name: name,
    x: 100,
    y: 100,
    columns: metadata.columns.map((col, index) => ({
      id: `col_${Date.now()}_${index}`,
      name: col.name,
      type: col.type.toUpperCase(),
      primaryKey: col.primaryKey || false,
      nullable: col.nullable !== false, // Default to true
      autoIncrement: col.primaryKey && col.type === 'INTEGER',
      defaultValue: null,
      foreignKey: null
    }))
  };

  return {
    name: `${name} Schema`,
    tables: [table],
    relationships: []
  };
}

/**
 * Convert JSON data directly to schema format
 */
export function jsonToSchema(jsonData, tableName = null) {
  try {
    // Parse if string
    let data = jsonData;
    if (typeof jsonData === 'string') {
      data = JSON.parse(jsonData);
    }

    // Handle array of objects
    if (Array.isArray(data)) {
      if (data.length === 0) {
        throw new Error('JSON array is empty');
      }
      
      const metadata = jsonToMetadata(data);
      return metadataToSchema(metadata, tableName);
    }
    
    // Handle single object - convert to array
    if (typeof data === 'object' && data !== null) {
      const metadata = jsonToMetadata([data]);
      return metadataToSchema(metadata, tableName);
    }

    throw new Error('Invalid JSON format. Expected array of objects or single object.');
  } catch (error) {
    throw new Error(`Failed to convert JSON to schema: ${error.message}`);
  }
}

/**
 * Convert XML to schema (basic implementation)
 */
export function xmlToSchema(xmlString) {
  try {
    // Parse XML (basic implementation - you might want to use a library)
    const parser = new DOMParser();
    const xmlDoc = parser.parseFromString(xmlString, 'text/xml');
    
    // Find root element
    const root = xmlDoc.documentElement;
    if (!root) {
      throw new Error('Invalid XML: No root element');
    }

    // Get all child elements (assuming they represent rows)
    const rows = Array.from(root.children);
    if (rows.length === 0) {
      throw new Error('XML has no data rows');
    }

    // Extract columns from first row
    const firstRow = rows[0];
    const columns = Array.from(firstRow.children).map((child, index) => {
      const colName = child.tagName;
      const value = child.textContent;
      
      return {
        name: colName,
        type: inferType(value),
        nullable: true,
        primaryKey: colName.toLowerCase().endsWith('_id') || colName.toLowerCase() === 'id',
        unique: false
      };
    });

    const metadata = {
      tableName: root.tagName || 'ImportedTable',
      columns: columns,
      rowCount: rows.length
    };

    return metadataToSchema(metadata);
  } catch (error) {
    throw new Error(`Failed to convert XML to schema: ${error.message}`);
  }
}

/**
 * Auto-detect format and convert
 */
export function autoConvertToSchema(data, filename = '') {
  // Try JSON first
  if (filename.endsWith('.json') || filename.endsWith('.js')) {
    return jsonToSchema(data);
  }
  
  // Try XML
  if (filename.endsWith('.xml')) {
    if (typeof data === 'string') {
      return xmlToSchema(data);
    }
    throw new Error('XML data must be a string');
  }
  
  // Auto-detect JSON
  try {
    if (typeof data === 'string') {
      const parsed = JSON.parse(data);
      return jsonToSchema(parsed);
    }
    return jsonToSchema(data);
  } catch (e) {
    // Not JSON, try XML
    if (typeof data === 'string') {
      return xmlToSchema(data);
    }
    throw new Error('Unable to detect format. Please use .json or .xml file.');
  }
}
