# LifeLink Blood Bank Platform 🩸

A comprehensive React-based blood bank management platform connecting hospitals, doctors, and donors in a seamless ecosystem.

## 🌟 Features

### Landing Page
- **Fixed Navigation Bar** with smooth scrolling
- **Hero Section** with GSAP animations
- **About Section** explaining the platform for each role
- **How It Works** detailed flow with step-by-step guide
- **Support/Contact** section with multiple contact options
- **Fully Responsive** design for mobile, tablet, and desktop

### Role-Based Authentication System

#### 🧑‍⚕️ Doctor
- **Signup Flow**:
  - Email and password
  - Full name and hospital name
  - Medical certificate upload (PDF/JPG/PNG, max 2MB)
  - Verification pending screen after submission
- **Features**:
  - View blood requests
  - Approve donor eligibility
  - Medical oversight
  - Profile verification status

#### 🏥 Hospital
- **Signup Flow**:
  - Hospital information (name, email, license number)
  - Hospital license upload (PDF/JPG/PNG, max 2MB)
  - Admin account creation
  - Verification pending screen after submission
- **Features**:
  - Manage blood inventory
  - Create donor accounts
  - Coordinate with doctors
  - Track all donations

#### 🩸 Donor
- **Sign-in ONLY** (No signup - accounts created by hospitals)
- Hospital-provided credentials required
- **Features**:
  - View donation requests
  - Donation history tracking
  - Eligibility status
  - Profile information

### File Upload System
- Frontend-only file validation
- Supported formats: PDF, JPG, PNG
- Maximum file size: 2MB
- File preview with name display
- Real-time validation feedback

### GSAP Animations
- Hero section entrance animations
- Scroll-triggered section animations
- Smooth page transitions
- Interactive hover effects
- Floating elements

### Responsive Design
- Mobile-first approach
- Breakpoints for mobile, tablet, and desktop
- Hamburger menu for mobile navigation
- Flexible grid layouts
- Touch-friendly UI elements

## 📁 Project Structure

```
frontend/
├── src/
│   ├── App.js                      # Main routing configuration
│   ├── App.css                     # Global styles
│   ├── landing_page/
│   │   ├── home/
│   │   │   ├── HomePage.js         # Main landing page
│   │   │   ├── Navbar.js           # Fixed navigation bar
│   │   │   ├── Hero.js             # Hero section with CTA
│   │   │   ├── What.js             # About section
│   │   │   ├── SiteFlow.js         # How it works
│   │   │   ├── Footer.js           # Support & footer
│   │   │   └── *.css               # Component styles
│   │   ├── signup/
│   │   │   ├── SignUp.js           # Role selection page
│   │   │   └── SignUp.css
│   │   └── auth/
│   │       ├── DoctorSignup.js     # Doctor registration
│   │       ├── HospitalSignup.js   # Hospital registration
│   │       ├── DonorSignin.js      # Donor sign-in
│   │       ├── SignIn.js           # General sign-in
│   │       ├── VerificationPending.js # Post-signup screen
│   │       └── *.css               # Component styles
│   └── ...
├── package.json
└── README.md
```

## 🚀 Getting Started

### Prerequisites
- Node.js (v14 or higher)
- npm or yarn

### Installation

1. **Clone the repository**
   ```bash
   cd frontend
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Start development server**
   ```bash
   npm start
   ```

4. **Open browser**
   ```
   http://localhost:3000
   ```

## 📦 Dependencies

- **react** (^19.2.3) - UI framework
- **react-dom** (^19.2.3) - React DOM renderer
- **react-router-dom** (^6.x) - Routing
- **gsap** (^3.x) - Animations
- **react-scripts** (5.0.1) - Build tools

## 🎨 Design Features

### Color Scheme
- Primary: `#c41e3a` (Blood Red)
- Secondary: `#3498db` (Doctor Blue)
- Accent: `#2ecc71` (Hospital Green)
- Background gradients for each role

### Typography
- System fonts for optimal performance
- Font weights: 400, 600, 700, 800
- Responsive font sizes

### Animations
- **Hero**: Fade and slide on load
- **Sections**: Scroll-triggered animations
- **Cards**: Hover effects and transforms
- **Forms**: Smooth transitions

## 🔐 Authentication Flow

### Route Structure
```
/                           → Landing Page (HomePage)
/signup                     → Role Selection
/signin                     → General Sign In
/auth/doctor               → Doctor Signup
/auth/hospital             → Hospital Signup
/auth/donor                → Donor Sign In
/verification-pending      → Verification Status
```

### Form Validation
- Email format validation
- Password strength (minimum 8 characters)
- Password confirmation matching
- Required field validation
- File type and size validation
- Real-time error feedback

## 📱 Responsive Breakpoints

```css
Mobile:   0px - 768px
Tablet:   768px - 968px
Desktop:  968px+
```

