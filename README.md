# 3D Multiplayer Web Game

A real-time 3D multiplayer web game built with React, Three.js, and Colyseus.

## Tech Stack

- **3D Engine**: Three.js (via react-three-fiber and react-three-drei)
- **UI/UX**: React + Tailwind CSS + Zustand for state management
- **Multiplayer**: Colyseus (Node.js)
- **Database**: Supabase

## Project Structure

```
project-root/
├── client/           # React frontend
│   ├── src/
│   │   ├── components/  # React components
│   │   │   ├── UI/      # User interface components
│   │   │   ├── Player.js # Player 3D model
│   │   │   └── Ground.js # 3D environment
│   │   ├── hooks/       # Custom React hooks
│   │   ├── store/       # Zustand state management
│   │   └── lib/         # Utility libraries
│   └── public/
└── server/           # Colyseus server
    ├── rooms/        # Game room definitions
    └── index.js      # Server entry point
```

## Setup Instructions

### Prerequisites

- Node.js (v14+ recommended)
- npm or yarn

### Environment Setup

1. **Client Setup**
   ```bash
   cd client
   npm install
   ```

2. **Server Setup**
   ```bash
   cd server
   npm install
   ```

3. **Supabase Configuration**

   Create a `.env` file in the client directory:
   ```
   REACT_APP_SUPABASE_URL=your-supabase-url
   REACT_APP_SUPABASE_ANON_KEY=your-public-key
   ```

## Running the Application

1. **Start the Colyseus Server**
   ```bash
   cd server
   npm run dev
   ```

2. **Start the React Client**
   ```bash
   cd client
   npm start
   ```

3. Open your browser and navigate to `http://localhost:3000`

## Game Controls

- **W/↑**: Move forward
- **S/↓**: Move backward
- **A/←**: Move left
- **D/→**: Move right
- **Q**: Rotate left
- **E**: Rotate right

## Development Notes

- The Colyseus server runs on port 2567 by default
- The React application runs on port 3000 by default
- Make sure both server and client are running for multiplayer functionality
