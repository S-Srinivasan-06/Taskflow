package com.taskflow.dto;
import java.time.LocalDate;
public record CalendarDayDTO(LocalDate date, long remaining) {}
