package com.taskflow.security;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.web.server.ResponseStatusException;
import org.springframework.http.HttpStatus;
import java.nio.charset.StandardCharsets;
import java.security.*;
import java.time.OffsetDateTime;
import java.util.*;
@Service @Transactional
public class AuthService {
    private final UserRepository users;
    private final SessionRepository sessions;
    private final PasswordEncoder encoder;
    private final SecureRandom random = new SecureRandom();
    private final String dummyHash;
    public AuthService(UserRepository users, SessionRepository sessions, PasswordEncoder encoder) {
        this.users = users; this.sessions = sessions; this.encoder = encoder;
        this.dummyHash = encoder.encode(UUID.randomUUID().toString());
    }
    public AppUser register(String username, String password, String confirmation) {
        if (!Objects.equals(password, confirmation))
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Passwords do not match");
        checkPassword(password);
        var name = username.toLowerCase(Locale.ROOT);
        if (users.findByUsername(name).isPresent())
            throw new ResponseStatusException(HttpStatus.CONFLICT, "User ID is unavailable");
        AppUser user = new AppUser();
        user.setUsername(name); user.setPasswordHash(encoder.encode(password));
        return users.saveAndFlush(user);
    }
    public AppUser login(String username, String password) {
        checkPassword(password);
        var user = users.findByUsername(username.toLowerCase(Locale.ROOT));
        boolean matches = encoder.matches(password, user.map(AppUser::getPasswordHash).orElse(dummyHash));
        if (!matches || user.isEmpty())
            throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Invalid user ID or password");
        return user.get();
    }
    private void checkPassword(String password) {
        if (password == null || password.length() < 8 || password.getBytes(StandardCharsets.UTF_8).length > 64)
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Password must contain at least 8 characters and at most 64 UTF-8 bytes");
    }
    public String issueSession(AppUser user) {
        sessions.deleteByExpiresAtBefore(OffsetDateTime.now());
        byte[] bytes = new byte[32]; random.nextBytes(bytes);
        String token = Base64.getUrlEncoder().withoutPadding().encodeToString(bytes);
        LoginSession session = new LoginSession();
        session.setTokenHash(hash(token)); session.setUserId(user.getId());
        session.setExpiresAt(OffsetDateTime.now().plusHours(12));
        sessions.save(session); return token;
    }
    @Transactional(readOnly = true)
    public Optional<CurrentUser.Identity> authenticate(String token) {
        if (token == null || !token.matches("[A-Za-z0-9_-]{43}")) return Optional.empty();
        return sessions.findIdentity(hash(token), OffsetDateTime.now())
            .map(u -> new CurrentUser.Identity(u.getId(), u.getUsername()));
    }
    public void revoke(String token) {
        if (token != null && token.matches("[A-Za-z0-9_-]{43}")) sessions.deleteById(hash(token));
    }
    static String hash(String token) {
        try { return HexFormat.of().formatHex(MessageDigest.getInstance("SHA-256").digest(token.getBytes(StandardCharsets.UTF_8))); }
        catch (NoSuchAlgorithmException e) { throw new IllegalStateException(e); }
    }
}
