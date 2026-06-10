package com.taskflow.controller;

import com.taskflow.dto.TaskCreateDTO;
import com.taskflow.dto.TaskResponseDTO;
import com.taskflow.dto.TaskUpdateDTO;
import com.taskflow.service.TaskService;
import jakarta.validation.Valid;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.web.PageableDefault;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import com.taskflow.dto.TaskStatsDTO;
import org.springframework.format.annotation.DateTimeFormat;

import java.time.LocalDate;
import java.time.OffsetDateTime;
import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/api/v1/tasks")
public class TaskController {

    private final TaskService taskService;

    public TaskController(TaskService taskService) {
        this.taskService = taskService;
    }

    @GetMapping("/search")
    public ResponseEntity<Page<TaskResponseDTO>> searchTasks(
            @RequestParam(required = false) String search,
            @RequestParam(required = false) String category,
            @RequestParam(required = false) String quickFilter,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate date,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE_TIME) OffsetDateTime startDate,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE_TIME) OffsetDateTime endDate,
            @PageableDefault(size = 10) Pageable pageable) {
        return ResponseEntity.ok(taskService.searchTasks(search, category, quickFilter, date, startDate, endDate, pageable));
    }

    @GetMapping("/stats")
    public ResponseEntity<TaskStatsDTO> getStats() {
        return ResponseEntity.ok(taskService.getTaskStats());
    }

    // V-04: Pageable injected by Spring; @PageableDefault sets default page size to 10
    @GetMapping
    public ResponseEntity<Page<TaskResponseDTO>> getAllTasks(
            @PageableDefault(size = 10) Pageable pageable) {
        return ResponseEntity.ok(taskService.getAllTasks(pageable));
    }

    @GetMapping("/up-next")
    public ResponseEntity<Page<TaskResponseDTO>> getUpNext(
            @PageableDefault(size = 10) Pageable pageable) {
        return ResponseEntity.ok(taskService.getUpNextTasks(pageable));
    }

    @GetMapping("/calendar")
    public ResponseEntity<List<TaskResponseDTO>> getByMonth(
            @RequestParam int year, @RequestParam int month) {
        return ResponseEntity.ok(taskService.getTasksByMonth(year, month));
    }

    @GetMapping("/{id}")
    public ResponseEntity<TaskResponseDTO> getTaskById(@PathVariable UUID id) {
        return ResponseEntity.ok(taskService.getTaskById(id));
    }

    @PostMapping
    public ResponseEntity<TaskResponseDTO> createTask(@Valid @RequestBody TaskCreateDTO dto) {
        return new ResponseEntity<>(taskService.createTask(dto), HttpStatus.CREATED);
    }

    @PutMapping("/{id}")
    public ResponseEntity<TaskResponseDTO> updateTask(
            @PathVariable UUID id, @Valid @RequestBody TaskUpdateDTO dto) {
        return ResponseEntity.ok(taskService.updateTask(id, dto));
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> deleteTask(@PathVariable UUID id) {
        taskService.deleteTask(id);
        return ResponseEntity.noContent().build();
    }
}
