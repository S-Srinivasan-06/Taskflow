package com.taskflow.service;

import com.taskflow.dto.TaskCreateDTO;
import com.taskflow.dto.TaskResponseDTO;
import com.taskflow.dto.TaskUpdateDTO;
import com.taskflow.entity.Task;
import com.taskflow.enums.Priority;
import com.taskflow.enums.TaskStatus;
import com.taskflow.exception.TaskNotFoundException;
import com.taskflow.repository.TaskRepository;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.cache.annotation.Cacheable;
import org.springframework.cache.annotation.CacheEvict;
import org.springframework.cache.annotation.Caching;

import java.time.LocalDate;
import java.time.OffsetDateTime;
import java.util.List;
import java.util.UUID;
import org.springframework.data.jpa.domain.Specification;
import com.taskflow.dto.TaskStatsDTO;
import com.taskflow.repository.TaskSpecifications;

@Service
@Transactional
public class TaskService {

    private final TaskRepository taskRepository;

    public TaskService(TaskRepository taskRepository) {
        this.taskRepository = taskRepository;
    }

    public Page<TaskResponseDTO> searchTasks(String search, String category, String quickFilter, LocalDate date, OffsetDateTime startDate, OffsetDateTime endDate, Pageable pageable) {
        Specification<Task> spec = TaskSpecifications.withDynamicFilters(search, category, quickFilter, date, startDate, endDate);
        return taskRepository.findAll(spec, pageable).map(this::mapToResponseDTO);
    }

    @Cacheable(value = "taskStats", key = "'all_stats'")
    public TaskStatsDTO getTaskStats() {
        OffsetDateTime now = OffsetDateTime.now();
        OffsetDateTime startOfDay = now.toLocalDate().atStartOfDay(now.getOffset()).toOffsetDateTime();
        OffsetDateTime endOfDay = startOfDay.plusDays(1).minusNanos(1);
        OffsetDateTime startOfTomorrow = startOfDay.plusDays(1);
        OffsetDateTime endOfTomorrow = endOfDay.plusDays(1);
        OffsetDateTime endOfWeek = startOfDay.plusDays(7);
        
        List<TaskStatus> doneOrCancelled = List.of(TaskStatus.DONE, TaskStatus.CANCELLED);

        long totalTasks = taskRepository.countByIsDeletedFalse();
        long completedTotal = taskRepository.countByIsDeletedFalseAndStatusIn(doneOrCancelled);
        long totalActive = totalTasks - completedTotal;
        long overdue = taskRepository.countByIsDeletedFalseAndDueAtBeforeAndStatusNotIn(now, doneOrCancelled);
        long dueToday = taskRepository.countByIsDeletedFalseAndDueAtBetween(startOfDay, endOfDay);
        long completedToday = taskRepository.countByIsDeletedFalseAndDueAtBetweenAndStatusIn(startOfDay, endOfDay, doneOrCancelled);
        long dueTomorrow = taskRepository.countByIsDeletedFalseAndDueAtBetween(startOfTomorrow, endOfTomorrow);
        long dueThisWeek = taskRepository.countByIsDeletedFalseAndDueAtBetween(startOfDay, endOfWeek);

        return new TaskStatsDTO(totalActive, overdue, dueToday, completedToday, dueTomorrow, dueThisWeek);
    }

    // V-04: Returns Page instead of List
    public Page<TaskResponseDTO> getAllTasks(Pageable pageable) {
        return taskRepository.findAllActiveTasks(pageable)
                .map(this::mapToResponseDTO);
    }

    // V-04: Returns Page instead of List
    public Page<TaskResponseDTO> getUpNextTasks(Pageable pageable) {
        return taskRepository.findUpNextTasks(pageable)
                .map(this::mapToResponseDTO);
    }

    @Cacheable(value = "tasksByMonth", key = "#year + '_' + #month")
    public List<TaskResponseDTO> getTasksByMonth(int year, int month) {
        return taskRepository.findTasksByMonth(year, month)
                .stream()
                .map(this::mapToResponseDTO)
                .toList();
    }

    public TaskResponseDTO getTaskById(UUID id) {
        Task task = findActiveTaskOrThrow(id);
        return mapToResponseDTO(task);
    }

    @Caching(evict = {
        @CacheEvict(value = "taskStats", allEntries = true),
        @CacheEvict(value = "tasksByMonth", allEntries = true)
    })
    public TaskResponseDTO createTask(TaskCreateDTO dto) {
        Task task = Task.builder()
                .title(dto.title())
                .description(dto.description())
                .dueAt(dto.dueAt())
                .category(normalizeCategory(dto.category())) // V-05: normalize before save
                .priority(dto.priority() != null ? dto.priority() : Priority.LOW)
                .status(TaskStatus.PENDING)
                .isDeleted(false)
                .build();

        return mapToResponseDTO(taskRepository.save(task));
    }

    @Caching(evict = {
        @CacheEvict(value = "taskStats", allEntries = true),
        @CacheEvict(value = "tasksByMonth", allEntries = true)
    })
    public TaskResponseDTO updateTask(UUID id, TaskUpdateDTO dto) {
        Task task = findActiveTaskOrThrow(id);

        task.setTitle(dto.title());
        task.setDescription(dto.description());
        task.setDueAt(dto.dueAt());
        task.setCategory(normalizeCategory(dto.category())); // V-05: normalize before save
        task.setPriority(dto.priority() != null ? dto.priority() : Priority.LOW);
        if (dto.status() != null) { // preserve current status if not supplied
            task.setStatus(dto.status());
        }

        return mapToResponseDTO(taskRepository.save(task));
    }

    // V-03: Fixed optimistic locking bypass — load entity + save() so @Version is checked
    @Caching(evict = {
        @CacheEvict(value = "taskStats", allEntries = true),
        @CacheEvict(value = "tasksByMonth", allEntries = true)
    })
    public void deleteTask(UUID id) {
        Task task = findActiveTaskOrThrow(id);
        task.setIsDeleted(true);
        taskRepository.save(task);
    }

    private Task findActiveTaskOrThrow(UUID id) {
        return taskRepository.findByIdAndIsDeletedFalse(id)
                .orElseThrow(() -> new TaskNotFoundException(id));
    }

    // V-05: Trim whitespace and normalize to lowercase for consistent category grouping
    private String normalizeCategory(String category) {
        if (category == null || category.isBlank()) return null;
        return category.trim().toLowerCase();
    }

    private TaskResponseDTO mapToResponseDTO(Task task) {
        return new TaskResponseDTO(
                task.getId(),
                task.getTitle(),
                task.getDescription(),
                task.getDueAt(),
                task.getCategory(),
                task.getStatus(),
                task.getPriority(),
                task.getIsDeleted(),
                task.getCreatedAt(),
                task.getUpdatedAt()
        );
    }
}
