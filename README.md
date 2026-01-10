# 🎢 Theme Park Analytics

A sophisticated analytics platform for Disney and Universal theme parks, providing real-time wait times, historical insights, and personalized visit recommendations.

## 🌟 Features

- **Real-Time Data**: Live wait times and ride statuses updated every 5 minutes
- **Historical Analytics**: Discover the best times to visit based on crowd patterns and trends
- **Smart Planning**: Get personalized itineraries optimized to minimize wait times
- **Heatmap Visualization**: Visual representation of park crowding
- **All Parks**: Supports all Disney and Universal parks worldwide

## 🚀 Getting Started

### Prerequisites

- Node.js 18+ (or Bun)
- PostgreSQL database (for production data collection)
- npm, pnpm, or bun

### Installation

1. **Navigate to the project directory:**

   ```bash
   cd /Users/braydoncoyer/Development/personal/theme-park-analytics
   ```

2. **Install dependencies** (already done, but for future reference):

   ```bash
   npm install
   ```

3. **Run the development server:**

   ```bash
   npm run dev
   ```

4. **Open your browser:**

   Navigate to `http://localhost:4321`

### Available Scripts

- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm run preview` - Preview production build
- `npm run astro` - Run Astro CLI commands

## 📂 Project Structure

```
theme-park-analytics/
├── src/
│   ├── components/      # UI components (Astro & React)
│   │   ├── layout/      # Header, Footer, Navigation
│   │   ├── dashboard/   # Dashboard components
│   │   ├── park-detail/ # Park detail page components
│   │   ├── analytics/   # Analytics & charts
│   │   ├── heatmap/     # Heatmap visualization
│   │   ├── plan-wizard/ # Plan creation wizard
│   │   └── ui/          # Base UI components (Button, Card, Badge)
│   ├── layouts/         # Page layouts
│   ├── pages/           # Routes & pages
│   │   ├── index.astro  # Homepage
│   │   ├── parks/       # Park pages
│   │   ├── analytics/   # Analytics pages
│   │   ├── plan/        # Plan wizard
│   │   └── api/         # API endpoints
│   ├── lib/             # Utilities & logic
│   │   ├── api/         # API clients
│   │   ├── analytics/   # Analytics calculations
│   │   ├── utils/       # Utility functions
│   │   └── types/       # TypeScript types
│   ├── styles/          # Global styles
│   └── data/            # Static data (park coordinates)
├── scripts/             # Background scripts
│   └── collect-data.ts  # Data collection cron job
├── db/                  # Database
│   └── schema.sql       # Database schema
└── public/              # Static assets
```

## 🎨 Design System

The project uses a **Refined Data Intelligence** aesthetic:

- **Light theme** with clean, professional styling
- **Typography**: Inter (body) + Cabinet Grotesk (display)
- **Colors**: Soft blues and teals with semantic crowd indicators
- **Components**: Card-based layouts with subtle shadows
- **Animations**: Gentle fades and transitions

Design tokens are defined in `src/styles/variables.css`.

## 📊 Data Collection

The project fetches data from the [Queue-Times.com API](https://queue-times.com/).

### Setting Up Data Collection (Future)

1. **Set up PostgreSQL database**:

   Create a database and run the schema:

   ```bash
   psql -d your_database < db/schema.sql
   ```

2. **Configure environment variables**:

   Create a `.env` file:

   ```
   DATABASE_URL=postgresql://user:password@localhost:5432/theme_parks
   ```

3. **Test the data collection script**:

   ```bash
   npm run ts-node scripts/collect-data.ts
   ```

4. **Set up Vercel Cron** (when deployed):

   Add to `vercel.json`:

   ```json
   {
     "crons": [{
       "path": "/api/collect",
       "schedule": "*/10 * * * *"
     }]
   }
   ```

## 🛠 Tech Stack

- **Framework**: [Astro](https://astro.build/) 4.x
- **UI Library**: React 18+ (islands architecture)
- **Styling**: CSS Modules + CSS Variables
- **Data Viz**: Recharts + D3.js
- **Database**: PostgreSQL
- **Deployment**: Vercel (recommended)
- **API**: Queue-Times.com REST API

## 🗺 Roadmap

### Phase 1: Foundation ✅
- [x] Project setup
- [x] Design system
- [x] Base components
- [x] API integration
- [x] Database schema

### Phase 2: Dashboard (In Progress)
- [ ] Homepage with live data
- [ ] Park detail pages
- [ ] Real-time wait times
- [ ] Filterable ride lists

### Phase 3: Analytics
- [ ] Historical data aggregation
- [ ] Trend visualizations
- [ ] Best times to visit
- [ ] Crowd predictions

### Phase 4: Plan Wizard
- [ ] Multi-step wizard
- [ ] Itinerary generation
- [ ] Optimization algorithm
- [ ] Session storage

### Phase 5: Heatmaps
- [ ] Simplified park maps
- [ ] Heatmap visualization
- [ ] Interactive markers

### Phase 6: Polish
- [ ] Performance optimization
- [ ] SEO & metadata
- [ ] Accessibility
- [ ] Edge case handling

## 🤝 Contributing

This is a personal project, but suggestions and feedback are welcome!

## 📝 License

This project is for educational purposes. All park data is provided by Queue-Times.com.

## 🙏 Attribution

Data powered by [Queue-Times.com](https://queue-times.com)

---

**Built with ❤️ using Astro, React, and TypeScript**
