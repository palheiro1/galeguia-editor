# Contributing to Galeguia Editor

## 🚀 Getting Started

### Prerequisites
- Node.js 18.x or higher
- npm or yarn
- Expo CLI
- Git

### Setup Instructions

1. **Clone the repository**
   ```bash
   git clone https://github.com/palheiro1/galeguia-editor.git
   cd galeguia-editor
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Environment Setup**
   ```bash
   cp .env.example .env.local
   # Edit .env.local with your Supabase credentials
   ```

4. **Run the application**
   ```bash
   # For web development
   npm run web
   
   # For mobile development
   npm start
   ```

## 🏗️ Architecture

### Project Structure
```
src/
├── components/          # Reusable UI components
├── contexts/           # React contexts for state management
├── hooks/              # Custom React hooks
├── lib/                # Utility libraries and configurations
├── screens/            # Screen components
├── styles/             # Design system and styling
└── types/              # TypeScript type definitions
```

### Key Concepts

#### Grains System
- **Grains** are the smallest educational units within pages
- Each page contains exactly 15 grains
- 7 grain types supported: textToComplete, testQuestion, imagesToGuess, etc.

#### Page Types
- **Introduction/Booster/Comparation/Review**: Predefined 15-grain patterns
- **Custom**: User-defined grain patterns
- **Text (Legacy)**: Backward compatibility

## 🧪 Testing

### Running Tests
```bash
# Run all tests
npm test

# Run tests in watch mode
npm run test:watch

# Run tests with coverage
npm run test:coverage
```

### Test Structure
- Unit tests: `__tests__/components/`
- Integration tests: `__tests__/integration/`
- E2E tests: `__tests__/e2e/`

### Writing Tests
```typescript
// Example test structure
describe('Component Name', () => {
  beforeEach(() => {
    // Setup
  });

  it('should do something', () => {
    // Test implementation
  });
});
```

## 🎨 Code Style

### ESLint Configuration
We use ESLint with TypeScript and React Native plugins:
```bash
npm run lint        # Check for issues
npm run lint:fix    # Auto-fix issues
```

### TypeScript Guidelines
- Use strict mode
- Prefer explicit types over `any`
- Use interface over type for object shapes
- Follow naming conventions

### Component Guidelines
```typescript
// Preferred component structure
interface ComponentProps {
  title: string;
  onPress: () => void;
  disabled?: boolean;
}

export const Component: React.FC<ComponentProps> = ({
  title,
  onPress,
  disabled = false,
}) => {
  // Component implementation
};
```

## 🚀 Development Workflow

### Branch Strategy
- `main`: Production-ready code
- `develop`: Development branch
- `feature/*`: Feature branches
- `bugfix/*`: Bug fix branches
- `hotfix/*`: Emergency fixes

### Commit Messages
Follow conventional commit format:
```
feat: add new grain type support
fix: resolve session persistence issue
docs: update API documentation
test: add unit tests for auth component
```

### Pull Request Process
1. Create feature branch from `develop`
2. Implement changes with tests
3. Update documentation if needed
4. Create PR with descriptive title and description
5. Request review from maintainers
6. Address review feedback
7. Merge after approval

## 🐛 Issue Reporting

### Bug Reports
Include:
- Steps to reproduce
- Expected vs actual behavior
- Screenshots/videos if applicable
- Environment details (OS, browser, device)
- Console errors/logs

### Feature Requests
Include:
- Clear description of the feature
- Use cases and benefits
- Mockups or examples if applicable
- Implementation suggestions

## 📚 API Documentation

### Supabase Integration
- Authentication via email/password
- Row Level Security (RLS) policies
- Real-time subscriptions for collaborative features

### Key Database Tables
- `profiles`: User information and roles
- `courses`: Course metadata
- `modules`: Course structure
- `lessons`: Lesson content
- `pages`: Page structure with grain patterns
- `grains`: Educational content units

## 🔧 Common Development Tasks

### Adding a New Grain Type
1. Update `GrainType` in `src/types/index.ts`
2. Add content interface for the grain type
3. Update validation in database trigger
4. Implement UI components in `GrainEditScreen`
5. Add test support in `PageTestScreen`
6. Update documentation

### Adding a New Screen
1. Create screen component in `src/screens/`
2. Add to navigation types in `src/types/index.ts`
3. Update navigation configuration in `App.tsx`
4. Add navigation functions in parent screens
5. Write tests for the new screen

### Performance Optimization
- Use React.memo for expensive components
- Implement virtual lists for large datasets
- Optimize images with appropriate sizes
- Use lazy loading for heavy components

## 🚀 Deployment

### Web Deployment (Netlify)
```bash
npm run build:web
npm run deploy
```

### Mobile Deployment (Expo)
```bash
expo build:android
expo build:ios
```

## 📞 Support

- Create issues for bugs and feature requests
- Join our Discord community: [link]
- Email: support@galeguia.com

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.