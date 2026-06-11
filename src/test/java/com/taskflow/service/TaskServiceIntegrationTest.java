package com.taskflow.service;

import com.taskflow.dto.TaskCreateDTO;
import com.taskflow.dto.TaskResponseDTO;
import com.taskflow.enums.Priority;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.testcontainers.service.connection.ServiceConnection;
import org.testcontainers.containers.GenericContainer;
import org.testcontainers.containers.PostgreSQLContainer;
import org.testcontainers.junit.jupiter.Container;
import org.testcontainers.junit.jupiter.Testcontainers;

import java.time.OffsetDateTime;

import static org.assertj.core.api.Assertions.assertThat;

@SpringBootTest
@Testcontainers
class TaskServiceIntegrationTest {

    @Container
    @ServiceConnection
    static PostgreSQLContainer<?> postgres = new PostgreSQLContainer<>("postgres:14-alpine");

    @Container
    @ServiceConnection(name = "redis")
    static GenericContainer<?> redis = new GenericContainer<>("redis:7-alpine").withExposedPorts(6379);

    @Autowired
    private TaskService taskService;

    @Test
    void shouldCreateAndRetrieveTask() {
        TaskCreateDTO dto = new TaskCreateDTO("Test Task", "Description", OffsetDateTime.now().plusDays(1), "Work", Priority.HIGH);
        TaskResponseDTO created = taskService.createTask(dto);

        assertThat(created.id()).isNotNull();
        assertThat(created.title()).isEqualTo("Test Task");

        TaskResponseDTO retrieved = taskService.getTaskById(created.id());
        assertThat(retrieved.title()).isEqualTo("Test Task");
    }
}
