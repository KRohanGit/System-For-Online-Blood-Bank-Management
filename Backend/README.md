# LifeLink Backend - Secure Blood Donation Management System

A secure, role-based backend built with Node.js, Express.js, and MongoDB for the LifeLink blood donation platform.

## 🎯 Features

- **Role-Based Authentication**: Doctor, Hospital Admin, and Donor roles
- **Secure Password Hashing**: bcrypt with 12 salt rounds
- **JWT Authentication**: 1-day token expiry
- **File Upload**: Multer with validation (PDF, JPG, PNG, max 2MB)
- **Profile Management**: Role-specific profiles and verification
- **CORS Enabled**: Configured for frontend integration

## 📁 Project Structure

```
Backend/
├── server.js                 # Main server file
├── .env                      # Environment variables (create from .env.example)
├── .env.example             # Environment template
├── package.json             # Dependencies
├── uploads/                 # File upload directory
│   ├── certificates/        # Doctor certificates
│   └── licenses/            # Hospital licenses
└── src/
    ├── config/
    │   └── database.js      # MongoDB connection
    ├── models/
    │   ├── User.js          # User model (common)
    │   ├── DoctorProfile.js # Doctor profile
    │   └── HospitalProfile.js # Hospital profile
    ├── controllers/
    │   ├── authController.js     # Authentication logic
    │   ├── doctorController.js   # Doctor operations
    │   ├── hospitalController.js # Hospital operations
    │   └── donorController.js    # Donor operations
    ├── routes/
    │   ├── authRoutes.js    # Auth endpoints
    │   ├── doctorRoutes.js  # Doctor endpoints
    │   ├── hospitalRoutes.js # Hospital endpoints
    │   └── donorRoutes.js   # Donor endpoints
    ├── middleware/
    │   ├── auth.js          # JWT verification
    │   ├── checkRole.js     # Role-based access
    │   └── upload.js        # File upload handling
    └── utils/
        ├── jwt.js           # JWT utilities
        └── validation.js    # Validation functions
```

## 🚀 Getting Started

### Prerequisites

- Node.js (v16 or higher)
- MongoDB (local or MongoDB Atlas)
- npm or yarn

### Installation

1. **Navigate to Backend directory**
   ```bash
   cd Backend
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Set up environment variables**
   ```bash
   # Copy the example file
   copy .env.example .env
   
   # Edit .env with your values
   ```

4. **Configure MongoDB**
   - Local MongoDB: `mongodb://localhost:27017/lifelink`
   - MongoDB Atlas: Get connection string from Atlas dashboard

5. **Generate JWT Secret**
   ```bash
   node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"
   ```
   Copy the output to `.env` as `JWT_SECRET`

### Running the Server

**Development mode (with auto-reload):**
```bash
npm run dev
```

**Production mode:**
```bash
npm start
```

Server will start on `http://localhost:5000`

## 📋 API Endpoints

### Authentication Routes (`/api/auth`)

| Method | Endpoint | Description | Access |
|--------|----------|-------------|--------|
| POST | `/register/doctor` | Register doctor with certificate | Public |
| POST | `/register/hospital` | Register hospital with license | Public |
| POST | `/login` | Login for all roles | Public |
| GET | `/profile` | Get current user profile | Private |

### Doctor Routes (`/api/doctor`)

| Method | Endpoint | Description | Access |
|--------|----------|-------------|--------|
| GET | `/profile` | Get doctor profile | Doctor |
| PUT | `/profile` | Update doctor profile | Doctor |
| GET | `/verification-status` | Check verification status | Doctor |

### Hospital Routes (`/api/hospital`)

| Method | Endpoint | Description | Access |
|--------|----------|-------------|--------|
| GET | `/profile` | Get hospital profile | Admin |
| PUT | `/profile` | Update hospital profile | Admin |
| GET | `/verification-status` | Check verification status | Admin |
| POST | `/donor` | Create donor account | Admin |

### Donor Routes (`/api/donor`)

| Method | Endpoint | Description | Access |
|--------|----------|-------------|--------|
| GET | `/profile` | Get donor profile | Donor |
| PUT | `/password` | Update password | Donor |

## 🔐 Security Features

1. **Password Security**
   - Hashed using bcrypt with 12 salt rounds
   - Never stored in plain text
   - Automatic hashing on user creation

2. **JWT Authentication**
   - Secure token-based authentication
   - 1-day token expiry
   - Stored on client side

3. **Role-Based Access Control**
   - Middleware checks user role
   - Route-level protection
   - Prevents unauthorized access

4. **File Upload Security**
   - File type validation (PDF, JPG, PNG only)
   - Size limit: 2MB
   - Unique filename generation
   - Separate storage by role

5. **Input Validation**
   - Email format validation
   - Password strength requirements
   - Required field checks

## 🧪 Testing the API

### Using Thunder Client / Postman

1. **Register a Doctor**
   ```
   POST http://localhost:5000/api/auth/register/doctor
   Content-Type: multipart/form-data
   
   Body (form-data):
   - email: doctor@hospital.com
   - password: password123
   - name: Dr. John Smith
   - hospitalName: City Hospital
   - certificate: [upload PDF/JPG/PNG file]
   ```

