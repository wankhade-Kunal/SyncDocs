# SyncDocs - Real-Time Collaborative Document Editor

A production-quality full-stack application for real-time collaborative document editing. Built with React 18, Node.js, Socket.io, and MongoDB.

## Features

✨ **Real-Time Collaboration**
- Multiple users editing simultaneously
- Operational Transformation (OT) for conflict resolution
- Live cursor positions with collaborator avatars

📝 **Rich Text Editing**
- Quill.js rich text editor
- Bold, italic, underline, code, quotes
- Headings, lists, images, links

👥 **Sharing & Permissions**
- Invite collaborators by email
- Role-based access (Editor / Viewer)
- Public sharing with share tokens
- Collaborator management

📋 **Version History**
- Automatic version snapshots
- Manual version labeling
- Restore to any previous version
- View version metadata

🎨 **Modern Dark UI**
- Google Docs-like design
- Dark mode support
- Smooth animations and transitions
- Fully responsive (mobile-friendly)

## Tech Stack

- **Frontend**: React 18, Vite, React Router, Quill.js, Socket.io-client, Axios
- **Backend**: Node.js, Express, Socket.io
- **Database**: MongoDB (Atlas or local)
- **Authentication**: JWT + bcryptjs
- **Deployment**: Vercel (frontend) + Railway/Render (backend)

## Project Structure

```
syncdocs/
├── server/                    # Node.js + Express backend
│   ├── models/               # MongoDB schemas (User, Document, Version)
│   ├── routes/               # REST API routes (auth, documents, versions)
│   ├── middleware/           # Auth middleware
│   ├── socket/               # Socket.io real-time engine
│   ├── index.js              # Server entry point
│   └── package.json
│
└── client/                    # React + Vite frontend
    ├── src/
    │   ├── pages/            # Login, Register, Dashboard, Editor
    │   ├── components/       # Reusable UI components
    │   ├── hooks/            # Custom React hooks
    │   ├── context/          # React Context (Auth)
    │   ├── api/              # Axios API calls
    │   ├── App.jsx
    │   └── main.jsx
    ├── index.html
    └── package.json
```

## Setup Instructions

### Prerequisites

- Node.js 16+ and npm
- MongoDB (local or Atlas)
- Git

### Backend Setup

1. **Navigate to server directory**
   ```bash
   cd server
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Create .env file**
   ```bash
   cp .env.example .env
   ```

4. **Configure environment variables** (edit `.env`):
   ```
   MONGO_URI=mongodb://localhost:27017/syncdocs
   JWT_SECRET=your_super_secret_key_change_this_in_production
   PORT=5000
   CLIENT_URL=http://localhost:5173
   NODE_ENV=development
   ```

   **For MongoDB Atlas:**
   ```
   MONGO_URI=mongodb+srv://username:password@cluster.mongodb.net/syncdocs
   ```

5. **Start server**
   ```bash
   npm run dev
   ```

   The server will run at `http://localhost:5000`

### Frontend Setup

1. **Open new terminal, navigate to client directory**
   ```bash
   cd client
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Create .env file** (optional, already configured)
   ```bash
   cp .env.example .env
   ```

4. **Start development server**
   ```bash
   npm run dev
   ```

   The frontend will run at `http://localhost:5173`

### MongoDB Setup

**Option 1: Local MongoDB**
```bash
# Make sure MongoDB is running
mongod
```

**Option 2: MongoDB Atlas (Cloud)**
1. Create account at https://www.mongodb.com/cloud/atlas
2. Create free cluster
3. Get connection string and add to `.env`

## How to Test Real-Time Sync

1. Open two browser tabs (or windows) at `http://localhost:5173`
2. Login with the same account in both tabs
3. Open the same document in both
4. Start typing in one tab - changes appear **instantly** in the other
5. Test cursor tracking, presence avatars, and collaboration

## Default Test Credentials

The app starts with demo mode ready. You can:
1. Register a new account with any email/password
2. Create multiple accounts to test collaboration

## API Endpoints

### Authentication
- `POST /api/auth/register` - Register new user
- `POST /api/auth/login` - Login user

