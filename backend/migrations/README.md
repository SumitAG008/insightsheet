# Database Migrations

This directory contains SQL migrations for the InsightSheet database.

## Current Migrations

### 001_add_payment_status.sql
**Purpose**: Adds `payment_status` column to `subscriptions` table

**Why this is needed**:
- The Subscription model in `app/database.py` was updated to include `payment_status` field
- Existing databases don't have this column
- Without it, you'll get: `column subscriptions.payment_status does not exist`

**What it does**:
1. Checks if `payment_status` column exists
2. If not, adds the column with default value `'unpaid'`
3. Updates existing records with `transaction_id` to `'paid'` status
4. Verifies the column was added

**How to run**:

```bash
# Option 1: Use Python script (recommended)
cd backend
python run_migration.py

# Option 2: Run SQL directly with psql
cd backend
psql -U postgres -d insightsheet -f migrations/001_add_payment_status.sql

# Option 3: Run SQL directly with pgAdmin
# Open pgAdmin, connect to your database, and execute the SQL from the file
```

## Common Issues

### "column subscriptions.payment_status does not exist"

**Error**:
```
psycopg2.errors.UndefinedColumn: column subscriptions.payment_status does not exist
```

**Solution**: Run the migration script:
```bash
cd backend
python run_migration.py
```

### Connection Issues

If you get connection errors, check your `.env` file:

```env
DATABASE_URL=postgresql://username:password@localhost:5432/insightsheet
```

Replace `username`, `password`, and `insightsheet` with your actual values.

### Permission Issues

If you get permission errors, make sure your database user has the necessary privileges:

```sql
GRANT ALL PRIVILEGES ON DATABASE insightsheet TO your_user;
GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA public TO your_user;
```

## After Running Migrations

1. **Restart your backend server**:
   ```bash
   cd backend
   python -m uvicorn app.main:app --reload --host 0.0.0.0 --port 8001
   ```

2. **Verify it works**:
   - Visit: http://localhost:8001/docs
   - Try the `/api/subscriptions/me` endpoint
   - Should return 200 OK (not 500 error)

## Future Migrations

When adding new migrations:

1. Create a new SQL file: `00X_description.sql`
2. Follow the same pattern with `DO $$ BEGIN ... END $$;`
3. Add documentation here
4. Test on a development database first
