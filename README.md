# Galeguia Course Editor

A web-based application for course creators and administrators to manage educational content. Built with Expo (React Native for Web) and Supabase.

## Features

- User authentication with role-based access (admin and creator roles)
- Course management (create, edit, delete)
- Module management within courses
- Lesson management within modules
- Media upload for lesson content (text, image, video, audio)
- Course publishing functionality (admin only)

## Tech Stack

- Frontend: Expo (React Native for Web), TypeScript
- Backend: Supabase (PostgreSQL, Authentication, Storage)
- Deployment: GitHub Pages

## Getting Started

1. Clone the repository
2. Install dependencies: `npm install`
3. Run the development server: `npm start`
4. For web deployment: `npm run deploy`

## Environment Setup

Create a `.env` file with the following variables:
```
EXPO_PUBLIC_SUPABASE_URL=your-supabase-url
EXPO_PUBLIC_SUPABASE_ANON_KEY=your-supabase-anon-key
```