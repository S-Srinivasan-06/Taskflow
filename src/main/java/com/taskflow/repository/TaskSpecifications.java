package com.taskflow.repository;

import com.taskflow.entity.Task;
import com.taskflow.enums.Priority;
import com.taskflow.enums.TaskStatus;
import org.springframework.data.jpa.domain.Specification;
import jakarta.persistence.criteria.Predicate;

import java.time.LocalDate;
import java.time.OffsetDateTime;
import java.time.ZoneOffset;
import java.util.ArrayList;
import java.util.List;

public class TaskSpecifications {

    public static Specification<Task> withDynamicFilters(String search, String category, String quickFilter, LocalDate date, OffsetDateTime startDate, OffsetDateTime endDate) {
        return (root, query, cb) -> {
            List<Predicate> predicates = new ArrayList<>();

            // Always exclude deleted tasks
            predicates.add(cb.isFalse(root.get("isDeleted")));

            // Search filter
            if (search != null && !search.isBlank()) {
                String pattern = "%" + search.toLowerCase() + "%";
                predicates.add(cb.or(
                        cb.like(cb.lower(root.get("title")), pattern),
                        cb.like(cb.lower(root.get("description")), pattern)
                ));
            }

            // Category filter
            if (category != null && !category.equalsIgnoreCase("ALL")) {
                predicates.add(cb.equal(root.get("category"), category.toLowerCase()));
            }

            // Date filter (clicking on a specific date in calendar)
            if (date != null) {
                OffsetDateTime sDay = date.atStartOfDay(OffsetDateTime.now().getOffset()).toOffsetDateTime();
                OffsetDateTime eDay = sDay.plusDays(1).minusNanos(1);
                predicates.add(cb.between(root.get("dueAt"), sDay, eDay));
            }

            if (startDate != null) {
                predicates.add(cb.or(
                        cb.greaterThanOrEqualTo(root.get("dueAt"), startDate),
                        cb.isNull(root.get("dueAt"))
                ));
            }
            if (endDate != null) {
                predicates.add(cb.lessThan(root.get("dueAt"), endDate));
            }

            // Quick Filters
            OffsetDateTime now = OffsetDateTime.now();
            OffsetDateTime startOfDay = now.toLocalDate().atStartOfDay(now.getOffset()).toOffsetDateTime();

            if ("COMPLETED".equalsIgnoreCase(quickFilter)) {
                predicates.add(root.get("status").in(TaskStatus.DONE, TaskStatus.CANCELLED));
            } else if ("REMAINING".equalsIgnoreCase(quickFilter)) {
                predicates.add(cb.not(root.get("status").in(TaskStatus.DONE, TaskStatus.CANCELLED)));
            } else if ("OVERDUE".equalsIgnoreCase(quickFilter)) {
                predicates.add(cb.lessThan(root.get("dueAt"), now));
                predicates.add(cb.not(root.get("status").in(TaskStatus.DONE, TaskStatus.CANCELLED)));
            } else if ("TODAY".equalsIgnoreCase(quickFilter)) {
                OffsetDateTime eDay = startOfDay.plusDays(1).minusNanos(1);
                predicates.add(cb.between(root.get("dueAt"), startOfDay, eDay));
            } else if ("TOMORROW".equalsIgnoreCase(quickFilter)) {
                OffsetDateTime sTom = startOfDay.plusDays(1);
                OffsetDateTime eTom = sTom.plusDays(1).minusNanos(1);
                predicates.add(cb.between(root.get("dueAt"), sTom, eTom));
            } else if ("THIS WEEK".equalsIgnoreCase(quickFilter)) {
                OffsetDateTime eWeek = startOfDay.plusDays(7);
                predicates.add(cb.between(root.get("dueAt"), startOfDay, eWeek));
            } else if (quickFilter != null && !quickFilter.equalsIgnoreCase("ALL")) {
                // Must be a priority
                try {
                    predicates.add(cb.equal(root.get("priority"), Priority.valueOf(quickFilter.toUpperCase())));
                } catch (IllegalArgumentException ignored) {
                }
            }

            return cb.and(predicates.toArray(new Predicate[0]));
        };
    }
}
