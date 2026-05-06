# Bookstores

## Project

Web-based management system for bookstores and used bookstores. Supports book registration with images, per-branch stock control, label printing, POS with discounts and multiple payment methods, trade-in vouchers, used book purchases, customer wishlists, shelf time tracking, and reports. Multi-branch with role-based access (Administrator, Manager, Catalog, Cashier).

## Stack

**Backend**
- Java 25
- Spring Boot 4.0.6
- Gradle 9.4.1
- Spring Security + OAuth2 Resource Server
- Spring Validation
- PostgreSQL 18
- Base package: `com.ciet.demo_learn`

**Frontend**
- React 19.2.5
- TypeScript 6.0.2
- Vite 8.0.10

## Critical directories

```
src/
├── backend/
│   ├── build.gradle                         # dependencies and toolchain
│   ├── src/main/java/com/ciet/demo_learn/   # source code
│   └── src/main/resources/                  # application.properties
└── frontend/
    └── src/                                 # components, pages, services
```

## Commands

**Backend** (`cd src/backend`):
```bash
./gradlew build        # compile
./gradlew bootRun      # run — http://localhost:8080
./gradlew test         # run all tests
./gradlew clean        # clear build output
```

**Frontend** (`cd src/frontend`):
```bash
npm run dev            # run — http://localhost:5173
npm run build          # production build
```
