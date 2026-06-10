package com.taskflow.entity;

import com.taskflow.enums.Priority;
import com.taskflow.enums.TaskStatus;
import jakarta.persistence.*;
import lombok.*;
import org.springframework.data.annotation.CreatedDate;
import org.springframework.data.annotation.LastModifiedDate;
import org.springframework.data.jpa.domain.support.AuditingEntityListener;

import java.time.OffsetDateTime;
import java.util.UUID;

// JPA Entity: maps to the PostgreSQL "tasks" table
@Entity
@Table(
    name = "tasks",
    indexes = {
        // Speeds up ORDER BY / WHERE queries on the task deadline
        @Index(name = "idx_tasks_due_at",     columnList = "due_at"),
        // Speeds up filtering tasks by their lifecycle state (e.g. PENDING, DONE)
        @Index(name = "idx_tasks_status",     columnList = "status"),
        // Speeds up the universal WHERE is_deleted = false filter on every list query
        @Index(name = "idx_tasks_is_deleted", columnList = "is_deleted")
    }
)
@Getter
@Setter
@NoArgsConstructor           // Required by JPA spec — no-arg constructor must exist
@AllArgsConstructor          // Used internally by Lombok @Builder
@Builder
@EntityListeners(AuditingEntityListener.class) // Activates Spring Data auditing for this entity
public class Task {

    // Primary key: UUID prevents sequential ID guessing and suits distributed inserts
    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    // Brief title shown in the task list; required field
    @Column(nullable = false)
    private String title;

    // Optional multi-line notes; TEXT column has no length cap in Postgres
    @Column(columnDefinition = "TEXT")
    private String description;

    // Deadline stored as TIMESTAMPTZ (timezone-aware); null = open-ended task with no deadline.
    @Column(name = "due_at")
    private OffsetDateTime dueAt;

    // Task lifecycle state; STRING storage for readability, defaults to PENDING to avoid nulls in @Builder.
    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    @Builder.Default
    private TaskStatus status = TaskStatus.PENDING;

    // Importance level; STRING storage for readability, defaults to LOW (optional field — user need not specify).
    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    @Builder.Default
    private Priority priority = Priority.LOW;

    // Optional user-defined grouping label (e.g. "Work", "Personal", "Study")
    private String category;

    // Soft-delete flag: tasks are only marked as deleted, requiring WHERE is_deleted = false in queries.
    @Column(name = "is_deleted", nullable = false)
    @Builder.Default
    private Boolean isDeleted = false;

    // Audit: timestamp of first INSERT; updatable=false prevents accidental overwrites via API
    @CreatedDate
    @Column(name = "created_at", nullable = false, updatable = false)
    private OffsetDateTime createdAt;

    // Audit: timestamp of most recent UPDATE; managed automatically by Spring Data
    @LastModifiedDate
    @Column(name = "updated_at", nullable = false)
    private OffsetDateTime updatedAt;

    // Optimistic locking: Hibernate prevents concurrent data overwrites by checking this version on UPDATE.
    @Version
    private Long version;
}