### Documents
- `GET /api/documents` - Get all user's documents
- `POST /api/documents` - Create new document
- `GET /api/documents/:id` - Load specific document
- `PATCH /api/documents/:id` - Update document title
- `DELETE /api/documents/:id` - Delete document
- `POST /api/documents/:id/share` - Invite collaborator
- `POST /api/documents/:id/link` - Generate public link
- `DELETE /api/documents/:id/collaborators/:userId` - Remove access

### Versions
- `GET /api/documents/:id/versions` - List versions
- `POST /api/documents/:id/versions` - Save version
- `POST /api/documents/:id/versions/restore/:vId` - Restore version

## Socket.IO Events

### Client → Server
- `join-document` - Join editing session
- `send-delta` - Send text changes
- `cursor-move` - Update cursor position
- `save-version` - Save manual version

### Server → Client
- `load-document` - Initial document state
- `receive-delta` - Incoming text changes
- `presence-update` - Active collaborators
- `version-saved` - Version save confirmation

## Operational Transformation (OT)

The server implements OT for conflict-free concurrent editing:

1. **Versioning**: Each document has a revision counter
2. **Delta Transformation**: Concurrent edits are transformed against each other
3. **Tiebreaking**: When two users insert at same position, sorted by userId
4. **Auto-save**: Document saves to MongoDB after 2 seconds of inactivity

## Production Deployment

### Frontend (Vercel)

1. Push client to GitHub
2. Connect repo to Vercel
3. Set env variable: `VITE_API_URL=<your-backend-url>`
4. Deploy

### Backend (Railway or Render)

1. Push server to GitHub
2. Connect repo to Railway/Render
3. Set environment variables:
   - `MONGO_URI`
   - `JWT_SECRET` (use strong random string)
   - `CLIENT_URL` (your Vercel URL)
4. Deploy

### Environment Variables for Production

```
MONGO_URI=mongodb+srv://user:pass@cluster.mongodb.net/syncdocs
JWT_SECRET=<use_strong_random_string_here>
PORT=5000
CLIENT_URL=https://your-frontend-url.vercel.app
NODE_ENV=production
```

## Performance Optimization

- **WebSocket**: Real-time sync over persistent connection
- **Debouncing**: Auto-save after 2 seconds of inactivity
- **Lazy Loading**: Documents load on demand
- **Compression**: Socket.io auto-compresses messages
- **Indexing**: MongoDB indexes on document owner and collaborators

## Security Features

- ✅ JWT authentication on all protected routes
- ✅ Password hashing with bcryptjs
- ✅ Access control (owner/collaborator checks)
- ✅ CORS enabled for frontend origin only
- ✅ Socket.io authentication verification

## Browser Support

- Chrome 90+
- Firefox 88+
- Safari 14+
- Edge 90+

## Troubleshooting

### "Cannot connect to MongoDB"
- Ensure MongoDB is running or Atlas connection string is correct
- Check `MONGO_URI` in `.env`

### "Socket connection failed"
- Verify backend is running on port 5000
- Check `CLIENT_URL` in server `.env` matches frontend origin

### "Styles not loading"
- Clear browser cache (Ctrl+Shift+Delete)
- Restart dev server

### Real-time sync not working
- Check browser console for errors
- Verify Socket.io connection in DevTools Network tab
- Ensure both tabs have valid JWT tokens

## Development Commands

**Backend:**
```bash
npm run dev     # Start with nodemon (auto-restart)
npm start       # Start production server
```

**Frontend:**
```bash
npm run dev     # Start Vite dev server
npm run build   # Build for production
npm run preview # Preview production build
```

## Next Steps & Enhancements

- [ ] Add rich text formatting toolbar
- [ ] Implement comments & mentions
- [ ] Add document templates
- [ ] Full-text search with MongoDB Atlas Search
- [ ] Real-time notifications
- [ ] Document export (PDF, Word)
- [ ] Undo/redo functionality
- [ ] Mobile apps (React Native)

## License

MIT

## Author

Built as a production-quality SDE resume project.

---

**Happy collaborating! 🚀**

For issues or questions, open an issue on GitHub.
