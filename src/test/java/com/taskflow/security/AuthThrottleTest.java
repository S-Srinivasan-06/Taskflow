package com.taskflow.security;

import org.junit.jupiter.api.Test;
import org.springframework.web.server.ResponseStatusException;

import static org.junit.jupiter.api.Assertions.assertDoesNotThrow;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.mockito.Mockito.*;

class AuthThrottleTest {

    @Test
    void enforcesThePerKeyLimit() {
        var store = mock(RateLimitStore.class);
        when(store.consume(anyString(), eq(1))).thenReturn(true, false);
        var throttle = new AuthThrottle(store);

        throttle.check("login-user:alice", 1);

        assertThrows(ResponseStatusException.class,
                () -> throttle.check("login-user:alice", 1));
    }

    @Test
    void evictsTheOldestKeyInsteadOfLockingOutNewUsersAtCapacity() {
        var store = mock(RateLimitStore.class);
        when(store.consume(anyString(), anyInt())).thenReturn(true);
        var throttle = new AuthThrottle(store);
        assertDoesNotThrow(() -> throttle.check("login-user:new-user", 1));
        verify(store).consume(anyString(), eq(1));
    }
}
