# SkillSync Client

Frontend application for SkillSync - an AI-powered recruitment platform built with React and Vite.

## 🚀 Tech Stack

- **Framework**: React 18
- **Build Tool**: Vite
- **Routing**: React Router DOM v6
- **Styling**: Tailwind CSS
- **UI Components**: Radix UI, Lucide Icons
- **PDF Viewer**: PDF.js
- **State Management**: React Context API
- **HTTP Client**: Fetch API

## 📋 Prerequisites

- Node.js v18 or higher
- npm or yarn package manager
- Running backend services (see repo root `package.json` scripts and `.env.example`)

## 🔧 Installation

1. Navigate to the client directory:
```bash
cd client
```

2. Install dependencies:
```bash
npm install
```

3. Create a `.env` file in the client directory (if needed):
```env
# API Base URL (optional, defaults to proxy in vite.config.js)
VITE_API_URL=http://localhost:5000
```

## 🏃 Running the Application

### Development Mode
```bash
npm run dev
```

The application will start on `http://localhost:3000`

### Build for Production
```bash
npm run build
```

### Preview Production Build
```bash
npm run preview
```

### Lint Code
```bash
npm run lint
```

## 🎨 Features

### For Candidates (Users)
- ✅ User registration and authentication
- ✅ Browse available job openings
- ✅ Search and filter jobs
- ✅ Apply to jobs with resume upload
- ✅ View application status
- ✅ Track ATS scores
- ✅ Personal dashboard

### For Recruiters (Admins)
- ✅ Admin dashboard with analytics
- ✅ Create and manage job postings
- ✅ View all applications
- ✅ Review candidate profiles
- ✅ AI-powered ATS scoring
- ✅ Candidate search and filtering
- ✅ Application status management

## 📁 Project Structure

```
client/
├── public/               # Static assets
│   └── vite.svg
├── src/
│   ├── components/       # React components
│   │   ├── dashboard/    # Dashboard components
│   │   │   ├── AdminDashboard.jsx
│   │   │   ├── UserDashboard.jsx
│   │   │   ├── MetricCard.jsx
│   │   │   ├── JobStatusChart.jsx
│   │   │   ├── RecentActivity.jsx
│   │   │   └── ApplicationStatus.jsx
│   │   ├── ui/           # Reusable UI components
│   │   │   ├── button.jsx
│   │   │   ├── badge.jsx
│   │   │   └── search-bar.jsx
│   │   ├── ApplicantsList.jsx
│   │   ├── ApplyModal.jsx
│   │   ├── CandidateSearch.jsx
│   │   ├── CreateJob.jsx
│   │   ├── FilterPanel.jsx
│   │   ├── JobDetails.jsx
│   │   ├── JobSearch.jsx
│   │   ├── JobsList.jsx
│   │   ├── Navigation.jsx
│   │   ├── SearchResults.jsx
│   │   └── UnifiedSearch.jsx
│   ├── context/          # React Context
│   │   └── AuthContext.jsx
│   ├── hooks/            # Custom hooks
│   │   └── useAuth.js
│   ├── lib/              # Utility libraries
│   │   └── utils.js
│   ├── pages/            # Page components
│   │   ├── AuthPage.jsx
│   │   ├── Dashboard.jsx
│   │   └── SearchPage.jsx
│   ├── App.jsx           # Main app component
│   ├── main.jsx          # Entry point
│   └── index.css         # Global styles
├── index.html            # HTML template
├── vite.config.js        # Vite configuration
├── tailwind.config.js    # Tailwind CSS configuration
├── postcss.config.js     # PostCSS configuration
├── eslint.config.js      # ESLint configuration
└── package.json
```

## 🎯 Key Components

### Authentication
- **AuthPage**: Combined login/register page with role selection
- **AuthContext**: Global authentication state management
- **ProtectedRoute**: Route wrapper for authenticated pages

### Dashboard
- **AdminDashboard**: Analytics and metrics for recruiters
- **UserDashboard**: Application tracking for candidates
- **MetricCard**: Reusable metric display component
- **JobStatusChart**: Visual representation of job statistics

### Job Management
- **JobsList**: Display all job openings
- **JobDetails**: Detailed job view with application form
- **CreateJob**: Job creation form (admin only)
- **ApplyModal**: Job application modal with resume upload

### Search & Filter
- **UnifiedSearch**: Search across jobs and candidates
- **SearchPage**: Dedicated search results page
- **FilterPanel**: Advanced filtering options
- **CandidateSearch**: Candidate-specific search (admin)

## 🔐 Authentication Flow

