package com.taskflow.enums;

// Represents the importance level of a Task; stored as a STRING in the DB for readability
public enum Priority {
    LOW,    // Nice-to-have, no deadline pressure
    MEDIUM, // Default priority for most tasks
    HIGH,   // Important, should be addressed soon
    URGENT  // Drop everything — needs immediate attention
}