2. **Register a Hospital**
   ```
   POST http://localhost:5000/api/auth/register/hospital
   Content-Type: multipart/form-data
   
   Body (form-data):
   - hospitalName: City Hospital
   - officialEmail: info@cityhospital.com
   - licenseNumber: LIC123456
   - adminName: Admin Name
   - adminEmail: admin@cityhospital.com
   - password: password123
   - license: [upload PDF/JPG/PNG file]
   ```

3. **Login**
   ```
   POST http://localhost:5000/api/auth/login
   Content-Type: application/json
   
   Body:
   {
     "email": "doctor@hospital.com",
     "password": "password123",
     "role": "doctor"
   }
   ```

4. **Access Protected Route**
   ```
   GET http://localhost:5000/api/doctor/profile
   Authorization: Bearer <your-jwt-token>
   ```

## 🗄️ Database Models

### User (Common)
```javascript
{
  email: String (unique, required),
  password: String (hashed, required),
  role: String (doctor/admin/donor),
  isVerified: Boolean,
  createdAt: Date
}
```

### DoctorProfile
```javascript
{
  userId: ObjectId (ref User),
  fullName: String,
  hospitalName: String,
  certificateFilePath: String,
  verificationStatus: String (pending/approved/rejected),
  rejectionReason: String,
  verifiedAt: Date
}
```

### HospitalProfile
```javascript
{
  userId: ObjectId (ref User),
  hospitalName: String,
  officialEmail: String,
  licenseNumber: String (unique),
  licenseFilePath: String,
  adminName: String,
  adminEmail: String,
  verificationStatus: String (pending/approved/rejected),
  rejectionReason: String,
  verifiedAt: Date
}
```

## 🔧 Environment Variables

| Variable | Description | Example |
|----------|-------------|---------|
| `NODE_ENV` | Environment mode | `development` or `production` |
| `PORT` | Server port | `5000` |
| `MONGODB_URI` | MongoDB connection string | `mongodb://localhost:27017/lifelink` |
| `JWT_SECRET` | Secret key for JWT | Generated 64-byte hex string |
| `FRONTEND_URL` | Frontend URL for CORS | `http://localhost:3000` |

### SMTP / Email Setup

The backend can send donor credential and emergency alert emails through a real SMTP provider.

Use one of these options in `.env`:

1. `SMTP_URL` - preferred if your provider gives a single connection string.
2. `SMTP_HOST` + `SMTP_PORT` + `SMTP_SECURE` + `EMAIL_USER` + `EMAIL_PASS` - standard SMTP config.
3. `EMAIL_USER` + `EMAIL_PASS` - Gmail App Password mode.

If none of the SMTP values are set, the app falls back to Ethereal test mail, which is useful for local development but does not deliver to a real inbox.

Example real SMTP config:

```env
SMTP_URL=smtps://user@example.com:your-app-password@smtp.provider.com:465
EMAIL_FROM_NAME=LifeLink Blood Bank
EMAIL_FROM_ADDRESS=no-reply@lifelink.com
```

How to verify:

1. Restart the backend after editing `.env`.
2. Create a donor from the hospital admin endpoint.
3. Check the API response `emailSent` field.
4. Check the recipient inbox if you used a real SMTP provider.
5. If you used Ethereal, open the preview URL printed in the backend logs.

## 📝 Development Notes

### Adding New Routes
1. Create controller function in `src/controllers/`
2. Add route in `src/routes/`
3. Apply middleware (auth, role check) as needed
4. Test with API client

### Adding New Roles
1. Update User model enum in `src/models/User.js`
2. Create new profile model if needed
3. Add role-specific routes and controllers
4. Update middleware if necessary

## 🐛 Common Issues

1. **MongoDB Connection Failed**
   - Ensure MongoDB is running locally
   - Check `MONGODB_URI` in `.env`
   - Verify network connectivity for Atlas

2. **JWT Error**
   - Check if `JWT_SECRET` is set in `.env`
   - Verify token format: `Bearer <token>`

3. **File Upload Error**
   - Check file type (PDF/JPG/PNG only)
   - Verify file size < 2MB
   - Ensure `uploads/` directory exists

4. **CORS Issues**
   - Update `FRONTEND_URL` in `.env`
   - Check frontend is running on correct port

## 📦 Dependencies

### Production
- **express**: Web framework
- **mongoose**: MongoDB ODM
- **bcryptjs**: Password hashing
- **jsonwebtoken**: JWT authentication
- **multer**: File upload handling
- **cors**: Cross-origin resource sharing
- **dotenv**: Environment variables

### Development
- **nodemon**: Auto-reload on file changes

## 🚀 Deployment Preparation

1. Set `NODE_ENV=production` in `.env`
2. Generate strong `JWT_SECRET`
3. Use MongoDB Atlas for production database
4. Enable HTTPS
5. Set up proper logging
6. Configure rate limiting (future enhancement)
7. Set up monitoring and alerts

## 📄 License

ISC

## 👨‍💻 Author

Rohan

---

**Note**: This is a capstone project backend. For production deployment, consider additional security measures like rate limiting, request validation, API documentation (Swagger), and comprehensive testing.
