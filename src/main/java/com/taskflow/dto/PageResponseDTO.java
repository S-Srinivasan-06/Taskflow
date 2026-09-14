package com.taskflow.dto;

import org.springframework.data.domain.Page;

import java.util.List;

/**
 * Stable public pagination contract independent of Spring Data's internal
 * PageImpl JSON representation.
 */
public record PageResponseDTO<T>(
        List<T> content,
        int totalPages,
        long totalElements,
        int size,
        int number) {

    public static <T> PageResponseDTO<T> from(Page<T> page) {
        return new PageResponseDTO<>(
                page.getContent(),
                page.getTotalPages(),
                page.getTotalElements(),
                page.getSize(),
                page.getNumber());
    }
}
