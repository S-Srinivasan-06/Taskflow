package com.taskflow.security;
import jakarta.servlet.http.*;
import jakarta.validation.Valid;
import jakarta.validation.constraints.*;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.*;
import org.springframework.security.web.csrf.CsrfToken;
import org.springframework.web.bind.annotation.*;
import java.time.Duration;
import java.util.*;
@RestController @RequestMapping("/api/v1/auth")
public class AuthController {
    public record Signup(
        @NotBlank @Pattern(regexp = "[A-Za-z0-9_.-]{3,32}", message = "User ID must be 3-32 letters, numbers, dots, underscores or hyphens") String username,
        @NotBlank @Size(min=8, max=64) String password,
        @NotBlank @Size(min=8, max=64) String confirmPassword) {}
    public record Login(@NotBlank @Pattern(regexp = "[A-Za-z0-9_.-]{3,32}") String username,
                        @NotBlank @Size(min=8, max=64) String password) {}
    private final AuthService auth;
    private final CurrentUser current;
    private final AuthThrottle throttle;
    private final boolean secure;
    public AuthController(AuthService auth, CurrentUser current, AuthThrottle throttle,
                          @Value("${app.cookie-secure:false}") boolean secure) {
        this.auth = auth; this.current = current; this.throttle = throttle; this.secure = secure;
    }
    @GetMapping("/csrf") public Map<String, String> csrf(CsrfToken token) { return Map.of("token", token.getToken()); }
    @GetMapping("/me") public CurrentUser.Identity me() { return current.identity(); }
    @PostMapping("/register")
    public ResponseEntity<CurrentUser.Identity> register(@Valid @RequestBody Signup dto,
                                                          HttpServletRequest req, HttpServletResponse res) {
        throttle.check("register:" + TrustedProxyFilter.clientIp(req), 10);
        AppUser user = auth.register(dto.username(), dto.password(), dto.confirmPassword());
        signIn(user, req, res);
        return ResponseEntity.status(201).body(new CurrentUser.Identity(user.getId(), user.getUsername()));
    }
    @PostMapping("/login")
    public CurrentUser.Identity login(@Valid @RequestBody Login dto, HttpServletRequest req, HttpServletResponse res) {
        throttle.check("login-ip:" + TrustedProxyFilter.clientIp(req), 30);
        throttle.check("login-user:" + dto.username().toLowerCase(Locale.ROOT), 15);
        AppUser user = auth.login(dto.username(), dto.password());
        signIn(user, req, res);
        return new CurrentUser.Identity(user.getId(), user.getUsername());
    }
    private void signIn(AppUser user, HttpServletRequest req, HttpServletResponse res) {
        auth.revoke(SessionFilter.token(req));
        cookie(res, auth.issueSession(user), Duration.ofHours(12));
    }
    @PostMapping("/logout")
    public ResponseEntity<Void> logout(HttpServletRequest req, HttpServletResponse res) {
        auth.revoke(SessionFilter.token(req)); cookie(res, "", Duration.ZERO);
        return ResponseEntity.noContent().build();
    }
    private void cookie(HttpServletResponse res, String token, Duration age) {
        res.addHeader(HttpHeaders.SET_COOKIE, ResponseCookie.from(SessionFilter.COOKIE, token)
            .httpOnly(true).secure(secure).sameSite("Lax").path("/").maxAge(age).build().toString());
    }
}
