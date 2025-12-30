# 🌍 Lang Web App

A modern language learning web application with AI-powered sentence analysis, vocabulary decks, and progress tracking.

## ✨ Features

- **🎯 CEFR-Based Learning** - Personalized content for levels A1 to C2
- **🤖 AI Sentence Analysis** - Get feedback on your sentences in your native language
- **⭐ Star Rating System** - Track your progress with 1-5 star ratings
- **📚 Vocabulary Decks** - Create and study custom flashcard decks
- **🌐 Multi-Language Support** - Learn 12+ languages
- **📊 Progress Tracking** - Visual progress bars and statistics

## 🚀 Getting Started

### Prerequisites
- Node.js 18+
- Supabase account
- Google Gemini API key

### Installation

1. Clone the repository:
   ```bash
   git clone https://github.com/YOUR_USERNAME/lang-web-app.git
   cd lang-web-app
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Set up environment variables:
   ```bash
   cp .env.example .env.local
   ```
   Then edit `.env.local` with your credentials.

4. Set up Supabase:
   - Create a new Supabase project
   - Run the SQL files in order:
     - `supabase-schema.sql`
     - `supabase-migration-profiles.sql`
     - `supabase-migration-language.sql`
     - `supabase-migration-progress.sql`

5. Run the development server:
   ```bash
   npm run dev
   ```

## 🛠️ Tech Stack

- **Frontend:** React 19, TypeScript, Vite
- **Styling:** Vanilla CSS with Glassmorphism
- **Animation:** Framer Motion
- **Backend:** Supabase (Auth, Database, Storage)
- **AI:** Google Gemini API
- **Icons:** Lucide React

## 📁 Project Structure

```
lang-web-app/
├── components/       # React components
├── services/         # API services (Supabase, Gemini)
├── contexts/         # React contexts (Auth)
├── types.ts          # TypeScript types
├── App.tsx           # Main app component
└── supabase-*.sql    # Database migrations
```

## 📝 License

MIT License - feel free to use this project for learning or building your own apps!
