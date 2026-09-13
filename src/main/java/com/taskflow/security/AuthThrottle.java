package com.taskflow.security;
import org.springframework.stereotype.Component;
import org.springframework.web.server.ResponseStatusException;
import org.springframework.http.HttpStatus;
import java.util.HashMap;
import java.util.Map;
/** Bounded in-memory abuse protection. Production ingress should also rate-limit by IP. */
@Component
public class AuthThrottle {
    private record Window(long start, int count) {}
    private final Map<String, Window> windows = new HashMap<>();
    public synchronized void check(String key, int limit) {
        long now = System.currentTimeMillis();
        windows.entrySet().removeIf(e -> now - e.getValue().start() >= 600_000);
        var old = windows.getOrDefault(key, new Window(now, 0));
        if (old.count() >= limit || (!windows.containsKey(key) && windows.size() >= 10_000))
            throw new ResponseStatusException(HttpStatus.TOO_MANY_REQUESTS, "Too many attempts; try again in 10 minutes");
        windows.put(key, new Window(old.start(), old.count() + 1));
    }
}
