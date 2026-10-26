# ZyGENE - Agritech Crop Lifecycle Tracking & Phenotyping Platform

ZyGENE is an end-to-end Agritech Crop Lifecycle Tracking and Phenotyping Platform connecting on-field farming operations with scientific plant breeding and agricultural research.

For detailed architecture diagrams, database schemas, REST API documentation, and mobile workflows, see:
👉 **[PROJECT_OVERVIEW.md](./PROJECT_OVERVIEW.md)**

---

## 🌾 Core Features

### 🚜 For Farmers
* **Field Management:** Register geographic fields with area, soil type, and location coordinates.
* **Crop Lifecycle Tracking:** Track crops across chronological growth stages (seed sowing, germination, seedling, vegetative, flowering, fruiting, maturity, harvest).
* **On-Field Record Logging:** Log growth measurements, native camera field photos, irrigation schedules, fertilizer/pesticide treatments, and pest/disease scouting.
* **Harvest Production:** Log harvest batches, total yield, calculated yield-per-area, and quality grading.

### 🔬 For Breeders & Researchers
* **Breeding Programs & Crosses:** Create multi-year breeding initiatives and trace parent genotypes across filial generations.
* **Trial Management:** Conduct on-field variety trials and evaluate performance across environments.
* **Phenotypic Observations:** Record quantitative observations, resistance ratings, and growth metrics.
* **Breeder Analytics Engine:** 7 analytical endpoints including variety comparisons, growth duration analysis, disease occurrence tracking, and composite scoring.

---

## 🛠️ Technology Stack

* **Backend:** Node.js, Express 5 REST API
* **Database:** PostgreSQL (with MySQL compatibility translation layer)
* **Mobile App:** React Native, Expo SDK 57, Expo Router, Axios, AsyncStorage
* **Authentication:** Stateless JWT bearer tokens with bcrypt password hashing

---

## 🚀 Quick Start

### 1. Database Setup (PostgreSQL / pgAdmin)
1. In pgAdmin, create a database named `zygene`.
2. Open the Query Tool on `zygene`.
3. Open and run `backend/zygene_pgadmin_setup.sql` (or root `zygene_pgadmin_setup.sql`) to initialize all 15 tables, indexes, constraints, and seed data.

### 2. Backend Setup
```bash
cd backend
npm install
```

Create a `backend/.env` file with your credentials:
```env
PORT=4000
DB_HOST=localhost
DB_USER=postgres
DB_PASSWORD=your_password
DB_NAME=zygene
DB_PORT=5432
JWT_SECRET=your_jwt_secret_key
```

Run tests or start the server:
```bash
# Run automated feature tests
node scripts/test_all_features.js

# Start API server
npm start
```

### 3. Mobile App Setup
```bash
cd mobile
npm install
npx expo start
```