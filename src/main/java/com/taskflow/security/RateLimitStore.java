package com.taskflow.security;
import jakarta.persistence.EntityManager;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.*;
import java.time.OffsetDateTime;
@Service
public class RateLimitStore {
    private final RateLimitRepository windows;
    private final EntityManager entityManager;
    public RateLimitStore(RateLimitRepository windows, EntityManager entityManager) {
        this.windows = windows; this.entityManager = entityManager;
    }
    @Transactional(propagation = Propagation.REQUIRES_NEW)
    public boolean consume(String hash, int limit) {
        // A short PostgreSQL transaction lock protects both counters and the global cap.
        // No password hashing or external work runs while holding this lock.
        entityManager.createNativeQuery("select pg_advisory_xact_lock(52472026)").getSingleResult();
        var now = OffsetDateTime.now(java.time.ZoneOffset.UTC);
        var window = windows.findById(hash).orElse(null);
        if (window == null) {
            windows.deleteExpired(now);
            if (windows.count() >= 10_000) return false;
            window = new RateLimitWindow(); window.setKeyHash(hash);
            window.setExpiresAt(now.plusMinutes(10));
        } else if (!window.getExpiresAt().isAfter(now)) {
            window.setAttempts(0); window.setExpiresAt(now.plusMinutes(10));
        }
        if (window.getAttempts() >= limit) return false;
        window.setAttempts(window.getAttempts() + 1);
        windows.saveAndFlush(window);
        return true;
    }
}
