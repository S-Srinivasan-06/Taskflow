# ==========================================
# Stage 1: Build the Application
# ==========================================
FROM maven:3.9-eclipse-temurin-21 AS build
WORKDIR /app

# Copy pom.xml first to leverage Docker layer caching for dependencies
COPY pom.xml .
RUN mvn dependency:go-offline

# Copy source code and build the JAR
COPY src ./src
RUN mvn clean package -DskipTests

# ==========================================
# Stage 2: Runtime (Lightweight & Secure)
# ==========================================
FROM eclipse-temurin:21-jre
WORKDIR /app

# Security: Create a non-root user and group
RUN groupadd -r appgroup && useradd -r -g appgroup appuser

# Copy the built JAR from Stage 1
COPY --chown=appuser:appgroup --from=build /app/target/*.jar app.jar

# Run as the unprivileged application user
USER appuser

EXPOSE 8081

ENTRYPOINT ["java", "-jar", "app.jar"]
