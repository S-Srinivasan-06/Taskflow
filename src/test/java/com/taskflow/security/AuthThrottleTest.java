package com.taskflow.security;

import org.junit.jupiter.api.Test;
import org.springframework.web.server.ResponseStatusException;

import static org.junit.jupiter.api.Assertions.assertDoesNotThrow;
import static org.junit.jupiter.api.Assertions.assertThrows;

class AuthThrottleTest {

    @Test
    void enforcesThePerKeyLimit() {
        var throttle = new AuthThrottle();

        throttle.check("login-user:alice", 1);

        assertThrows(ResponseStatusException.class,
                () -> throttle.check("login-user:alice", 1));
    }

    @Test
    void evictsTheOldestKeyInsteadOfLockingOutNewUsersAtCapacity() {
        var throttle = new AuthThrottle();
        for (int index = 0; index < 10_000; index++) {
            throttle.check("login-user:user-" + index, 1);
        }

        assertDoesNotThrow(() -> throttle.check("login-user:new-user", 1));
        assertDoesNotThrow(() -> throttle.check("login-user:user-0", 1));
    }
}
