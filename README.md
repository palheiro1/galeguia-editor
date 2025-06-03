# Galeguia Editor

Galeguia Editor is a cross-platform course creation and management application built with React Native and Expo. It allows content creators to create, organize, and manage educational courses with a structured hierarchy of courses, modules, and lessons.

## 🚀 Features

- **Cross-Platform**: Works on Web, iOS, and Android from a single codebase
- **Authentication**: Secure email/password authentication with Supabase
- **Role-Based Access**: Different permissions for admin and creator roles
- **Course Management**:
  - Create and edit courses with title, description, and cover image
  - Publish/unpublish courses
  - Organize courses in a hierarchical structure
- **Module Management**:
  - Add modules to courses with proper positioning
  - Reorder modules within a course
- **Lesson Management**:
  - Create different types of lessons (text, video, image, audio)
  - Rich content editing for lessons
  - Media upload and management
  - Proper positioning within modules
- **Page Management**:
  - Create and organize pages within lessons
  - Support for different page types and media content
  - Structured content organization
- **Grains System** (Educational Units):
  - Interactive educational components within pages
  - 5 different grain types: Text to Complete, Test Questions, Images to Guess, Pairs of Text, Pairs of Images
  - Maximum of 15 grains per page
  - Rich content validation and management
  - Position-based ordering system

## 🔧 Tech Stack

- **Frontend**:
  - React Native
  - Expo Framework
  - TypeScript
  - React Navigation

- **Backend/API**:
  - Supabase (PostgreSQL database)
  - Supabase Authentication
  - Supabase Storage for media files

- **Deployment**:
  - Web: GitHub Pages / Netlify
  - Mobile: Expo builds

## 📋 Project Structure

```
galeguia-editor/
├── assets/                 # App icons and images
├── src/
│   ├── components/         # Reusable UI components
│   │   └── Auth.tsx        # Authentication component
│   ├── contexts/           # React contexts
│   │   └── AuthContext.tsx # Authentication context
│   ├── lib/                # Utilities and configuration
│   │   └── supabase.ts     # Supabase client configuration
│   └── screens/            # Application screens
│       ├── CourseListScreen.tsx    # List of courses
│       ├── CourseEditScreen.tsx    # Course creation/editing
│       ├── ModuleEditScreen.tsx    # Module creation/editing
│       ├── LessonEditScreen.tsx    # Lesson creation/editing
│       ├── PageEditScreen.tsx      # Page creation/editing
│       └── GrainEditScreen.tsx     # Grain creation/editing
├── static/                 # Static files for web deployment
├── App.tsx                 # Main application component
├── app.json                # Expo configuration
└── package.json            # Dependencies and scripts
```

## 🏗️ Database Schema

The application uses the following Supabase tables:

- **profiles**: User profiles with roles
- **courses**: Course information
- **modules**: Course modules with position ordering
- **lessons**: Module lessons with content and media
- **pages**: Individual pages within lessons
- **grains**: Interactive educational units within pages (5 types supported)

## 🛠️ Setup and Installation

### Prerequisites

- Node.js (v18.x recommended)
- npm or yarn
- Expo CLI
- Supabase account

### Environment Variables

Create a `.env` file with the following variables:

```
EXPO_PUBLIC_SUPABASE_URL=your_supabase_url
EXPO_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
```

### Installation Steps

1. Clone the repository:
   ```bash
   git clone https://github.com/yourusername/galeguia-editor.git
   cd galeguia-editor
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Start the development server:
   ```bash
   npm start
   ```

4. Choose your platform:
   - Press `w` for web
   - Press `a` for Android
   - Press `i` for iOS

## 🚢 Deployment

### Web Deployment

The project is configured for deployment to GitHub Pages or Netlify:

```bash
# Build the web version
npm run build:web

# Deploy to GitHub Pages
npm run deploy
```

### Mobile Deployment

For mobile deployment, follow the Expo build process:

```bash
expo build:android
expo build:ios
```

## 🧑‍💻 Development Workflow

1. Create and test features locally
2. Build the web application
3. Deploy to GitHub Pages or Netlify
4. Test on mobile devices using Expo Go

## 🔐 Authentication Flow

1. User registration with email/password
2. Email verification
3. User login
4. Token refresh and persistence

## 🙋‍♂️ User Roles

- **Creator**: Can create and manage their own courses, modules, and lessons
- **Admin**: Has full access to all courses in the system

## ⚡ Performance

The application is optimized for:
- Fast loading times
- Responsive UI across devices
- Efficient data fetching

## 🔒 Security

- Secure authentication via Supabase
- User data protection
- Role-based access control

## 🙏 Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## 📄 License

This project is licensed under the MIT License - see the LICENSE file for details.

## 📞 Contact

For any questions or feedback, please reach out to the project maintainers.