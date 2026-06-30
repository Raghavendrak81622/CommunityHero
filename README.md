# 🛡️ Community Hero

**Community Hero** is a premium, minimalist, and highly responsive civic warning database designed to connect residents with their local municipalities. Inspired by Apple and Nike's light-themed design languages, it features high-contrast typography, clean inputs, and interactive GIS mapping to make reporting local infrastructure issues quick and seamless.
---

## ✨ Key Features

### ⚡ Live Action Stream
Dynamic dashboard sidebar loading the latest 2 reported problems from Firestore in real-time.

### 🧠 AI Smart Search
Natural language search powered by the Gemini API, automatically translating queries (e.g., *"urgent potholes near me"*) into structured filters.

### 🗺️ Interactive GIS Map
Custom Leaflet map view with dynamic clustering of reported issue markers based on priority levels (Critical, High, Medium, Low).

### 💬 Threaded Civic Conversations
Deep discussion threads on issues with reply nesting, comment upvotes, and real-time email-style notification dispatch alerts.

### 👍 Persistent Upvotes
Community members can upvote critical local issues to help shape municipal scheduling priorities.

### 🎨 Modern Responsive Design
Complete light theme leveraging **Outfit** & **Plus Jakarta Sans** typography, border-less rounded cards, and smooth micro-animations.

---

## 🚀 Setup & Installation

### Prerequisites
Make sure you have [Node.js](https://nodejs.org/) installed (v18+ recommended).

### 1. Clone the Repository
```bash
git clone <your-repository-url>
cd CommunityHero
```

### 2. Install Dependencies
Navigate into the `frontend` directory and install the project dependencies:
```bash
cd frontend
npm install
```

### 3. Environment Configuration
Create a `.env` file in the `frontend` folder using the provided template:
```bash
cp .env.example .env
```
Fill in the following credentials. Keep `.env` local only and never commit real keys:
```env
VITE_FIREBASE_API_KEY=your_firebase_api_key
VITE_FIREBASE_AUTH_DOMAIN=your_firebase_auth_domain
VITE_FIREBASE_PROJECT_ID=your_firebase_project_id
VITE_FIREBASE_STORAGE_BUCKET=your_firebase_storage_bucket
VITE_FIREBASE_MESSAGING_SENDER_ID=your_firebase_messaging_sender_id
VITE_FIREBASE_APP_ID=your_firebase_app_id
VITE_FIREBASE_MEASUREMENT_ID=your_firebase_measurement_id
VITE_GEMINI_API_KEY=your_gemini_api_key
```

If an API key is ever committed or exposed, revoke or rotate it in the provider console before creating a replacement.

### 4. Running the Development Server
Launch the application locally in development mode:
```bash
npm run dev
```
Open your browser and navigate to `http://localhost:5173/` (or the port specified in terminal).

### 5. Building for Production
To build the application for deployment:
```bash
npm run build
```
This outputs optimized, static bundle assets into the `dist/` directory.

---

## 🛠️ Technology Stack

- **Frontend**: React (Vite), Tailwind CSS v4, Lucide Icons, Leaflet Maps
- **Backend & Database**: Firebase Firestore (NoSQL), Firebase Authentication
- **AI Analysis**: Gemini Flash API (via `@google/generative-ai`)
