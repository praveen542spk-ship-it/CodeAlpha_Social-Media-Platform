# VibeShare ✨ — Premium Social Media Platform

VibeShare is a modern, premium, feature-rich social media web application designed for sharing moments, vibes, code, and collaborative artwork. Built with **Express.js**, **React.js (Vite)**, **Socket.io**, and **MongoDB**, it replicates core Instagram features while offering innovative, unique elements.

---

## 🌟 Key Features

### Core Social Features
*   **User Profiles:** Custom avatars (with premium neon/gold/sunset frame themes), bio description, up to 3 interactive website links, and verification status.
*   **Interactive Feed:** Share text posts, images, videos (with custom duration trim control), and interactive code snippets with live syntax highlighting (VS Code styling).
*   **Comments & Replies:** Fully threaded comment section with options to comment, reply, like comments, and manage comment moderation.
*   **Like & Follow System:** Double-tap on media to like with high-fidelity heart animations. Follow or unfollow creators with real-time feedback.
*   **Explore & Search:** Dynamic explore page with suggested creators, trending posts, and keyword/hashtag search functionality.

### Innovative & Unique Features
*   **🎨 Collaborative Canvas:** Real-time multi-user drawing board using Socket.io. Friends can invite each other, draw together with customizeable brushes/colors, track live cursors, and instantly publish their artwork as a joint feed post.
*   **🔒 Give-to-Get Photo Vault:** A gamified album post directly in the feed. The media is locked until viewers contribute at least one photo of their own, instantly unlocking the full collaborative gallery.
*   **⏳ Time-Capsule Posts:** Create scheduled locked posts that only reveal their media and captions at a specified future date, rendering a live countdown card for viewers.
*   **🍃 Digital Wellbeing (Zen Mode):** Integrated screen time controller that warns users to take a stretch/water break after reaching a specified screen time limit.

---

## 🛠️ Technology Stack

*   **Frontend:** React.js, TailwindCSS (for sleek, premium styling), Lucide React (Icons), Framer Motion (micro-animations), Socket.io-client.
*   **Backend:** Node.js, Express.js, Socket.io (Real-time sync), Multer (File uploads), FFmpeg (Video processing).
*   **Database:** MongoDB Atlas (Mongoose ODM).

---

## 🚀 Setup & Installation

### Prerequisites
*   Node.js (v18+)
*   MongoDB Instance
*   FFmpeg (optional, for video trimming features)

### Backend Configuration
1. Navigate to the backend directory:
   ```bash
   cd backend
   ```
2. Install dependencies:
   ```bash
   npm install
   ```
3. Create a `.env` file in the `backend/` folder:
   ```env
   PORT=5000
   MONGO_URI=your_mongodb_connection_string
   JWT_SECRET=your_jwt_secret_token
   ```
4. Start the backend server:
   ```bash
   npm run dev
   ```

### Frontend Configuration
1. Navigate to the frontend directory:
   ```bash
   cd ../frontend
   ```
2. Install dependencies:
   ```bash
   npm install
   ```
3. Start the Vite dev server:
   ```bash
   npm run dev
   ```
