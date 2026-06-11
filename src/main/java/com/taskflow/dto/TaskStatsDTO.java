package com.taskflow.dto;

public record TaskStatsDTO(
        long totalActive,
        long overdue,
        long dueToday,
        long completedToday,
        long dueTomorrow,
        long dueThisWeek
) implements java.io.Serializable {
}
