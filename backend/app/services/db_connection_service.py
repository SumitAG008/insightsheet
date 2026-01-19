"""
Database Connection Service
Handles connections to various database types with zero storage policy
"""
import logging
from typing import Dict, Any, Optional, List
import uuid
from datetime import datetime, timedelta

logger = logging.getLogger(__name__)

# In-memory connection pool (cleared on server restart - zero persistence)
_connection_pool: Dict[str, Dict[str, Any]] = {}


class DatabaseConnectionService:
    """Service for managing database connections"""
    
    @staticmethod
    def test_connection(db_type: str, connection_data: Dict[str, Any]) -> Dict[str, Any]:
        """
        Test database connection
        Returns connection_id if successful
        """
        try:
            connection_id = f"conn_{uuid.uuid4().hex[:12]}"
            
            if db_type == "postgresql":
                import psycopg2
                from psycopg2.extras import RealDictCursor
                
                conn = psycopg2.connect(
                    host=connection_data.get("host"),
                    port=int(connection_data.get("port", 5432)),
                    database=connection_data.get("database"),
                    user=connection_data.get("username"),
                    password=connection_data.get("password"),
                    sslmode=connection_data.get("sslMode", "prefer")
                )
                cursor = conn.cursor(cursor_factory=RealDictCursor)
                cursor.execute("SELECT 1")
                cursor.close()
                
            elif db_type == "mysql":
                import pymysql
                
                conn = pymysql.connect(
                    host=connection_data.get("host"),
                    port=int(connection_data.get("port", 3306)),
                    database=connection_data.get("database"),
                    user=connection_data.get("username"),
                    password=connection_data.get("password"),
                    ssl={'ca': connection_data.get("sslCa")} if connection_data.get("sslCa") else None
                )
                cursor = conn.cursor()
                cursor.execute("SELECT 1")
                cursor.close()
                
            elif db_type == "mongodb":
                from pymongo import MongoClient
                
                connection_string = connection_data.get("connectionString")
                if not connection_string:
                    raise ValueError("MongoDB requires connection string")
                
                client = MongoClient(connection_string, serverSelectionTimeoutMS=5000)
                # Test connection
                client.admin.command('ping')
                conn = client
                
            elif db_type == "mssql":
                import pyodbc
                
                server = connection_data.get("server")
                port = connection_data.get("port", 1433)
                database = connection_data.get("database")
                username = connection_data.get("username")
                password = connection_data.get("password")
                encrypt = connection_data.get("encrypt", "true")
                trust_cert = connection_data.get("trustServerCertificate", "false")
                
                conn_str = (
                    f"DRIVER={{ODBC Driver 17 for SQL Server}};"
                    f"SERVER={server},{port};"
                    f"DATABASE={database};"
                    f"UID={username};"
                    f"PWD={password};"
                    f"Encrypt={encrypt};"
                    f"TrustServerCertificate={trust_cert};"
                )
                conn = pyodbc.connect(conn_str, timeout=5)
                cursor = conn.cursor()
                cursor.execute("SELECT 1")
                cursor.close()
                
            elif db_type == "oracle":
                import cx_Oracle
                
                dsn = cx_Oracle.makedsn(
                    connection_data.get("host"),
                    int(connection_data.get("port", 1521)),
                    service_name=connection_data.get("serviceName")
                )
                conn = cx_Oracle.connect(
                    user=connection_data.get("username"),
                    password=connection_data.get("password"),
                    dsn=dsn
                )
                cursor = conn.cursor()
                cursor.execute("SELECT 1 FROM DUAL")
                cursor.close()
                
            elif db_type == "sqlite":
                import sqlite3
                
                file_path = connection_data.get("filePath")
                read_only = connection_data.get("readOnly", "false") == "true"
                
                if read_only:
                    conn = sqlite3.connect(f"file:{file_path}?mode=ro", uri=True)
                else:
                    conn = sqlite3.connect(file_path)
                conn.row_factory = sqlite3.Row
                cursor = conn.cursor()
                cursor.execute("SELECT 1")
                cursor.close()
            else:
                raise ValueError(f"Unsupported database type: {db_type}")
            
            # Store connection in pool (in-memory only, cleared on restart)
            _connection_pool[connection_id] = {
                "connection": conn,
                "db_type": db_type,
                "connection_data": connection_data,  # Store for MongoDB database name
                "created_at": datetime.utcnow(),
                "last_used": datetime.utcnow()
            }
            
            return {
                "success": True,
                "connectionId": connection_id,
                "message": "Connection successful"
            }
            
        except Exception as e:
            logger.error(f"Database connection test failed: {str(e)}")
            return {
                "success": False,
                "error": str(e)
            }
    
    @staticmethod
    def get_schema(connection_id: str, db_type: str) -> Dict[str, Any]:
        """Get database schema (tables and columns)"""
        try:
            if connection_id not in _connection_pool:
                raise ValueError("Connection not found")
            
            conn_info = _connection_pool[connection_id]
            conn = conn_info["connection"]
            conn_info["last_used"] = datetime.utcnow()
            
            tables = []
            relationships = []
            
            if db_type == "postgresql":
                cursor = conn.cursor()
                cursor.execute("""
                    SELECT table_name 
                    FROM information_schema.tables 
                    WHERE table_schema = 'public' 
                    ORDER BY table_name
                """)
                table_names = [row[0] for row in cursor.fetchall()]
                
                for table_name in table_names:
                    cursor.execute("""
                        SELECT 
                            column_name,
                            data_type,
                            is_nullable,
                            column_default
                        FROM information_schema.columns
                        WHERE table_name = %s
                        ORDER BY ordinal_position
                    """, (table_name,))
                    
                    columns = []
                    for col in cursor.fetchall():
                        columns.append({
                            "name": col[0],
                            "type": col[1],
                            "nullable": col[2] == "YES",
                            "default": col[3]
                        })
                    
                    # Check for primary keys
                    cursor.execute("""
                        SELECT column_name
                        FROM information_schema.table_constraints tc
                        JOIN information_schema.key_column_usage kcu
                        ON tc.constraint_name = kcu.constraint_name
                        WHERE tc.table_name = %s AND tc.constraint_type = 'PRIMARY KEY'
                    """, (table_name,))
                    pk_columns = [row[0] for row in cursor.fetchall()]
                    
                    for col in columns:
                        col["primaryKey"] = col["name"] in pk_columns
                    
                    # Get row count
                    cursor.execute(f'SELECT COUNT(*) FROM "{table_name}"')
                    row_count = cursor.fetchone()[0]
                    
                    tables.append({
                        "name": table_name,
                        "columns": columns,
                        "rowCount": row_count
                    })
                
                # Foreign keys for relationships (Data Model Creator / Import from DB Connect)
                cursor.execute("""
                    SELECT
                        kcu.table_name AS from_table,
                        kcu.column_name AS from_column,
                        ccu.table_name AS to_table,
                        ccu.column_name AS to_column
                    FROM information_schema.table_constraints tc
                    JOIN information_schema.key_column_usage kcu
                        ON tc.constraint_name = kcu.constraint_name AND tc.table_schema = kcu.table_schema
                    JOIN information_schema.constraint_column_usage ccu
                        ON tc.constraint_name = ccu.constraint_name AND tc.table_schema = ccu.table_schema
                    WHERE tc.constraint_type = 'FOREIGN KEY' AND tc.table_schema = 'public'
                """)
                relationships = [
                    {"fromTable": r[0], "fromColumn": r[1], "toTable": r[2], "toColumn": r[3]}
                    for r in cursor.fetchall()
                ]
                cursor.close()
                
            elif db_type == "mysql":
                cursor = conn.cursor()
                cursor.execute("SHOW TABLES")
                table_names = [row[0] for row in cursor.fetchall()]
                
                for table_name in table_names:
                    cursor.execute(f"DESCRIBE `{table_name}`")
                    columns = []
                    for col in cursor.fetchall():
                        columns.append({
                            "name": col[0],
                            "type": col[1],
                            "nullable": col[2] == "YES",
                            "default": col[4],
                            "primaryKey": col[3] == "PRI"
                        })
                    
                    cursor.execute(f"SELECT COUNT(*) FROM `{table_name}`")
                    row_count = cursor.fetchone()[0]
                    
                    tables.append({
                        "name": table_name,
                        "columns": columns,
                        "rowCount": row_count
                    })
                cursor.close()
                
            elif db_type == "mongodb":
                # MongoDB connection stores database name in connection_data
                database_name = conn_info.get("connection_data", {}).get("database")
                if not database_name:
                    raise ValueError("Database name not found in connection data")
                
                db = conn[database_name]
                collections = db.list_collection_names()
                
                for collection_name in collections:
                    collection = db[collection_name]
                    sample = collection.find_one()
                    columns = []
                    if sample:
                        for key, value in sample.items():
                            columns.append({
                                "name": key,
                                "type": type(value).__name__,
                                "nullable": True,
                                "primaryKey": key == "_id"
                            })
                    
                    count = collection.count_documents({})
                    tables.append({
                        "name": collection_name,
                        "columns": columns,
                        "rowCount": count
                    })
                    
            elif db_type == "mssql":
                cursor = conn.cursor()
                cursor.execute("""
                    SELECT TABLE_NAME 
                    FROM INFORMATION_SCHEMA.TABLES 
                    WHERE TABLE_TYPE = 'BASE TABLE'
                    ORDER BY TABLE_NAME
                """)
                table_names = [row[0] for row in cursor.fetchall()]
                
                for table_name in table_names:
                    cursor.execute(f"""
                        SELECT 
                            COLUMN_NAME,
                            DATA_TYPE,
                            IS_NULLABLE,
                            COLUMN_DEFAULT
                        FROM INFORMATION_SCHEMA.COLUMNS
                        WHERE TABLE_NAME = '{table_name}'
                        ORDER BY ORDINAL_POSITION
                    """)
                    
                    columns = []
                    for col in cursor.fetchall():
                        columns.append({
                            "name": col[0],
                            "type": col[1],
                            "nullable": col[2] == "YES",
                            "default": col[3]
                        })
                    
                    # Get primary keys
                    cursor.execute(f"""
                        SELECT COLUMN_NAME
                        FROM INFORMATION_SCHEMA.KEY_COLUMN_USAGE
                        WHERE TABLE_NAME = '{table_name}' AND CONSTRAINT_NAME LIKE 'PK_%'
                    """)
                    pk_columns = [row[0] for row in cursor.fetchall()]
                    
                    for col in columns:
                        col["primaryKey"] = col["name"] in pk_columns
                    
                    cursor.execute(f"SELECT COUNT(*) FROM [{table_name}]")
                    row_count = cursor.fetchone()[0]
                    
                    tables.append({
                        "name": table_name,
                        "columns": columns,
                        "rowCount": row_count
                    })
                cursor.close()
                
            elif db_type == "sqlite":
                cursor = conn.cursor()
                cursor.execute("SELECT name FROM sqlite_master WHERE type='table'")
                table_names = [row[0] for row in cursor.fetchall()]
                
                for table_name in table_names:
                    cursor.execute(f"PRAGMA table_info(`{table_name}`)")
                    columns = []
                    for col in cursor.fetchall():
                        columns.append({
                            "name": col[1],
                            "type": col[2],
                            "nullable": not col[3],
                            "default": col[4],
                            "primaryKey": col[5] == 1
                        })
                    
                    cursor.execute(f"SELECT COUNT(*) FROM `{table_name}`")
                    row_count = cursor.fetchone()[0]
                    
                    tables.append({
                        "name": table_name,
                        "columns": columns,
                        "rowCount": row_count
                    })
                cursor.close()
            
            return {
                "success": True,
                "tables": tables,
                "relationships": relationships,
                "schema": {"tables": tables}
            }
            
        except Exception as e:
            logger.error(f"Get schema error: {str(e)}")
            return {
                "success": False,
                "error": str(e)
            }
    
    @staticmethod
    def execute_query(connection_id: str, db_type: str, query: str) -> Dict[str, Any]:
        """Execute SQL query and return results"""
        try:
            if connection_id not in _connection_pool:
                raise ValueError("Connection not found")
            
            conn_info = _connection_pool[connection_id]
            conn = conn_info["connection"]
            conn_info["last_used"] = datetime.utcnow()
            
            # Security: Only allow SELECT queries (read-only)
            query_upper = query.strip().upper()
            if not query_upper.startswith("SELECT"):
                raise ValueError("Only SELECT queries are allowed for security")
            
            if db_type in ["postgresql", "mysql", "mssql", "sqlite"]:
                if db_type == "postgresql":
                    from psycopg2.extras import RealDictCursor
                    cursor = conn.cursor(cursor_factory=RealDictCursor)
                elif db_type == "mysql":
                    cursor = conn.cursor()
                elif db_type == "mssql":
                    cursor = conn.cursor()
                elif db_type == "sqlite":
                    import sqlite3
                    cursor = conn.cursor()
                    conn.row_factory = sqlite3.Row
                
                cursor.execute(query)
                
                if db_type == "postgresql":
                    rows = cursor.fetchall()
                    data = [dict(row) for row in rows]
                    columns = list(data[0].keys()) if data else []
                elif db_type == "mysql":
                    columns = [desc[0] for desc in cursor.description] if cursor.description else []
                    rows = cursor.fetchall()
                    data = [dict(zip(columns, row)) for row in rows]
                elif db_type == "mssql":
                    columns = [desc[0] for desc in cursor.description] if cursor.description else []
                    rows = cursor.fetchall()
                    data = [dict(zip(columns, row)) for row in rows]
                elif db_type == "sqlite":
                    rows = cursor.fetchall()
                    data = [dict(row) for row in rows]
                    columns = list(data[0].keys()) if data else []
                
                cursor.close()
                
                return {
                    "success": True,
                    "columns": columns,
                    "data": data,
                    "rowCount": len(data)
                }
            else:
                raise ValueError(f"Query execution not yet supported for {db_type}")
                
        except Exception as e:
            logger.error(f"Query execution error: {str(e)}")
            return {
                "success": False,
                "error": str(e)
            }
    
    @staticmethod
    def disconnect(connection_id: str, db_type: str) -> Dict[str, Any]:
        """Close and remove database connection"""
        try:
            if connection_id in _connection_pool:
                conn_info = _connection_pool[connection_id]
                conn = conn_info["connection"]
                
                # Close connection based on type
                if db_type == "mongodb":
                    conn.close()
                else:
                    conn.close()
                
                del _connection_pool[connection_id]
            
            return {"success": True, "message": "Disconnected"}
        except Exception as e:
            logger.error(f"Disconnect error: {str(e)}")
            return {"success": False, "error": str(e)}
