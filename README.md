<div align="center">

<!-- LOGO -->
<img width="560" height="112" alt="image" src="https://github.com/user-attachments/assets/d815285c-08b5-430d-93a0-1d32fb3d9050" />

<br/>
<br/>

**A sharp, no-nonsense task manager built for people who actually get things done.**

<br/>

[![Java](https://img.shields.io/badge/Java_21-ED8B00?style=for-the-badge&logo=openjdk&logoColor=white)](https://openjdk.org/projects/jdk/21/)
[![Spring Boot](https://img.shields.io/badge/Spring_Boot_3.5-6DB33F?style=for-the-badge&logo=springboot&logoColor=white)](https://spring.io/projects/spring-boot)
[![React](https://img.shields.io/badge/React_18-20232A?style=for-the-badge&logo=react&logoColor=61DAFB)](https://react.dev/)
[![TypeScript](https://img.shields.io/badge/TypeScript-3178C6?style=for-the-badge&logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![PostgreSQL](https://img.shields.io/badge/PostgreSQL-4169E1?style=for-the-badge&logo=postgresql&logoColor=white)](https://www.postgresql.org/)
[![Docker](https://img.shields.io/badge/Docker-2496ED?style=for-the-badge&logo=docker&logoColor=white)](https://www.docker.com/)
[![Vite](https://img.shields.io/badge/Vite-646CFF?style=for-the-badge&logo=vite&logoColor=white)](https://vitejs.dev/)

<br/>
</div>

---

## What is Taskflow?

Taskflow is a full-stack task management web application with a bold, high-contrast interface built for clarity and speed. Create tasks, track priorities, filter by deadlines, and stay on top of what matters — all from one clean dashboard.

It features a **Spring Boot REST API** on the backend and a **React + TypeScript** frontend powered by Vite and Tailwind CSS, containerised and ready to ship with Docker.

---

## Screenshots

### Home page
<img width="1919" height="991" alt="Screenshot 2026-06-11 023814" src="https://github.com/user-attachments/assets/bf7195f2-db20-4175-9e13-a9c7d38a38ac" />

### Create/Edit tasks
<img width="1920" height="988" alt="Screenshot 2026-06-11 at 02-39-44 PC version adaptation" src="https://github.com/user-attachments/assets/970ee36f-1728-4e8e-97a6-7b07a13d3526" />

### Dynamic calendar
Click on it to view the tasks for that day. 
<img width="474" height="557" alt="Screenshot 2026-06-11 024404" src="https://github.com/user-attachments/assets/7b1062aa-9dec-4502-a884-7e45ec425158" />

### Adjustable timezone support
Features both local and custom time zones!
<img width="340" height="555" alt="Screenshot 2026-06-11 024142" src="https://github.com/user-attachments/assets/fd065fb6-15cf-43e2-837f-6ebe718c8d3a" />

---

## Tech Stack

### Backend
- **Java 21** + **Spring Boot 3.5**
- **Spring Data JPA** for ORM
- **Spring Validation** for request validation
- **PostgreSQL** (production) / **H2** (in-memory fallback for development)
- **Lombok** for boilerplate reduction

### Frontend
- **React 18** + **TypeScript**
- **Vite** for lightning-fast dev server and builds
- **Tailwind CSS** for utility-first styling
- **Radix UI** for accessible component primitives

### Infrastructure
- **Docker** + **Docker Compose** for containerised deployment

---

## API Reference

The backend exposes a RESTful API under the `/api/v1/tasks` base path.

| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/api/v1/tasks` | Get all tasks (paginated) |
| `GET` | `/api/v1/tasks/search` | Search tasks with filters |
| `GET` | `/api/v1/tasks/stats` | Retrieve task statistics |
| `GET` | `/api/v1/tasks/up-next` | Get upcoming tasks |
| `GET` | `/api/v1/tasks/calendar` | Get tasks by month and year |
| `GET` | `/api/v1/tasks/{id}` | Get a specific task by ID |
| `POST` | `/api/v1/tasks` | Create a new task |
| `PUT` | `/api/v1/tasks/{id}` | Update an existing task |
| `DELETE` | `/api/v1/tasks/{id}` | Delete a task |

---

## Project Structure

```text
Taskflow/
├── docker-compose.yml          # Full-stack orchestration
├── Dockerfile                  # Container image definition
├── .env.example                # Environment variable template
├── pom.xml                     # Maven build config
├── frontend/                   # React + TypeScript app
│   ├── src/
│   │   ├── api/                # API client connection
│   │   ├── components/         # UI components
│   │   └── pages/              # Page views
│   └── package.json            # Node dependencies
└── src/                        # Spring Boot application
    └── main/
        ├── java/com/taskflow/  # Controllers, Services, Repositories, Models
        └── resources/          # application.properties
```

---

## Getting Started

### Prerequisites

| Tool | Version |
|------|---------|
| **JDK** | 21+ |
| **Node.js** | 20+ |
| **PostgreSQL** | 14+ |
| **Docker** | 24+ (Optional, for containerized deployment) |

*Note: Maven Wrapper (`mvnw`) is included in the project, so a global Maven installation is not strictly required.*

---

### Run with Docker (Recommended)

This is the fastest way to get everything running.

**1. Clone the repo**
```bash
git clone https://github.com/S-Srinivasan-06/Taskflow.git
cd Taskflow
```

**2. Configure environment variables**
```bash
cp .env.example .env
# Open .env and set your database credentials
```

**3. Build and launch**
```bash
docker-compose up --build
```

**4. Open in browser**
```
http://localhost:5173
```

The API runs on port `8080`, the frontend on `5173`, and the database on `5432`.

---

### Local Development

Prefer to run things natively? Here's how.

#### 1. Setup the Database

Set up a local PostgreSQL database, then configure your credentials in `src/main/resources/application.properties` or via environment variables.

#### 2. Start the Backend

Run the Spring Boot application using the included Maven wrapper.

```bash
# On Linux/macOS
./mvnw spring-boot:run

# On Windows
mvnw.cmd spring-boot:run
```

The REST API will be available at `http://localhost:8080`.

#### 3. Start the Frontend

Open a new terminal and navigate to the frontend directory to install dependencies and start the Vite dev server.

```bash
cd frontend
npm install
npm run dev
```

The frontend will be available at `http://localhost:5173`.

---

## Environment Variables

Copy `.env.example` to `.env` and fill in the values before running with Docker.

```env
# PostgreSQL
POSTGRES_DB=taskflow
POSTGRES_USER=your_user
POSTGRES_PASSWORD=your_password

# Spring Boot
SPRING_DATASOURCE_URL=jdbc:postgresql://db:5432/taskflow
SPRING_DATASOURCE_USERNAME=your_user
SPRING_DATASOURCE_PASSWORD=your_password
```

---

## Roadmap

- [ ] User authentication (JWT)
- [ ] Subtasks and checklists
- [ ] Drag-and-drop Kanban view
- [ ] Notifications and reminders
- [x] Dark mode toggle
- [ ] Mobile PWA support

---

## Contributing

Contributions are welcome! To get started:

1. Fork the repository
2. Create a feature branch
```bash
git checkout -b feature/your-feature-name
```
3. Commit your changes
```bash
git commit -m "feat: add your feature"
```
4. Push and open a Pull Request
```bash
git push origin feature/your-feature-name
```

---
[Live Demo](#) · [Report Bug](https://github.com/S-Srinivasan-06/Taskflow/issues) · [Request Feature](https://github.com/S-Srinivasan-06/Taskflow/issues)

---

<div align="center">

Built by [S-Srinivasan-06](https://github.com/S-Srinivasan-06)

Star this repo if you find it useful!

</div>
