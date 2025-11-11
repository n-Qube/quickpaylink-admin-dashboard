# QuickLink Pay Admin Dashboard

[![Firebase Hosting](https://img.shields.io/badge/Firebase-Hosting-FFCA28?style=flat&logo=firebase&logoColor=white)](https://quicklink-pay-admin.web.app)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.9-3178C6?style=flat&logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![React](https://img.shields.io/badge/React-19.1-61DAFB?style=flat&logo=react&logoColor=white)](https://reactjs.org/)
[![Vite](https://img.shields.io/badge/Vite-7.1-646CFF?style=flat&logo=vite&logoColor=white)](https://vitejs.dev/)
[![Firebase](https://img.shields.io/badge/Firebase-12.5-FFCA28?style=flat&logo=firebase&logoColor=white)](https://firebase.google.com/)
[![License](https://img.shields.io/badge/License-MIT-green.svg)](LICENSE)

> **Live Demo**: [https://quicklink-pay-admin.web.app](https://quicklink-pay-admin.web.app)

A comprehensive, production-ready admin dashboard for QuickLink Pay with advanced Role-Based Access Control (RBAC), merchant management, subscription plans, analytics, and system configuration.

## Features

### Core Features
- **Advanced RBAC System** - Hierarchical role management with granular permissions
- **User Management** - Create and manage admin users with role assignment
- **Merchant Operations** - Complete merchant lifecycle management
- **Subscription Plans** - Dynamic pricing and feature configuration
- **Analytics Dashboard** - Real-time metrics and reporting
- **System Configuration** - Platform-wide settings management

### Security & Compliance
- **Firebase Authentication** - Secure user authentication with 2FA support
- **Firestore Security Rules** - Role-based data access control
- **Audit Logs** - Comprehensive activity tracking
- **Compliance Management** - KYC/AML workflow support

### Platform Management
- **Multi-Currency Support** - GHS, USD, and more
- **Location Management** - Countries, regions, and cities
- **Business Types** - Dynamic business category management
- **Tax Rules** - Configurable tax calculation
- **Risk Management** - Automated risk scoring and monitoring
- **Support Tickets** - AI-powered support system

### Communication
- **Email Templates** - Dynamic SendGrid integration
- **WhatsApp Templates** - 360Dialog integration
- **AI-Powered Generation** - Gemini AI for content creation

## Tech Stack

- **Frontend**: React 19.1, TypeScript 5.9, Vite 7.1
- **UI Framework**: Tailwind CSS, Radix UI
- **Backend**: Firebase (Firestore, Functions, Hosting, Storage)
- **Authentication**: Firebase Auth
- **State Management**: Zustand, React Query
- **Routing**: React Router DOM 7.9
- **Icons**: Lucide React

## Getting Started

### Prerequisites

```bash
Node.js >= 18.0.0
npm >= 9.0.0
Firebase CLI
```

### Installation

1. **Clone the repository**
   ```bash
   git clone https://github.com/n-Qube/quickpaylink-admin-dashboard.git
   cd quickpaylink-admin-dashboard
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Configure Firebase**
   - Create a Firebase project at [console.firebase.google.com](https://console.firebase.google.com)
   - Update `src/lib/firebase.ts` with your Firebase config
   - Place service account JSON in `firebase-service-account.json`

4. **Set up environment variables**
   ```bash
   cp .env.example .env
   ```
   Edit `.env` and add your API keys.

5. **Start development server**
   ```bash
   npm run dev
   ```
   Visit [http://localhost:5173](http://localhost:5173)

## Deployment

### Firebase Hosting

Deploy to Firebase Hosting with one command:

```bash
npm run deploy
```

Or use the deployment script:

```bash
./deploy-hosting.sh
```

Your app will be live at: **https://quicklink-pay-admin.web.app**

### Manual Deployment

```bash
# Build the app
npm run build

# Deploy to Firebase
firebase deploy --only hosting
```

## Project Structure

```
admin-dashboard/
├── src/
│   ├── components/       # Reusable React components
│   ├── contexts/         # React context providers
│   ├── hooks/           # Custom React hooks
│   ├── lib/             # Firebase and utility functions
│   ├── pages/           # Page components
│   ├── services/        # API and service integrations
│   ├── types/           # TypeScript type definitions
│   └── utils/           # Helper functions
├── functions/           # Firebase Cloud Functions
├── scripts/             # Database seed and utility scripts
├── public/              # Static assets
└── firebase.json        # Firebase configuration
```

## Key Pages

- **Dashboard** - Analytics overview and key metrics
- **User Management** - Admin user creation and role assignment
- **Role Management** - Define roles with granular permissions
- **Merchants** - Merchant onboarding and management
- **Subscription Plans** - Create and manage pricing tiers
- **System Config** - Platform-wide settings
- **Analytics** - Detailed metrics and reports
- **Audit Logs** - Security and compliance tracking

## Development

### Available Scripts

```bash
npm run dev          # Start development server
npm run build        # Build for production
npm run preview      # Preview production build
npm run lint         # Run ESLint
npm run deploy       # Build and deploy to Firebase
```

### Code Style

This project uses ESLint and TypeScript for code quality. Run linting:

```bash
npm run lint
```

## Firebase Services

### Firestore Collections

- `admins` - Admin users
- `roles` - Role definitions
- `merchants` - Merchant data
- `subscriptionPlans` - Pricing plans
- `systemConfig` - Platform configuration
- `auditLogs` - Activity logs
- `supportTickets` - Support requests
- `emailTemplates` - Email templates
- `whatsappTemplates` - WhatsApp templates

### Cloud Functions

Located in `functions/` directory:
- WhatsApp webhook handling
- API key management
- Rate limiting
- Secret management

## Security

- All routes protected with Firebase Authentication
- Role-based access control on every page
- Firestore security rules enforce data access
- Audit logging for compliance
- No sensitive data in Git (see `.gitignore`)

## Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## Documentation

- [Deployment Guide](DEPLOYMENT.md)
- [RBAC Implementation](RBAC_IMPLEMENTATION.md)
- [Database Schema](DATABASE_SCHEMA.md)
- [Firebase Setup](FIREBASE_SETUP_GUIDE.md)

## Support

For support, email support@quicklinkpay.com or open an issue.

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## Acknowledgments

- Built with [React](https://reactjs.org/)
- Powered by [Firebase](https://firebase.google.com/)
- UI components from [Radix UI](https://www.radix-ui.com/)
- Icons from [Lucide](https://lucide.dev/)

---

**Live App**: https://quicklink-pay-admin.web.app
**Repository**: https://github.com/n-Qube/quickpaylink-admin-dashboard

Made with ❤️ by the QuickLink Pay Team
# Test CI/CD

This triggers GitHub Actions
