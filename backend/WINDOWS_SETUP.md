# 🪟 Windows Setup Guide for InsightSheet

This guide will help you set up InsightSheet on Windows, specifically addressing PostgreSQL connection issues.

## Table of Contents

1. [Prerequisites](#prerequisites)
2. [PostgreSQL Installation](#postgresql-installation)
3. [Troubleshooting Connection Issues](#troubleshooting-connection-issues)
4. [Database Setup](#database-setup)
5. [Common Issues and Solutions](#common-issues-and-solutions)

---

## Prerequisites

- Python 3.8 or higher
- PostgreSQL 12 or higher (or use SQLite for simpler setup)
- Git (optional, for cloning the repository)

---

## PostgreSQL Installation

### Option 1: Install PostgreSQL (Recommended)

1. **Download PostgreSQL**
   - Visit: https://www.postgresql.org/download/windows/
   - Download the latest installer (e.g., PostgreSQL 15 or 16)

2. **Run the Installer**
   - Double-click the downloaded .exe file
   - Follow the installation wizard
   - **IMPORTANT**: Remember the password you set for the `postgres` user!
   - Default port: 5432 (keep this unless you have conflicts)
   - Install Stack Builder components if asked (optional)

3. **Verify Installation**
   Open Command Prompt and run:
   ```cmd
   psql --version
   ```
   You should see: `psql (PostgreSQL) 15.x` or similar

4. **Check if PostgreSQL Service is Running**
   - Press `Win + R`, type `services.msc`, press Enter
   - Look for `postgresql-x64-XX` (where XX is your version number)
   - Status should be "Running"
   - If not, right-click and select "Start"

### Option 2: Use SQLite (Easier Alternative)

If you want to avoid PostgreSQL setup complexity, you can use SQLite:

1. Open `backend/.env` file (or create it from `.env.example`)
2. Change the DATABASE_URL to:
   ```
   DATABASE_URL=sqlite:///./insightsheet.db
   ```
3. Skip to [Database Setup](#database-setup)

---

## Troubleshooting Connection Issues

### Issue: "password authentication failed for user postgres"

This is the most common issue on Windows. Here are the solutions:

#### Solution 1: Use the Correct Password

The password is the one YOU set during PostgreSQL installation. Try:

1. Run the interactive setup script:
   ```cmd
   cd backend
   python setup_database.py
   ```

2. When prompted, enter:
   - Username: `postgres`
   - Password: (the password you set during installation)
   - Host: `localhost`
   - Port: `5432`
   - Database: `insightsheet`

The script will:
- Test the connection
- Create the database if needed
- Set up the `.env` file automatically

#### Solution 2: Reset PostgreSQL Password

If you forgot your PostgreSQL password:

1. **Locate pg_hba.conf file**
   - Usually at: `C:\Program Files\PostgreSQL\15\data\pg_hba.conf`
   - (Replace `15` with your PostgreSQL version)

2. **Edit pg_hba.conf as Administrator**
   - Right-click on Notepad → Run as Administrator
   - Open `pg_hba.conf`

3. **Change authentication method to 'trust'**
   Find these lines:
   ```
   # IPv4 local connections:
   host    all             all             127.0.0.1/32            md5
   # IPv6 local connections:
   host    all             all             ::1/128                 md5
   ```

   Change `md5` to `trust`:
   ```
   # IPv4 local connections:
   host    all             all             127.0.0.1/32            trust
   # IPv6 local connections:
   host    all             all             ::1/128                 trust
   ```

4. **Restart PostgreSQL Service**
   - Open Services (`Win + R` → `services.msc`)
   - Find `postgresql-x64-XX`
   - Right-click → Restart

5. **Connect and Change Password**
   Open Command Prompt:
   ```cmd
   psql -U postgres
   ```

   In the PostgreSQL prompt:
   ```sql
   ALTER USER postgres PASSWORD 'your_new_password';
   \q
   ```

6. **Revert authentication method back to 'md5'**
   - Open `pg_hba.conf` again
   - Change `trust` back to `md5`
   - Save the file

7. **Restart PostgreSQL Service again**

8. **Test connection**
   ```cmd
   psql -U postgres -h localhost
   ```
   Enter your new password when prompted

#### Solution 3: Use pgAdmin to Reset Password

If you have pgAdmin installed:

1. Open pgAdmin
2. Right-click on `PostgreSQL 15` → Properties
3. Go to the Definition tab
4. Enter a new password
5. Click Save

---

## Database Setup

Once PostgreSQL is running and you can connect:

### Step 1: Install Python Dependencies

```cmd
cd backend
pip install -r requirements.txt
```

### Step 2: Run Database Setup Script

```cmd
python setup_database.py
```

The script will:
- Guide you through database connection setup
- Create the `.env` file automatically
- Create the database and tables
- Set up an admin user

### Step 3: Start the Backend

```cmd
python main.py
```

Or:

```cmd
uvicorn main:app --reload --port 8000
```

### Step 4: Test the API

Open your browser and visit:
- http://localhost:8000/health
- http://localhost:8000/docs (API documentation)

---

## Common Issues and Solutions

### Issue: "psql: command not found"

PostgreSQL is not in your PATH.

**Solution:**
Add PostgreSQL bin directory to PATH:
1. Press `Win + X` → System → Advanced system settings
2. Click "Environment Variables"
3. Under "System variables", find "Path"
4. Click Edit → New
5. Add: `C:\Program Files\PostgreSQL\15\bin`
6. Click OK and restart Command Prompt

### Issue: "Port 5432 is already in use"

Another service is using the PostgreSQL port.

**Solution 1: Stop the conflicting service**
```cmd
netstat -ano | findstr :5432
taskkill /PID <process_id> /F
```

**Solution 2: Use a different port**
Edit `.env`:
```
DATABASE_URL=postgresql://postgres:password@localhost:5433/insightsheet
```

And configure PostgreSQL to use port 5433.

### Issue: "Database 'insightsheet' does not exist"

The database hasn't been created yet.

**Solution:**
The setup script (`setup_database.py`) will create it automatically.

Or create manually:
```cmd
psql -U postgres
CREATE DATABASE insightsheet;
\q
```

### Issue: Permission denied when editing pg_hba.conf

You need administrator privileges.

**Solution:**
- Right-click Notepad
- Select "Run as Administrator"
- Then open pg_hba.conf

### Issue: Python packages fail to install

Some packages like psycopg2 may need Visual C++ Build Tools.

**Solution:**
Install Visual Studio Build Tools:
- Download from: https://visualstudio.microsoft.com/downloads/
- Scroll to "Tools for Visual Studio"
- Download "Build Tools for Visual Studio"
- Run installer and select "Desktop development with C++"

---

## Quick Start Checklist

- [ ] PostgreSQL installed and running
- [ ] Know the postgres user password
- [ ] Python 3.8+ installed
- [ ] Backend dependencies installed (`pip install -r requirements.txt`)
- [ ] Run `python setup_database.py`
- [ ] `.env` file created with correct DATABASE_URL
- [ ] Database and tables created
- [ ] Backend starts successfully (`python main.py`)
- [ ] Can access http://localhost:8000/health

---

## Alternative: Using Docker

If you want to avoid PostgreSQL installation complexity, use Docker:

```cmd
cd backend
docker-compose up -d
```

This will:
- Start PostgreSQL in a container
- Set up the database automatically
- No need to install PostgreSQL on Windows

Then create `.env`:
```
DATABASE_URL=postgresql://postgres:postgres@localhost:5432/insightsheet
```

---

## Need More Help?

If you're still having issues:

1. Check the backend logs for specific error messages
2. Verify PostgreSQL is running: `pg_isready -h localhost -p 5432`
3. Test connection manually: `psql -U postgres -h localhost -p 5432`
4. Try using SQLite instead (simpler setup)
5. Open an issue on GitHub with:
   - Your Windows version
   - PostgreSQL version (`psql --version`)
   - Python version (`python --version`)
   - Full error message

---

## Contact

For more information, visit the main README.md or check the documentation at https://meldra.ai
