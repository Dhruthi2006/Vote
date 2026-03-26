# Vote Smart - Online Election Voting System

A secure, transparent, and efficient online voting system designed for educational institutions.

## Features

- **Secure Authentication**: JWT-based authentication with bcrypt password hashing
- **Student Voting**: One vote per student with duplicate prevention
- **Admin Dashboard**: Complete election and candidate management
- **Real-time Results**: Live vote counting and analytics
- **Responsive Design**: Works on desktop and mobile devices

## Technology Stack

- **Backend**: Node.js + Express
- **Database**: MySQL
- **Frontend**: HTML, CSS, JavaScript (Vanilla)
- **Authentication**: JWT + bcrypt

## Installation

1. **Clone the repository**
   ```bash
   git clone <your-repo-url>
   cd vote-smart
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Set up MySQL database**
   - Create a new MySQL database named `voting_system`
   - Run the SQL scripts in the `scripts` folder in order:
     ```bash
     mysql -u root -p voting_system < scripts/001_create_database.sql
     mysql -u root -p voting_system < scripts/002_seed_data.sql
     ```

4. **Configure environment variables**
   - Copy `.env.example` to `.env`
   - Update the values with your configuration:
     ```
     DB_HOST=localhost
     DB_USER=root
     DB_PASSWORD=your_password
     DB_NAME=voting_system
     JWT_SECRET=your-secret-key
     PORT=3000
     ```

5. **Fix password hashes (IMPORTANT)**
   ```bash
   npm run fix-passwords
   ```
   This will update the database with proper bcrypt hashes for the default accounts.

6. **Start the server**
   ```bash
   npm start
   ```
   
   For development with auto-restart:
   ```bash
   npm run dev
   ```

7. **Access the application**
   - Open your browser and go to `http://localhost:3000`

## Default Credentials

### Admin Account
- Student ID: `ADMIN001`
- Password: `admin123`

### Student Account
- Student ID: `STU001`
- Password: `student123`

**⚠️ Important**: Change these credentials in production!

## Troubleshooting

### Login Failed Error

If you get "Invalid credentials" when trying to login:

1. **Run the password fix script:**
   ```bash
   npm run fix-passwords
   ```
   This updates the database with proper bcrypt password hashes.

2. **Check database connection:**
   - Verify MySQL is running
   - Check `.env` file has correct database credentials
   - Test connection: `mysql -u root -p`

3. **Verify database was seeded:**
   ```bash
   mysql -u root -p voting_system -e "SELECT student_id, full_name, role FROM users;"
   ```
   You should see ADMIN001 and student accounts.

### Other Common Issues

**"Cannot connect to database"**
- Check MySQL is running
- Verify `.env` credentials match your MySQL setup
- Try: `mysql -u root -p` to test connection

**"Port 3000 already in use"**
- Change PORT in `.env` to 3001 or another number
- Or stop the process using port 3000

**"Module not found"**
- Run `npm install` again
- Delete `node_modules` and run `npm install`

## Project Structure

```
vote-smart/
├── public/              # Frontend files
│   ├── index.html       # Landing page
│   ├── login.html       # Login page
│   ├── register.html    # Registration page
│   ├── vote.html        # Voting interface
│   ├── results.html     # Results page
│   ├── admin.html       # Admin dashboard
│   ├── styles.css       # Global styles
│   └── auth.js          # Auth helper functions
├── scripts/             # Database scripts
│   ├── 001_create_database.sql
│   └── 002_seed_data.sql
├── server.js            # Express server
├── package.json         # Dependencies
└── .env.example         # Environment variables template
```

## API Endpoints

### Authentication
- `POST /api/auth/register` - Register new student
- `POST /api/auth/login` - Login
- `GET /api/auth/me` - Get current user

### Elections
- `GET /api/elections` - Get all elections
- `GET /api/elections/active` - Get active election
- `POST /api/elections` - Create election (admin)
- `PATCH /api/elections/:id/status` - Update election status (admin)

### Candidates
- `GET /api/elections/:electionId/candidates` - Get candidates
- `POST /api/candidates` - Add candidate (admin)
- `DELETE /api/candidates/:id` - Delete candidate (admin)

### Voting
- `POST /api/vote` - Cast vote
- `GET /api/elections/:electionId/voted` - Check if user voted

### Results
- `GET /api/elections/:electionId/results` - Get election results
- `GET /api/admin/stats` - Get dashboard statistics (admin)

## Security Features

- Password hashing with bcrypt
- JWT token authentication
- SQL injection prevention with parameterized queries
- One vote per student enforcement
- Role-based access control
- Secure session management

## Database Schema

### Tables
- **users**: Student and admin accounts
- **elections**: Election information and schedule
- **candidates**: Candidate profiles
- **votes**: Voting records with foreign keys

## Usage

### For Students
1. Register with your student ID
2. Login to your account
3. View active elections
4. Select and vote for candidates
5. View results after election ends

### For Administrators
1. Login with admin credentials
2. Create new elections
3. Add candidates to elections
4. Manage election status
5. View real-time statistics
6. Access results at any time

## Production Deployment

Before deploying to production:

1. Change all default passwords
2. Use a strong JWT_SECRET
3. Enable HTTPS
4. Set up proper database backups
5. Configure CORS appropriately
6. Add rate limiting
7. Set up monitoring and logging

## License

MIT License

## Support

For issues or questions, please contact the system administrator.
