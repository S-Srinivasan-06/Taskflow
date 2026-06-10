# Taskflow

Taskflow is a web application designed to manage tasks efficiently. It features a Spring Boot backend and a React/TypeScript frontend powered by Vite and Tailwind CSS.

## Features
- **Task Management**: CRUD operations on tasks with title, description, priority, category, and status.
- **Quick Filtering**: Filter by priority, status, category, and due dates.
- **Responsive UI**: Sleek layout with modern dark/light mode styles.

## Tech Stack
- **Backend**: Java 21, Spring Boot 3.5.x, Spring Data JPA, PostgreSQL (or H2 in-memory/file-based fallback)
- **Frontend**: React 18, TypeScript, Vite, Tailwind CSS, Radix UI

## Getting Started

### Run with Docker (Recommended)
1. Copy `.env.example` to `.env` and configure your database parameters.
2. Build and run containers:
   ```bash
   docker-compose up --build
   ```
3. Open `http://localhost:5173` in your browser.

### Local Development

#### Prerequisites
- JDK 21
- Node.js (v20+)
- PostgreSQL

#### Running the Backend
1. Set up a local PostgreSQL database.
2. Configure database credentials in `src/main/resources/application.properties` or environment variables.
3. Run the Spring Boot application:
   ```bash
   ./mvnw spring-boot:run
   ```

#### Running the Frontend
1. Navigate to the `frontend` folder:
   ```bash
   cd frontend
   ```
2. Install dependencies:
   ```bash
   npm install
   ```
3. Run the dev server:
   ```bash
   npm run dev
   ```
