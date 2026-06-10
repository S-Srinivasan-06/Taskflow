package com.taskflow.exception;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.http.converter.HttpMessageNotReadableException;
import org.springframework.validation.FieldError;
import org.springframework.web.bind.MethodArgumentNotValidException;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;

import java.time.OffsetDateTime;
import java.util.HashMap;
import java.util.Map;

@RestControllerAdvice
public class GlobalExceptionHandler {

    // V-01: SLF4J logger — logs full stack trace internally, nothing leaked to response
    private static final Logger log = LoggerFactory.getLogger(GlobalExceptionHandler.class);

    public record ErrorResponse(String status, OffsetDateTime timestamp, String message, Map<String, String> errors) {}

    @ExceptionHandler(TaskNotFoundException.class)
    public ResponseEntity<ErrorResponse> handleTaskNotFound(TaskNotFoundException ex) {
        ErrorResponse error = new ErrorResponse("ERROR", OffsetDateTime.now(), ex.getMessage(), null);
        return new ResponseEntity<>(error, HttpStatus.NOT_FOUND);
    }

    @ExceptionHandler(MethodArgumentNotValidException.class)
    public ResponseEntity<ErrorResponse> handleValidationErrors(MethodArgumentNotValidException ex) {
        Map<String, String> fieldErrors = new HashMap<>();
        ex.getBindingResult().getAllErrors().forEach((error) -> {
            String fieldName = ((FieldError) error).getField();
            String errorMessage = error.getDefaultMessage();
            fieldErrors.put(fieldName, errorMessage);
        });
        ErrorResponse error = new ErrorResponse("ERROR", OffsetDateTime.now(), "Validation failed", fieldErrors);
        return new ResponseEntity<>(error, HttpStatus.BAD_REQUEST);
    }

    @ExceptionHandler(HttpMessageNotReadableException.class)
    public ResponseEntity<ErrorResponse> handleBadJson(HttpMessageNotReadableException ex) {
        ErrorResponse error = new ErrorResponse(
                "ERROR",
                OffsetDateTime.now(),
                "Malformed JSON or invalid date format. Ensure dates are ISO-8601 (e.g., 2026-06-20T18:00:00Z).",
                null
        );
        return new ResponseEntity<>(error, HttpStatus.BAD_REQUEST);
    }

    // V-01: Replaced printStackTrace() + class name in response with proper logging + generic message
    @ExceptionHandler(Exception.class)
    public ResponseEntity<ErrorResponse> handleGenericException(Exception ex) {
        log.error("Unhandled exception occurred", ex); // full stack trace goes to logs, not response
        ErrorResponse error = new ErrorResponse(
                "ERROR",
                OffsetDateTime.now(),
                "An unexpected internal server error occurred.",
                null
        );
        return new ResponseEntity<>(error, HttpStatus.INTERNAL_SERVER_ERROR);
    }
}
