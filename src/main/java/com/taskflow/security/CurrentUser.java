package com.taskflow.security;
import org.springframework.stereotype.Component;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.authentication.AuthenticationCredentialsNotFoundException;
import java.util.UUID;
@Component
public class CurrentUser {
    public record Identity(UUID id, String username) {}
    public Identity identity() {
        var auth = SecurityContextHolder.getContext().getAuthentication();
        if (auth == null || !(auth.getPrincipal() instanceof Identity identity))
            throw new AuthenticationCredentialsNotFoundException("Sign in required");
        return identity;
    }
    public UUID id() { return identity().id(); }
}
