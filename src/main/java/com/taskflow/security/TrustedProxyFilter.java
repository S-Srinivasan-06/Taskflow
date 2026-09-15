package com.taskflow.security;
import jakarta.servlet.*;
import jakarta.servlet.http.*;
import org.springframework.web.filter.OncePerRequestFilter;
import java.io.IOException;
import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
/** Only the server-side Vercel proxy can assert a client address in Render mode. */
public class TrustedProxyFilter extends OncePerRequestFilter {
    public static final String CLIENT_IP = "taskflow.clientIp";
    private final byte[] secret;
    public TrustedProxyFilter(String secret, boolean required) {
        if (required && secret.length() < 32) throw new IllegalStateException("TASKFLOW_PROXY_SECRET must contain at least 32 characters");
        this.secret = secret.getBytes(StandardCharsets.UTF_8);
    }
    @Override protected void doFilterInternal(HttpServletRequest req, HttpServletResponse res, FilterChain chain)
            throws ServletException, IOException {
        if (secret.length == 0 || !req.getRequestURI().startsWith("/api/")) { chain.doFilter(req, res); return; }
        String supplied = req.getHeader("X-Taskflow-Proxy-Secret");
        if (supplied == null || !MessageDigest.isEqual(secret, supplied.getBytes(StandardCharsets.UTF_8))) {
            res.setStatus(403); res.setContentType("application/json");
            res.getWriter().write("{\"message\":\"Use the Taskflow website to access this API\"}"); return;
        }
        String ip = req.getHeader("X-Taskflow-Client-IP");
        if (ip == null || ip.length() > 64 || !ip.matches("[0-9a-fA-F:.]+")) {
            res.setStatus(400); return;
        }
        req.setAttribute(CLIENT_IP, ip);
        chain.doFilter(req, res);
    }
    public static String clientIp(HttpServletRequest req) {
        var verified = req.getAttribute(CLIENT_IP);
        return verified instanceof String ip ? ip : req.getRemoteAddr();
    }
}
