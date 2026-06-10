package com.taskflow.enums;

// Represents the full lifecycle of a Task; stored as a STRING in the DB for readability
public enum TaskStatus {
    PENDING,      // Task created but not yet started
    IN_PROGRESS,  // Task is actively being worked on
    DONE,         // Task has been completed
    CANCELLED     // Task was abandoned before completion
}
