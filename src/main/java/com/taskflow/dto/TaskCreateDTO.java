package com.taskflow.dto;

import com.taskflow.enums.Priority;
import jakarta.validation.constraints.*;
import java.time.OffsetDateTime;

public record TaskCreateDTO(
    @NotBlank(message = "Title is required")
    @Size(max = 255, message = "Title cannot exceed 255 characters")
    String title,

    @Size(max = 10000, message = "Description cannot exceed 10000 characters")
    String description,

    OffsetDateTime dueAt,

    @Size(max = 100, message = "Category cannot exceed 100 characters")
    String category,

    Priority priority
) {}
