package com.taskflow.service;
import com.taskflow.dto.*;
import com.taskflow.entity.Task;
import com.taskflow.enums.*;
import com.taskflow.exception.TaskNotFoundException;
import com.taskflow.repository.*;
import com.taskflow.security.CurrentUser;
import org.springframework.data.domain.*;
import org.springframework.data.jpa.domain.Specification;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;
import org.springframework.http.HttpStatus;
import java.time.*;
import java.util.*;
import static com.taskflow.repository.TaskSpecifications.*;

@Service @Transactional
public class TaskService {
    @org.springframework.beans.factory.annotation.Value("${app.max-tasks-per-user:2000}")
    private long maxTasksPerUser = 2000;
    private final TaskRepository tasks;
    private final CurrentUser current;
    public TaskService(TaskRepository tasks, CurrentUser current) { this.tasks = tasks; this.current = current; }
    private Specification<Task> scope() { return owned(current.id()); }
    private Pageable stable(Pageable pageable) {
        Set<String> allowed = Set.of("dueAt", "createdAt", "updatedAt", "title", "status", "priority", "id");
        Sort sort = pageable.getSort().isSorted() ? pageable.getSort() : Sort.by("dueAt");
        for (Sort.Order order : sort) if (!allowed.contains(order.getProperty()))
            throw new IllegalArgumentException("Unsupported sort field");
        if (sort.getOrderFor("id") == null) sort = sort.and(Sort.by("id"));
        return PageRequest.of(pageable.getPageNumber(), Math.min(10, pageable.getPageSize()), sort);
    }
    public Page<TaskResponseDTO> searchTasks(String search, String category, String quickFilter, LocalDate date,
            OffsetDateTime startDate, OffsetDateTime endDate, Pageable pageable, ZoneId zone, boolean includeUndated) {
        if (search != null && search.length() > 255) throw new IllegalArgumentException("Search is too long");
        return tasks.findAll(scope().and(withDynamicFilters(search, category, quickFilter, date, startDate, endDate, zone, includeUndated)),
            stable(pageable)).map(this::response);
    }
    public TaskStatsDTO getTaskStats(ZoneId zone) {
        var today = LocalDate.now(zone);
        var start = today.atStartOfDay(zone).toOffsetDateTime();
        var tomorrow = today.plusDays(1).atStartOfDay(zone).toOffsetDateTime();
        var afterTomorrow = today.plusDays(2).atStartOfDay(zone).toOffsetDateTime();
        var week = today.plusDays(7).atStartOfDay(zone).toOffsetDateTime();
        return tasks.statistics(current.id(), OffsetDateTime.now(zone), start, tomorrow, afterTomorrow, week);
    }
    public Page<TaskResponseDTO> getAllTasks(Pageable pageable) {
        return tasks.findAll(scope(), stable(pageable)).map(this::response);
    }
    public Page<TaskResponseDTO> getUpNextTasks(Pageable pageable) {
        return tasks.findAll(scope().and(remaining()), stable(pageable)).map(this::response);
    }
    public List<CalendarDayDTO> getTasksByMonth(int year, int month, ZoneId zone) {
        if (year < 1 || year > 9999) throw new IllegalArgumentException("Invalid year");
        var start = LocalDate.of(year, month, 1);
        return tasks.calendar(current.id(), start.atStartOfDay(zone).toOffsetDateTime(),
            start.plusMonths(1).atStartOfDay(zone).toOffsetDateTime(), zone.getId()).stream()
            .map(day -> new CalendarDayDTO(day.getDate(), day.getRemaining())).toList();
    }
    public TaskResponseDTO getTaskById(UUID id) { return response(find(id)); }
    public TaskResponseDTO createTask(TaskCreateDTO dto) {
        // The account row lock serializes quota checks with concurrent creations.
        tasks.lockOwner(current.id());
        if (tasks.countByUserId(current.id()) >= maxTasksPerUser)
            throw new ResponseStatusException(HttpStatus.TOO_MANY_REQUESTS,
                "Account task storage limit reached (including deleted tasks). Contact the administrator.");
        var task = Task.builder().userId(current.id()).title(dto.title().trim()).description(dto.description())
            .dueAt(dto.dueAt()).category(normalize(dto.category()))
            .priority(dto.priority() == null ? Priority.LOW : dto.priority()).status(TaskStatus.PENDING).isDeleted(false).build();
        return response(tasks.saveAndFlush(task));
    }
    public TaskResponseDTO updateTask(UUID id, TaskUpdateDTO dto) {
        Task task = find(id); checkVersion(task, dto.version());
        task.setTitle(dto.title().trim()); task.setDescription(dto.description()); task.setDueAt(dto.dueAt());
        task.setCategory(normalize(dto.category()));
        if (dto.priority() != null) task.setPriority(dto.priority());
        if (dto.status() != null) transition(task, dto.status());
        return response(tasks.saveAndFlush(task));
    }
    public TaskResponseDTO changeStatus(UUID id, TaskStatus status, Long version) {
        Task task = find(id); checkVersion(task, version); transition(task, status);
        return response(tasks.saveAndFlush(task));
    }
    public void deleteTask(UUID id, Long version) {
        Task task = find(id); checkVersion(task, version); task.setIsDeleted(true); tasks.saveAndFlush(task);
    }
    private void checkVersion(Task task, Long version) {
        if (version == null || !version.equals(task.getVersion()))
            throw new ResponseStatusException(HttpStatus.CONFLICT, "Task changed; refresh it before saving");
    }
    private void transition(Task task, TaskStatus status) {
        if (status == TaskStatus.DONE && task.getStatus() != TaskStatus.DONE)
            task.setCompletedAt(OffsetDateTime.now(ZoneOffset.UTC));
        else if (status != TaskStatus.DONE) task.setCompletedAt(null);
        task.setStatus(status);
    }
    private Task find(UUID id) {
        return tasks.findByIdAndUserIdAndIsDeletedFalse(id, current.id()).orElseThrow(() -> new TaskNotFoundException(id));
    }
    private String normalize(String category) {
        return category == null || category.isBlank() ? null : category.trim().toLowerCase(Locale.ROOT);
    }
    private TaskResponseDTO response(Task t) {
        return new TaskResponseDTO(t.getId(), t.getTitle(), t.getDescription(), t.getDueAt(), t.getCategory(),
            t.getStatus(), t.getPriority(), t.getIsDeleted(), t.getCreatedAt(), t.getUpdatedAt(), t.getVersion());
    }
}
