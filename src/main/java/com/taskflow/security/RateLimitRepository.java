package com.taskflow.security;
import org.springframework.data.jpa.repository.*;
import java.time.OffsetDateTime;
public interface RateLimitRepository extends JpaRepository<RateLimitWindow, String> {
    @Modifying @Query("delete from RateLimitWindow w where w.expiresAt <= :now")
    void deleteExpired(OffsetDateTime now);
}
