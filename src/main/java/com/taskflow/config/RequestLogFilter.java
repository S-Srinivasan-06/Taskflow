package com.taskflow.config;
import jakarta.servlet.*;
import jakarta.servlet.http.*;
import org.slf4j.*;
import org.springframework.core.annotation.Order;
import org.springframework.stereotype.Component;
import org.springframework.web.filter.OncePerRequestFilter;
import java.io.IOException;
import java.util.UUID;
@Component @Order(-200)
public class RequestLogFilter extends OncePerRequestFilter {
    private static final Logger log = LoggerFactory.getLogger(RequestLogFilter.class);
    @Override protected void doFilterInternal(HttpServletRequest req, HttpServletResponse res, FilterChain chain)
            throws ServletException, IOException {
        String id = UUID.randomUUID().toString();
        res.setHeader("X-Request-ID", id);
        res.setHeader("Cache-Control", "private, no-store");
        long started = System.nanoTime();
        try (var ignored = MDC.putCloseable("requestId", id)) {
            try { chain.doFilter(req, res); }
            finally { log.info("method={} status={} durationMs={}", req.getMethod(), res.getStatus(), (System.nanoTime() - started) / 1_000_000); }
        }
    }
}
