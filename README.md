# AI Content Platform 🚀

AI Content Platform; **Next.js + Tailwind CSS** ile geliştirilmiş modern bir frontend ve  
**Node.js (Express) + MongoDB** tabanlı ölçeklenebilir bir backend içeren full-stack bir web uygulamasıdır.

Amaç; yapay zeka destekli içerik üretimi, yönetimi ve sunumunu tek bir platform altında toplamaktır.

---

## 🧱 Proje Mimarisi

```text
ai-content-platform/
├── backend/
│   ├── src/
│   │   ├── config/        # DB, env, app config
│   │   ├── controllers/  # Request handlers
│   │   ├── services/     # Business logic
│   │   ├── models/       # Mongoose schemas
│   │   ├── middleware/   # Auth, error handling
│   │   ├── routes/       # API routes
│   │   └── utils/        # Helper functions
│   ├── server.js
│   ├── .env.example
│   └── package.json
│
├── frontend/
│   ├── src/
│   │   ├── app/          # Next.js App Router
│   │   ├── components/  # Reusable UI components
│   │   ├── services/    # API / axios services
│   │   └── utils/       # Helpers
│   ├── public/
│   ├── tailwind.config.mjs
│   ├── postcss.config.mjs
│   └── package.json
│
├── database/
│   ├── migrations/
│   ├── seeds/
│   └── init.sql
│
├── docker-compose.yml
└── README.md
Kullanılan Teknolojiler
+ Frontend
+ Next.js (App Router)

+ React

+ Tailwind CSS v4

+ PostCSS

+ TypeScript

+ Backend
+ Node.js

+ Express

+ MongoDB + Mongoose

+ dotenv

+ CORS

+ DevOps
+ Docker & Docker Compose

+ Git

Kurulum
+ Repoyu klonla
git clone https://github.com/your-username/ai-content-platform.git
cd ai-content-platform
+ Backend’i çalıştır
cd backend
npm install
npm run dev
+ Frontend’i çalıştır
cd frontend
npm install
npm run dev

Özellikler (Planlanan)
+ JWT tabanlı authentication

+ AI içerik üretimi entegrasyonu

+ İçerik CRUD işlemleri

+ Dark / Light mode

+ Dashboard & analytics

+ Docker ile tek komut deploy

Geliştirme Notları
+ Backend clean architecture prensipleriyle tasarlanmıştır

+ Frontend component-based yapıdadır

+ API çağrıları services/ altında toplanır

+ Proje ölçeklenebilir ve production-ready olacak şekilde planlanmıştır

docker-compose down
docker-compose up -d
