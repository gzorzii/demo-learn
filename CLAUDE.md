# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project

Spring Boot 4.0.6 / Java 25 / Gradle 9.4.1 learning project. Base package: `com.ciet.demo_learn`.

**Goal:** serve a single HTML page via Spring Boot (Thymeleaf or static resource) that allows the user to log in with their Google account using OAuth2 via Spring Security. Spring Boot handles the OAuth2 flow — no separate frontend build step.

## Commands

```bash
./gradlew build        # compile
./gradlew bootRun      # run the application
./gradlew test         # run all tests
./gradlew clean        # clear build output
```

To run a single test class:
```bash
./gradlew test --tests "com.ciet.demo_learn.DemoLearnApplicationTests"
```

## Architecture

Bare Spring Boot skeleton — no controllers, services, or persistence yet. Two source files exist:

- `src/main/java/com/ciet/demo_learn/DemoLearnApplication.java` — `@SpringBootApplication` entry point
- `src/test/java/com/ciet/demo_learn/DemoLearnApplicationTests.java` — context-load smoke test
- `src/main/resources/application.properties` — only sets `spring.application.name=demo-learn`

New code should follow standard Spring Boot layering: controllers in `controller/`, services in `service/`, repositories in `repository/`, models/entities in `model/` — all under `com.ciet.demo_learn`.

## Coding Agent

For all Java and Spring Boot code in this project, follow the standards defined in the sub-agent:

- [`.claude/agents/java-spring-developer.md`](.claude/agents/java-spring-developer.md)