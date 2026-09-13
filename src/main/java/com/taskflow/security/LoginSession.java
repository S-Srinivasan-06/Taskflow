package com.taskflow.security;
import jakarta.persistence.*;
import lombok.*;
import java.time.OffsetDateTime;
import java.util.UUID;
@Entity @Table(name = "login_sessions") @Getter @Setter @NoArgsConstructor
public class LoginSession {
    @Id @Column(length = 64) private String tokenHash;
    @Column(nullable = false) private UUID userId;
    @Column(nullable = false) private OffsetDateTime expiresAt;
}
