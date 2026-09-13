package com.taskflow.security;
import org.springframework.data.jpa.repository.JpaRepository;
import java.time.OffsetDateTime;
public interface SessionRepository extends JpaRepository<LoginSession, String> {
    void deleteByExpiresAtBefore(OffsetDateTime time);
}
