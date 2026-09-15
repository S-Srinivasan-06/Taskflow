package com.taskflow.security;
import org.springframework.data.jpa.repository.JpaRepository;
import java.time.OffsetDateTime;
public interface SessionRepository extends JpaRepository<LoginSession, String> {
    interface IdentityView { java.util.UUID getId(); String getUsername(); }
    @org.springframework.data.jpa.repository.Query("select u.id as id, u.username as username from LoginSession s, AppUser u where s.userId = u.id and s.tokenHash = :hash and s.expiresAt > :now")
    java.util.Optional<IdentityView> findIdentity(String hash, OffsetDateTime now);
    void deleteByExpiresAtBefore(OffsetDateTime time);
}
