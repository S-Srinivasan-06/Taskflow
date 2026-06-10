package com.taskflow.repository;

import com.taskflow.entity.Task;
import com.taskflow.enums.TaskStatus;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.time.OffsetDateTime;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Repository
public interface TaskRepository extends JpaRepository<Task, UUID>, JpaSpecificationExecutor<Task> {

    // All active tasks, null due dates sorted last; paginated
    @Query("SELECT t FROM Task t WHERE t.isDeleted = false ORDER BY t.dueAt ASC NULLS LAST")
    Page<Task> findAllActiveTasks(Pageable pageable);

    // Up-next: excludes DONE and CANCELLED, includes overdue; null due dates last; paginated
    @Query("SELECT t FROM Task t WHERE t.isDeleted = false AND t.status NOT IN ('DONE', 'CANCELLED') ORDER BY t.dueAt ASC NULLS LAST")
    Page<Task> findUpNextTasks(Pageable pageable);

    // Calendar: tasks with a due date in the selected year/month only (null dates excluded)
    @Query("SELECT t FROM Task t WHERE t.isDeleted = false AND t.dueAt IS NOT NULL AND YEAR(t.dueAt) = :year AND MONTH(t.dueAt) = :month ORDER BY t.dueAt ASC")
    List<Task> findTasksByMonth(@Param("year") int year, @Param("month") int month);

    // V-03: softDelete JPQL bulk query removed — soft delete now handled in TaskService
    //        via entity load + save(), which correctly triggers @Version increment

    Optional<Task> findByIdAndIsDeletedFalse(UUID id);

    // Optimized COUNT queries for /stats endpoint
    long countByIsDeletedFalse();
    long countByIsDeletedFalseAndDueAtBeforeAndStatusNotIn(OffsetDateTime now, List<TaskStatus> statuses);
    long countByIsDeletedFalseAndDueAtBetween(OffsetDateTime start, OffsetDateTime end);
    long countByIsDeletedFalseAndDueAtBetweenAndStatusIn(OffsetDateTime start, OffsetDateTime end, List<TaskStatus> statuses);
    long countByIsDeletedFalseAndStatusIn(List<TaskStatus> statuses);
}
