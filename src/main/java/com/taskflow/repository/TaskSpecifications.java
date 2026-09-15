package com.taskflow.repository;
import com.taskflow.entity.Task;
import com.taskflow.enums.*;
import org.springframework.data.jpa.domain.Specification;
import jakarta.persistence.criteria.Predicate;
import java.time.*;
import java.util.*;

public class TaskSpecifications {
    public static Specification<Task> owned(UUID userId) {
        Objects.requireNonNull(userId);
        return (root, query, cb) -> cb.and(cb.equal(root.get("userId"), userId), cb.isFalse(root.get("isDeleted")));
    }
    public static Specification<Task> remaining() {
        return (root, query, cb) -> cb.not(root.get("status").in(TaskStatus.DONE, TaskStatus.CANCELLED));
    }
    public static Specification<Task> between(OffsetDateTime start, OffsetDateTime end) {
        return (root, query, cb) -> cb.and(cb.greaterThanOrEqualTo(root.get("dueAt"), start), cb.lessThan(root.get("dueAt"), end));
    }
    public static Specification<Task> withDynamicFilters(String search, String category, String quickFilter,
            LocalDate date, OffsetDateTime startDate, OffsetDateTime endDate, ZoneId zone) {
        return withDynamicFilters(search, category, quickFilter, date, startDate, endDate, zone, false);
    }
    public static Specification<Task> withDynamicFilters(String search, String category, String quickFilter,
            LocalDate date, OffsetDateTime startDate, OffsetDateTime endDate, ZoneId zone, boolean includeUndated) {
        if (startDate != null && endDate != null && !startDate.isBefore(endDate))
            throw new IllegalArgumentException("Start date must be before end date");
        String filter = quickFilter == null ? "ALL" : quickFilter.trim().toUpperCase(Locale.ROOT);
        Set<String> filters = Set.of("ALL", "COMPLETED", "REMAINING", "OVERDUE", "TODAY", "TOMORROW", "THIS WEEK", "LOW", "MEDIUM", "HIGH", "URGENT");
        if (!filters.contains(filter)) throw new IllegalArgumentException("Unknown quick filter");
        return (root, query, cb) -> {
            List<Predicate> predicates = new ArrayList<>();
            if (search != null && !search.isBlank()) {
                String literal = search.trim().toLowerCase(Locale.ROOT).replace("\\", "\\\\").replace("%", "\\%").replace("_", "\\_");
                String pattern = "%" + literal + "%";
                predicates.add(cb.or(cb.like(cb.lower(root.get("title")), pattern, '\\'),
                                     cb.like(cb.lower(root.get("description")), pattern, '\\')));
            }
            if (category != null && !category.isBlank() && !"ALL".equalsIgnoreCase(category.trim()))
                predicates.add(cb.equal(root.get("category"), category.trim().toLowerCase(Locale.ROOT)));
            if (date != null) {
                predicates.add(between(date.atStartOfDay(zone).toOffsetDateTime(),
                    date.plusDays(1).atStartOfDay(zone).toOffsetDateTime()).toPredicate(root, query, cb));
            }
            if (startDate != null) {
                var lower = cb.greaterThanOrEqualTo(root.get("dueAt"), startDate);
                predicates.add(includeUndated ? cb.or(lower, cb.isNull(root.get("dueAt"))) : lower);
            }
            if (endDate != null) predicates.add(cb.lessThan(root.get("dueAt"), endDate));
            var today = LocalDate.now(zone);
            if ("COMPLETED".equals(filter)) predicates.add(root.get("status").in(TaskStatus.DONE, TaskStatus.CANCELLED));
            if ("REMAINING".equals(filter)) predicates.add(remaining().toPredicate(root, query, cb));
            if ("OVERDUE".equals(filter)) {
                predicates.add(cb.lessThan(root.get("dueAt"), OffsetDateTime.now(zone)));
                predicates.add(remaining().toPredicate(root, query, cb));
            }
            if (Set.of("TODAY", "TOMORROW", "THIS WEEK").contains(filter)) {
                predicates.add(remaining().toPredicate(root, query, cb));
                var start = "TOMORROW".equals(filter) ? today.plusDays(1) : today;
                var end = start.plusDays("THIS WEEK".equals(filter) ? 7 : 1);
                predicates.add(between(start.atStartOfDay(zone).toOffsetDateTime(),
                    end.atStartOfDay(zone).toOffsetDateTime()).toPredicate(root, query, cb));
            }
            if (Set.of("LOW", "MEDIUM", "HIGH", "URGENT").contains(filter))
                predicates.add(cb.equal(root.get("priority"), Priority.valueOf(filter)));
            return cb.and(predicates.toArray(new Predicate[0]));
        };
    }
}
