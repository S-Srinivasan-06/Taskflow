package com.taskflow.dto;

import com.taskflow.enums.Priority;
import com.taskflow.enums.TaskStatus;
import java.time.OffsetDateTime;
import java.util.UUID;

public record TaskResponseDTO(
    UUID id,
    String title,
    String description,
    OffsetDateTime dueAt,
    String category,
    TaskStatus status,
    Priority priority,
    Boolean isDeleted,
    OffsetDateTime createdAt,
    OffsetDateTime updatedAt
) {}
