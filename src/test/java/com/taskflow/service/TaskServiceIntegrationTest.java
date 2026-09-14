package com.taskflow.service;

import com.taskflow.dto.TaskCreateDTO;
import com.taskflow.dto.TaskResponseDTO;
import com.taskflow.enums.Priority;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.testcontainers.service.connection.ServiceConnection;
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
    static PostgreSQLContainer<?> postgres = new PostgreSQLContainer<>("postgres:17-alpine");

    @Autowired
    private TaskService taskService;

    @Test
    void shouldCreateAndRetrieveTask() {
        var identity = new com.taskflow.security.CurrentUser.Identity(java.util.UUID.randomUUID(), "test");
        org.springframework.security.core.context.SecurityContextHolder.getContext().setAuthentication(
            new org.springframework.security.authentication.UsernamePasswordAuthenticationToken(identity, null, java.util.List.of()));
        TaskCreateDTO dto = new TaskCreateDTO("Test Task", "Description", OffsetDateTime.now().plusDays(1), "Work", Priority.HIGH);
        TaskResponseDTO created = taskService.createTask(dto);

        assertThat(created.id()).isNotNull();
        assertThat(created.title()).isEqualTo("Test Task");

        TaskResponseDTO retrieved = taskService.getTaskById(created.id());
        assertThat(retrieved.title()).isEqualTo("Test Task");
        org.springframework.security.core.context.SecurityContextHolder.clearContext();
    }
}
