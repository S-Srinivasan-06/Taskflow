package com.taskflow.service;

import com.taskflow.dto.TaskCreateDTO;
import com.taskflow.dto.TaskResponseDTO;
import com.taskflow.dto.TaskUpdateDTO;
import com.taskflow.entity.Task;
import com.taskflow.enums.Priority;
import com.taskflow.enums.TaskStatus;
import com.taskflow.exception.TaskNotFoundException;
import com.taskflow.repository.TaskRepository;
import com.taskflow.security.CurrentUser;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.time.OffsetDateTime;
import java.util.Optional;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class TaskServiceUnitTest {

    @Mock
    private TaskRepository tasks;

    @Mock
    private CurrentUser current;

    private TaskService service;
    private UUID userId;

    @BeforeEach
    void setUp() {
        service = new TaskService(tasks, current);
        userId = UUID.randomUUID();
        when(current.id()).thenReturn(userId);
    }

    @Test
    void createTaskSetsAuthenticatedOwnerBeforeFlush() {
        UUID taskId = UUID.randomUUID();
        when(tasks.saveAndFlush(any(Task.class))).thenAnswer(invocation -> {
            Task task = invocation.getArgument(0);
            task.setId(taskId);
            task.setVersion(0L);
            return task;
        });

        TaskResponseDTO response = service.createTask(
                new TaskCreateDTO("  New task  ", "notes", null, " Work ", Priority.HIGH));

        ArgumentCaptor<Task> taskCaptor = ArgumentCaptor.forClass(Task.class);
        verify(tasks).saveAndFlush(taskCaptor.capture());
        Task saved = taskCaptor.getValue();
        assertThat(saved.getUserId()).isEqualTo(userId);
        assertThat(saved.getTitle()).isEqualTo("New task");
        assertThat(saved.getCategory()).isEqualTo("work");
        assertThat(response.id()).isEqualTo(taskId);
        assertThat(response.version()).isEqualTo(0L);
    }

    @Test
    void fetchUsesAuthenticatedOwnerAndMissingTaskIsNotFound() {
        UUID taskId = UUID.randomUUID();
        when(tasks.findByIdAndUserIdAndIsDeletedFalse(taskId, userId)).thenReturn(Optional.empty());

        assertThatThrownBy(() -> service.getTaskById(taskId))
                .isInstanceOf(TaskNotFoundException.class);

        verify(tasks).findByIdAndUserIdAndIsDeletedFalse(taskId, userId);
    }

    @Test
    void updateUsesAuthenticatedOwnerAndRejectsStaleVersionBeforeFlush() {
        UUID taskId = UUID.randomUUID();
        Task task = task(taskId, 7L, Priority.HIGH);
        when(tasks.findByIdAndUserIdAndIsDeletedFalse(taskId, userId)).thenReturn(Optional.of(task));

        TaskUpdateDTO stale = new TaskUpdateDTO("Updated", null, null, null, null, null, 6L);

        assertThatThrownBy(() -> service.updateTask(taskId, stale))
                .isInstanceOf(org.springframework.web.server.ResponseStatusException.class)
                .hasMessageContaining("Task changed");

        verify(tasks).findByIdAndUserIdAndIsDeletedFalse(taskId, userId);
        verify(tasks, never()).saveAndFlush(any(Task.class));
    }

    @Test
    void updatePreservesMissingPriorityAndReturnsVersionAssignedByFlush() {
        UUID taskId = UUID.randomUUID();
        Task task = task(taskId, 7L, Priority.HIGH);
        when(tasks.findByIdAndUserIdAndIsDeletedFalse(taskId, userId)).thenReturn(Optional.of(task));
        when(tasks.saveAndFlush(task)).thenAnswer(invocation -> {
            task.setVersion(8L);
            return task;
        });

        TaskResponseDTO response = service.updateTask(taskId,
                new TaskUpdateDTO("Updated", "description", null, "Personal", null, null, 7L));

        verify(tasks).findByIdAndUserIdAndIsDeletedFalse(taskId, userId);
        verify(tasks).saveAndFlush(task);
        assertThat(task.getPriority()).isEqualTo(Priority.HIGH);
        assertThat(response.title()).isEqualTo("Updated");
        assertThat(response.version()).isEqualTo(8L);
    }

    @Test
    void deleteUsesAuthenticatedOwnerAndSoftDeletesAfterVersionCheck() {
        UUID taskId = UUID.randomUUID();
        Task task = task(taskId, 2L, Priority.LOW);
        when(tasks.findByIdAndUserIdAndIsDeletedFalse(taskId, userId)).thenReturn(Optional.of(task));
        when(tasks.saveAndFlush(task)).thenReturn(task);

        service.deleteTask(taskId, 2L);

        verify(tasks).findByIdAndUserIdAndIsDeletedFalse(taskId, userId);
        verify(tasks).saveAndFlush(task);
        assertThat(task.getIsDeleted()).isTrue();
    }

    @Test
    void deleteRejectsMissingOrStaleTaskVersion() {
        UUID taskId = UUID.randomUUID();
        Task task = task(taskId, 3L, Priority.LOW);
        when(tasks.findByIdAndUserIdAndIsDeletedFalse(taskId, userId)).thenReturn(Optional.of(task));

        assertThatThrownBy(() -> service.deleteTask(taskId, 2L))
                .isInstanceOf(org.springframework.web.server.ResponseStatusException.class)
                .hasMessageContaining("Task changed");

        verify(tasks, never()).saveAndFlush(any(Task.class));
    }

    private Task task(UUID id, long version, Priority priority) {
        return Task.builder()
                .id(id)
                .userId(userId)
                .title("Existing")
                .description("Existing description")
                .status(TaskStatus.PENDING)
                .priority(priority)
                .isDeleted(false)
                .version(version)
                .build();
    }
}
