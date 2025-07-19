# Interview Platform

A modern web-based interview platform built with Next.js, Prisma, NextAuth, WebRTC, and SQLite. This full-featured app provides seamless scheduling, joining, and conducting of technical coding interviews with integrated video calls, real-time collaboration, and session management.

---

## Table of Contents

- [Project Overview](#project-overview)
- [Features](#features)
- [Tech Stack](#tech-stack)
- [System Requirements](#system-requirements)
- [Getting Started](#getting-started)
- [Environment Variables](#environment-variables)
- [Database](#database)
- [API Routes](#api-routes)
- [Folder Structure](#folder-structure)
- [Usage](#usage)
- [Contributing](#contributing)
- [License](#license)

---

## Project Overview

This interview platform allows users to create and manage interview sessions, invite participants, and conduct live technical interviews with video and code collaboration features.

- **Authentication with NextAuth** supporting OAuth providers like Google
- **Session and invitation management** with Prisma ORM and SQLite database
- **Interview dashboard** to create, join, and manage interview sessions
- **Join using 6-digit join codes or invitation tokens**
- **Real-time video calls and code collaboration** powered by WebRTC and WebSocket (socket.io)
- **User roles and permissions** for hosts and participants
- Custom UI components designed with accessibility and responsiveness in mind

---

## Features

- ✅ User authentication (Google OAuth)
- ✅ Create interview sessions with title, description, participant email
- ✅ Auto-generated unique session room IDs and join codes
- ✅ Send email invitations automatically
- ✅ Secure access based on roles and join codes or invite tokens
- ✅ Join interview sessions via join code or invitation link
- ✅ Dashboard to see all your active and past interviews
- ✅ Delete interview sessions (host only)
- ✅ Copy join code with one click
- ✅ View session status and participants
- 🔄 Start, pause, and end interviews with status management
- 🔄 Real-time chat, code editor, and video call integration

---

## Tech Stack

- **Frontend**: React, Next.js (App Router)
- **Backend**: Node.js, Next.js API routes
- **Authentication**: NextAuth.js (OAuth, session management)
- **Database**: SQLite with Prisma ORM
- **Real-time**: WebRTC for video, socket.io for WebSocket signaling
- **UI Components**: Radix UI, Framer Motion
- **Styling**: Tailwind CSS, lucide-react icons
- **Language**: TypeScript
- **Code Editor**: Monaco Editor (VS Code editor)

---

## System Requirements

- Node.js (version 18 or higher)
- npm, yarn, pnpm, or bun
- SQLite (included as file `dev.db`)

---

## Getting Started

1. **Clone the repository**

   ```bash
   git clone <repository-url>
   cd interview-platform
   ```

2. **Install dependencies**

   ```bash
   npm install
   # or
   yarn install
   # or
   pnpm install
   ```

3. **Set up environment variables**

   Copy `.env.local.example` to `.env.local` and fill in your secrets (see [Environment Variables](#environment-variables) below).

4. **Initialize the database**

   Generate Prisma client and set up the database:

   ```bash
   npx prisma generate
   npx prisma db push
   ```

5. **Run the development server**

   ```bash
   npm run dev
   # or
   yarn dev
   # or
   pnpm dev
   ```

6. **Open in browser**

   Navigate to [http://localhost:3000](http://localhost:3000) to see the application.

---

## Environment Variables

Create a `.env.local` file in the root directory with the following variables:

```env
# NextAuth Configuration
NEXTAUTH_URL=http://localhost:3000
NEXTAUTH_SECRET=your-nextauth-secret-key
SECRET=your-nextauth-secret-key

# Google OAuth Configuration
# Get these from: https://console.developers.google.com/
GOOGLE_CLIENT_ID=your-google-oauth-client-id
GOOGLE_CLIENT_SECRET=your-google-oauth-client-secret

# Database Configuration - Using SQLite for development
DATABASE_URL="file:./dev.db"

# Socket.io Configuration (optional)
NEXT_PUBLIC_SOCKET_URL=http://localhost:3001
```

### Required Environment Variables:

- `NEXTAUTH_SECRET`: A secure random string for NextAuth session encryption
- `GOOGLE_CLIENT_ID` and `GOOGLE_CLIENT_SECRET`: OAuth credentials from Google Cloud Console
- `DATABASE_URL`: Connection string for SQLite database file

### Setting up Google OAuth:

1. Go to [Google Cloud Console](https://console.developers.google.com/)
2. Create a new project or select an existing one
3. Enable the Google+ API
4. Create OAuth 2.0 credentials
5. Add `http://localhost:3000/api/auth/callback/google` to authorized redirect URIs

---

## Database

The application uses SQLite as the database, managed with Prisma ORM:

- **Database file**: `dev.db` in the project root
- **Schema**: Defined in `prisma/schema.prisma`
- **Key models**:
  - `User`: Authenticated users with Google OAuth
  - `InterviewSession`: Interview sessions with metadata, participants, and settings
  - `Invitation`: Email invitations with tokens and status tracking
  - `ChatMessage`: Messages sent during interview sessions

### Useful Prisma Commands:

```bash
# Generate Prisma client
npx prisma generate

# Push schema changes to database
npx prisma db push

# View database in Prisma Studio
npx prisma studio

# Reset database (caution: deletes all data)
npx prisma db push --force-reset
```

---

## API Routes

- `api/auth/[...nextauth]` - NextAuth authentication routes
- `api/sessions` - CRUD operations for interview sessions
- `api/sessions/join` - Join sessions by code or invite token
- `api/invitations` - Send and manage email invitations
- `api/chat` - Real-time chat messages (future implementation)

---

## Folder Structure

```
src/
├── app/                    # Next.js app directory
│   ├── dashboard/          # Interview dashboard UI
│   ├── interview/[id]/     # Interview session page
│   ├── auth/              # Authentication pages
│   ├── api/               # API route implementations
│   └── globals.css        # Global styles
├── components/            # Reusable UI components
│   ├── ui/               # Base UI components (Button, Card, etc.)
│   └── [feature]/        # Feature-specific components
├── lib/                  # Utility libraries
│   ├── auth.ts          # NextAuth configuration
│   ├── prisma.ts        # Prisma client
│   └── utils.ts         # General utilities
prisma/
├── schema.prisma        # Database schema
└── dev.db              # SQLite database file
```

---

## Usage

### For Interviewers (Hosts):

1. Sign in with your Google account
2. Create a new interview session from the dashboard
3. Fill in session details (title, description, optional participant email)
4. Share the generated join code or invitation link with the participant
5. Start the interview when ready

### For Participants:

1. Receive invitation email or join code from the interviewer
2. Visit the platform and enter the join code or click the invitation link
3. Join the interview session
4. Participate in real-time coding collaboration and video call

### Dashboard Features:

- View all your hosted interviews
- See session status (waiting, active, completed, cancelled)
- Copy join codes to clipboard
- Delete sessions you've created
- Join sessions using join codes

---

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

### Development Workflow:

1. Fork the repository
2. Create a feature branch: `git checkout -b feature-name`
3. Make your changes
4. Run tests and ensure code quality
5. Commit your changes: `git commit -m 'Add feature'`
6. Push to the branch: `git push origin feature-name`
7. Open a Pull Request

### Code Style:

- Follow TypeScript best practices
- Use Tailwind CSS for styling
- Write descriptive commit messages
- Add comments for complex logic

---

## License

This project is licensed under the MIT License. See the LICENSE file for details.

---

## Support

If you encounter any issues or have questions:

1. Check the existing issues on GitHub
2. Create a new issue with detailed information
3. Include steps to reproduce any bugs
4. Provide system information (Node.js version, OS, etc.)

---

*Built with ❤️ using Next.js, Prisma, and modern web technologies.*
