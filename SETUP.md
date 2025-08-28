# Quick Setup Instructions

## 1. Environment Setup
Copy the environment template and fill in your GitHub OAuth app details:
```bash
cp .env.local.example .env.local
```

## 2. Required GitHub OAuth App Settings
Create a GitHub OAuth app with these settings:
- **Authorization callback URL**: `http://localhost:3000/api/auth/callback/github`
- **Requested scopes**: The app will request `read:user repo` scopes

## 3. Required Environment Variables
```env
GITHUB_ID=your_github_client_id
GITHUB_SECRET=your_github_client_secret
NEXTAUTH_SECRET=generate_with_openssl_rand_base64_32
NEXTAUTH_URL=http://localhost:3000
```

## 4. Run the Application
```bash
pnpm install
pnpm dev
```

## 5. Features Available
- ✅ GitHub OAuth authentication
- ✅ Repository dashboard with search and pagination
- ✅ File tree navigation
- ✅ Code viewer with syntax highlighting
- ✅ File download and copy functionality
- ✅ Binary file detection
- ✅ Responsive design
- ✅ Error handling and loading states

## 6. API Routes
- `/api/auth/[...nextauth]` - NextAuth authentication
- `/api/github/repos` - User repositories
- `/api/github/repo-tree` - Repository file tree
- `/api/github/file` - File content

All API routes are server-side only and never expose access tokens to the client.