1. User registers or logs in via AuthPage
2. JWT token stored in localStorage
3. AuthContext provides global auth state
4. ProtectedRoute guards authenticated pages
5. Token sent with API requests
6. Auto-logout on token expiration

## 🎨 Styling

### Tailwind CSS
The application uses Tailwind CSS for styling with custom configuration:

```javascript
// tailwind.config.js
{
  theme: {
    extend: {
      colors: {
        // Custom color palette
      },
      animation: {
        // Custom animations
      }
    }
  }
}
```

### Component Library
- **Radix UI**: Accessible, unstyled UI primitives
- **Lucide React**: Beautiful icon library
- **Class Variance Authority**: Component variant management
- **Tailwind Merge**: Intelligent class merging

## 🌐 API Integration

### Base Configuration
```javascript
// vite.config.js
server: {
  proxy: {
    '/api': {
      target: 'http://localhost:5000',
      changeOrigin: true,
    },
  },
}
```

### Making API Calls
```javascript
const response = await fetch('/api/jobs', {
  headers: {
    'Authorization': `Bearer ${token}`,
    'Content-Type': 'application/json'
  }
});
```

## 📱 Responsive Design

The application is fully responsive with breakpoints:
- **Mobile**: < 640px
- **Tablet**: 640px - 1024px
- **Desktop**: > 1024px

## ⚡ Performance Optimizations

- **Code Splitting**: Lazy loading with React.lazy()
- **Route-based splitting**: Each page loaded on demand
- **Memoization**: React.memo for expensive components
- **Optimized Images**: Proper image sizing and formats
- **Vite HMR**: Fast hot module replacement in development

## 🧪 Development Tools

### ESLint
```bash
npm run lint
```

### Vite Dev Server
- Fast HMR (Hot Module Replacement)
- Optimized dependency pre-bundling
- Built-in proxy for API calls

## 📦 Dependencies

### Production
- `react` & `react-dom` - UI library
- `react-router-dom` - Routing
- `@radix-ui/react-dialog` - Modal dialogs
- `@radix-ui/react-slot` - Slot component
- `lucide-react` - Icons
- `react-icons` - Additional icons
- `pdfjs-dist` - PDF viewing
- `tailwind-merge` - Class merging
- `clsx` - Conditional classes
- `class-variance-authority` - Component variants

### Development
- `vite` - Build tool
- `@vitejs/plugin-react` - React plugin for Vite
- `tailwindcss` - CSS framework
- `autoprefixer` - CSS post-processing
- `postcss` - CSS transformation
- `eslint` - Code linting
- `eslint-plugin-react-hooks` - React hooks linting
- `eslint-plugin-react-refresh` - React refresh linting

## 🚀 Deployment

### Build for Production
```bash
npm run build
```

This creates an optimized build in the `dist/` directory.

### Deployment Platforms

#### Vercel (Recommended)
```bash
# Install Vercel CLI
npm i -g vercel

# Deploy
vercel
```

#### Netlify
```bash
# Install Netlify CLI
npm i -g netlify-cli

# Deploy
netlify deploy --prod
```

#### Manual Deployment
1. Build the project: `npm run build`
2. Upload `dist/` folder to your hosting provider
3. Configure server to serve `index.html` for all routes

### Environment Variables

For production, set environment variables in your hosting platform:
- `VITE_API_URL` - Backend API URL

## 🔧 Configuration Files

### vite.config.js
```javascript
export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  server: {
    port: 3000,
    proxy: {
      '/api': 'http://localhost:5000',
    },
  },
})
```

### tailwind.config.js
Customizes Tailwind CSS with project-specific design tokens.

### eslint.config.js
Configures ESLint rules for code quality.

## 🎯 Best Practices

1. **Component Organization**: Keep components small and focused
2. **State Management**: Use Context for global state, local state for component-specific data
3. **Error Handling**: Always handle API errors gracefully
4. **Loading States**: Show loading indicators for async operations
5. **Accessibility**: Use semantic HTML and ARIA attributes
6. **Code Splitting**: Lazy load routes and heavy components
7. **Type Safety**: Use PropTypes or migrate to TypeScript for larger projects

## 🐛 Troubleshooting

### Port Already in Use
```bash
# Change port in vite.config.js or use:
npm run dev -- --port 3001
```

### API Connection Issues
- Verify backend server is running on port 5000
- Check proxy configuration in vite.config.js
- Ensure CORS is enabled on backend

### Build Errors
```bash
# Clear node_modules and reinstall
rm -rf node_modules package-lock.json
npm install
```

## 📝 License

MIT

## 👥 Support

For issues and questions, please create an issue in the repository.
