package com.taskflow.repository;
import com.taskflow.entity.Task;
import org.springframework.data.jpa.repository.*;
import java.util.*;
import java.time.*;
import com.taskflow.dto.TaskStatsDTO;
public interface TaskRepository extends JpaRepository<Task, UUID>, JpaSpecificationExecutor<Task> {
    Optional<Task> findByIdAndUserIdAndIsDeletedFalse(UUID id, UUID userId);
    long countByUserId(UUID userId);
    @Query(value = "select id from {h-schema}app_users where id = :id for update", nativeQuery = true)
    UUID lockOwner(UUID id);

    @Query("""
        select new com.taskflow.dto.TaskStatsDTO(
          count(case when t.status not in (DONE, CANCELLED) then 1 end),
          count(case when t.status not in (DONE, CANCELLED) and t.dueAt < :now then 1 end),
          count(case when t.status not in (DONE, CANCELLED) and t.dueAt >= :start and t.dueAt < :tomorrow then 1 end),
          count(case when t.status = DONE and t.completedAt >= :start and t.completedAt < :tomorrow then 1 end),
          count(case when t.status not in (DONE, CANCELLED) and t.dueAt >= :tomorrow and t.dueAt < :afterTomorrow then 1 end),
          count(case when t.status not in (DONE, CANCELLED) and t.dueAt >= :start and t.dueAt < :week then 1 end))
        from Task t where t.userId = :userId and t.isDeleted = false
        """)
    TaskStatsDTO statistics(UUID userId, OffsetDateTime now, OffsetDateTime start,
        OffsetDateTime tomorrow, OffsetDateTime afterTomorrow, OffsetDateTime week);

    interface CalendarDay { LocalDate getDate(); long getRemaining(); }
    @Query(value = """
        select cast(due_at at time zone :zone as date) as date, count(*) as remaining
        from {h-schema}tasks where user_id = :userId and is_deleted = false
          and status not in ('DONE', 'CANCELLED') and due_at >= :start and due_at < :end
        group by 1 order by 1
        """, nativeQuery = true)
    List<CalendarDay> calendar(UUID userId, OffsetDateTime start, OffsetDateTime end, String zone);
}
