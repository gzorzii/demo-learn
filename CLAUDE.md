# Bookstores

## Project

Esse é um projeto para um sistema de avaliação de performace dos funcionarios da empresa.

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
│   ├── build.gradle
│   └── src/main/java/com/ciet/demo_learn/
│       ├── controller/
│       ├── service/
│       ├── repository/
│       ├── model/
│       ├── dto/
│       ├── exception/
│       ├── config/
│       └── DemoLearnApplication.java
└── frontend/
    └── src/
        ├── components/
        ├── hooks/
        ├── pages/
        ├── services/
        ├── types/
        ├── App.tsx
        └── main.tsx
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
