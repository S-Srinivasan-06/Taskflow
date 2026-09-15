package com.taskflow.security;
import jakarta.persistence.*;
import lombok.*;
import java.time.OffsetDateTime;
@Entity @Table(name = "auth_rate_limits") @Getter @Setter @NoArgsConstructor
public class RateLimitWindow {
    @Id @Column(length = 64) private String keyHash;
    @Column(nullable = false) private OffsetDateTime expiresAt;
    @Column(nullable = false) private int attempts;
}