## 🎯 User Flows

### Doctor Flow
1. Click "Sign Up" → Choose "Doctor"
2. Fill registration form + upload certificate
3. Submit → Verification Pending screen
4. Receive email upon approval
5. Sign in → Access doctor dashboard

### Hospital Flow
1. Click "Sign Up" → Choose "Hospital"
2. Fill hospital info + admin account
3. Upload hospital license
4. Submit → Verification Pending screen
5. Receive email upon approval
6. Sign in → Access hospital dashboard

### Donor Flow
1. Contact hospital for credentials
2. Click "Sign Up" → Choose "Donor" (or use general Sign In)
3. Enter hospital-provided email & password
4. Sign in → Access donor dashboard

## 🛠️ Backend Integration (Future)

The frontend is structured to easily connect with a backend:

- **API Endpoints Ready**: Form submission handlers use console.log (replace with API calls)
- **File Upload**: FormData ready for multipart/form-data
- **Authentication**: Token storage can be added to signin handlers
- **State Management**: Can integrate Redux/Context API
- **Protected Routes**: Add auth guards to route components

### Example API Integration

```javascript
// In DoctorSignup.js - Replace console.log with:
const formDataToSend = new FormData();
formDataToSend.append('email', formData.email);
formDataToSend.append('password', formData.password);
formDataToSend.append('name', formData.name);
formDataToSend.append('hospitalName', formData.hospitalName);
formDataToSend.append('certificate', formData.certificate);

const response = await fetch('/api/doctor/signup', {
  method: 'POST',
  body: formDataToSend
});
```

## 🔧 Available Scripts

### `npm start`
Runs the app in development mode at [http://localhost:3000](http://localhost:3000)

### `npm test`
Launches the test runner

### `npm run build`
Builds the app for production to the `build` folder

### `npm run eject`
Ejects from Create React App (one-way operation)

## 🎬 GSAP Animation Patterns

### Hero Animation
```javascript
gsap.from('.hero-title', {
  y: 100,
  opacity: 0,
  duration: 1,
  delay: 0.3
});
```

### Scroll Trigger
```javascript
gsap.from('.about-card', {
  scrollTrigger: {
    trigger: '.about-card',
    start: 'top 80%'
  },
  y: 50,
  opacity: 0,
  duration: 0.8
});
```

## 📝 File Upload Component

The file upload system includes:
- Custom styled file input
- Drag & drop visual feedback
- File type validation
- Size limit enforcement
- Preview with file name
- Error messages

## 🌐 Browser Support

- Chrome (latest)
- Firefox (latest)
- Safari (latest)
- Edge (latest)
- Mobile browsers (iOS Safari, Chrome Mobile)

## 🔒 Security Considerations (Future Backend)

- Server-side file validation
- JWT token authentication
- HTTPS only in production
- CORS configuration
- Rate limiting
- Input sanitization
- SQL injection prevention

## 📊 Performance

- Code splitting with React Router
- Lazy loading for routes (can be added)
- Optimized images and assets
- CSS animations (GPU accelerated)
- GSAP performance optimizations

## 🤝 Contributing

1. Fork the repository
2. Create feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit changes (`git commit -m 'Add AmazingFeature'`)
4. Push to branch (`git push origin feature/AmazingFeature`)
5. Open Pull Request

## 📄 License

This project is created for educational purposes.

## 👥 Support

For support, email support@lifelink.com or contact through the platform's support page.

## 🎯 Next Steps / Roadmap

### Phase 1: Current (Frontend Complete) ✅
- [x] Landing page with all sections
- [x] Role-based authentication UI
- [x] File upload system
- [x] GSAP animations
- [x] Responsive design

### Phase 2: Backend Integration
- [ ] Create REST API with Node.js/Express
- [ ] Database setup (MongoDB/PostgreSQL)
- [ ] User authentication with JWT
- [ ] File storage (AWS S3 / Cloud Storage)
- [ ] Email verification system

### Phase 3: Dashboard Development
- [ ] Doctor dashboard
- [ ] Hospital dashboard
- [ ] Donor dashboard
- [ ] Admin panel

### Phase 4: Advanced Features
- [ ] Real-time notifications
- [ ] Blood request management
- [ ] Inventory tracking
- [ ] Analytics and reports
- [ ] Mobile app (React Native)

## 🏆 Key Highlights

✅ **Production-Ready UI** - Professional design with attention to detail
✅ **Role-Based Access** - Three distinct user flows
✅ **File Upload System** - Complete frontend validation
✅ **GSAP Animations** - Smooth, professional animations
✅ **Fully Responsive** - Works on all devices
✅ **Clean Code** - Well-structured and documented
✅ **Easy Backend Integration** - Ready for API connection

---

**Built with ❤️ for LifeLink Blood Bank Platform**
