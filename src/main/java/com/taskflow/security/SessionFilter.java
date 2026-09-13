package com.taskflow.security;
import jakarta.servlet.*;
import jakarta.servlet.http.*;
import org.springframework.web.filter.OncePerRequestFilter;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.context.SecurityContextHolder;
import java.io.IOException;
import java.util.List;
public class SessionFilter extends OncePerRequestFilter {
    public static final String COOKIE = "TASKFLOW_SESSION";
    private final AuthService auth;
    public SessionFilter(AuthService auth) { this.auth = auth; }
    public static String token(HttpServletRequest request) {
        if (request.getCookies() != null) for (var cookie : request.getCookies())
            if (COOKIE.equals(cookie.getName())) return cookie.getValue();
        return null;
    }
    @Override protected void doFilterInternal(HttpServletRequest req, HttpServletResponse res, FilterChain chain)
            throws ServletException, IOException {
        auth.authenticate(token(req)).ifPresent(identity -> {
            SecurityContextHolder.getContext().setAuthentication(
                new UsernamePasswordAuthenticationToken(identity, null, List.of()));
            res.setHeader("X-Taskflow-User", identity.id().toString());
        });
        chain.doFilter(req, res);
    }
}
