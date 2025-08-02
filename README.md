# CoopBase - Cooperative Society Management System

A comprehensive multi-tenant web application for managing cooperative societies. Each society that registers becomes a "tenant" and must be approved by the system administrator (developer/landlord).

## 🏗️ Project Overview

CoopBase is a modern, secure, and efficient platform that allows cooperative societies to:
- Register and get approved by system administrators
- Manage their society operations
- Create and manage services (Savings, Share Capital, Monthly Deductions)
- Handle member registrations and transactions
- Maintain comprehensive audit trails

## 🎯 Key Features

### Multi-Tenant Architecture
- Each society operates in its own isolated environment
- Secure data separation between tenants
- Scalable architecture for multiple societies

### Role-Based Access Control
1. **Developer (Landlord)**: System administration and tenant management
2. **Society Admin**: Manage society operations and services
3. **Members**: Access their savings/share accounts (future feature)

### Society Management
- Document upload and verification system
- Approval workflow for new registrations
- Comprehensive society information management

### Security Features
- JWT-based authentication
- Password hashing with bcrypt
- Rate limiting and security headers
- File upload validation and security

## 🛠️ Tech Stack

### Frontend
- **HTML5**: Semantic markup and structure
- **Tailwind CSS**: Utility-first CSS framework for modern, responsive design
- **JavaScript**: Frontend interactivity and API communication

### Backend
- **Node.js**: JavaScript runtime environment
- **Express.js**: Web application framework
- **MySQL**: Relational database management system
- **JWT**: JSON Web Tokens for authentication
- **Multer**: File upload handling
- **bcryptjs**: Password hashing

### Development Tools
- **Nodemon**: Development server with auto-restart
- **Helmet**: Security middleware
- **CORS**: Cross-origin resource sharing
- **Express Rate Limit**: API rate limiting

## 📁 Project Structure

```
CoopBase/
├── frontend/
│   ├── index.html              # Landing page with login forms
│   ├── society-register.html   # Society registration page
│   └── css/
│       └── styles.css          # Custom styles
├── backend/
│   ├── server.js               # Main Express server
│   ├── routes/
│   │   └── auth.js             # Authentication routes
│   ├── controllers/
│   │   └── authController.js   # Authentication logic
│   ├── models/
│   │   ├── societyModel.js     # Society data model
│   │   └── userModel.js        # User data model
│   └── config/
│       └── db.js               # Database configuration
├── package.json                # Node.js dependencies
├── env.example                 # Environment variables template
└── README.md                   # Project documentation
```

## 🚀 Getting Started

### Prerequisites
- Node.js (v16 or higher)
- MySQL (v8.0 or higher)
- XAMPP (for local development)

### Installation

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd CoopBase
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Set up environment variables**
   ```bash
   cp env.example .env
   ```
   Edit `.env` file with your database credentials and other settings.

4. **Set up MySQL database**
   - Create a new database named `coopbase`
   - The application will automatically create tables on first run

5. **Create initial developer account**
   ```bash
   # You'll need to manually insert a developer user in the database
   # or create a setup script
   ```

6. **Start the development server**
   ```bash
   npm run dev
   ```

7. **Access the application**
   - Frontend: http://localhost:3000
   - API: http://localhost:3000/api

## 🔧 API Endpoints

### Authentication
- `POST /api/auth/developer/login` - Developer login
- `POST /api/auth/society/login` - Society login
- `POST /api/auth/society/register` - Society registration
- `POST /api/auth/logout` - Logout

### Society Management (Developer Only)
- `GET /api/auth/pending-societies` - Get pending society registrations
- `PUT /api/auth/society/:societyId/approval` - Approve/reject society
- `GET /api/auth/society/:societyId` - Get society details

### Health Check
- `GET /api/health` - Server health status

## 📊 Database Schema

### Core Tables
- **societies**: Society information and status
- **users**: User accounts with role-based access
- **society_documents**: Uploaded documents for verification
- **services**: Society services (savings, loans, etc.)
- **members**: Society member information
- **transactions**: Financial transactions
- **audit_logs**: System audit trail

## 🔐 Security Features

### Authentication & Authorization
- JWT-based token authentication
- Role-based access control
- Password hashing with bcrypt
- Session management

### Data Protection
- Input validation and sanitization
- SQL injection prevention
- XSS protection with Helmet
- File upload security

### API Security
- Rate limiting
- CORS configuration
- Request size limits
- Error handling without sensitive data exposure

## 🎨 Frontend Features

### Responsive Design
- Mobile-first approach
- Tailwind CSS for modern styling
- Cross-browser compatibility

### User Experience
- Clean, intuitive interface
- Form validation
- Loading states and error handling
- File upload with progress indication

### Accessibility
- Semantic HTML structure
- ARIA labels and roles
- Keyboard navigation support
- Screen reader compatibility

## 🔄 Workflow

### Society Registration Process
1. Society admin fills out registration form
2. Uploads required documents (registration certificate, bylaws)
3. System stores registration as "pending"
4. Developer reviews application and documents
5. Developer approves or rejects the society
6. Society admin can login once approved

### Developer Dashboard (Future)
- View all registered societies
- Manage society approvals
- System statistics and reports
- User management

### Society Dashboard (Future)
- Member management
- Service creation and management
- Transaction processing
- Financial reporting

## 🧪 Testing

### Running Tests
```bash
npm test
```

### Test Coverage
- Unit tests for models and controllers
- Integration tests for API endpoints
- Frontend functionality tests

## 📈 Future Enhancements

### Planned Features
- Member portal with individual accounts
- Advanced financial management
- Reporting and analytics
- Email notifications
- Mobile application
- API documentation with Swagger
- Advanced search and filtering
- Bulk operations
- Data export functionality

### Technical Improvements
- Redis for caching
- WebSocket for real-time updates
- Docker containerization
- CI/CD pipeline
- Performance monitoring
- Automated backups

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests for new functionality
5. Submit a pull request

## 📝 License

This project is licensed under the MIT License - see the LICENSE file for details.

## 🆘 Support

For support and questions:
- Create an issue in the repository
- Contact the development team
- Check the documentation

## 🔄 Version History

- **v1.0.0**: Initial release with basic authentication and society registration
- Future versions will include member management and financial features

---

**CoopBase** - Empowering Cooperative Societies with Modern Technology 