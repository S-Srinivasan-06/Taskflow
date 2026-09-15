package com.taskflow.security;
import org.springframework.stereotype.Component;
import org.springframework.web.server.ResponseStatusException;
import org.springframework.http.HttpStatus;
/** Shared, bounded rate windows survive restarts and multiple backend instances. */
@Component
public class AuthThrottle {
    private final RateLimitStore store;
    public AuthThrottle(RateLimitStore store) { this.store = store; }
    public void check(String key, int limit) {
        // The store commits before throwing; rejected logins cannot roll back limits.
        if (!store.consume(AuthService.hash(key), limit))
            throw new ResponseStatusException(HttpStatus.TOO_MANY_REQUESTS, "Too many attempts; try again in 10 minutes");
    }
}
