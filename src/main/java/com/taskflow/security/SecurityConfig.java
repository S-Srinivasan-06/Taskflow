package com.taskflow.security;
import org.springframework.context.annotation.*;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.config.http.SessionCreationPolicy;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.security.web.SecurityFilterChain;
import org.springframework.security.web.authentication.AnonymousAuthenticationFilter;
import org.springframework.security.web.csrf.*;
import org.springframework.web.cors.*;
import java.util.*;
@Configuration
public class SecurityConfig {
    @Bean PasswordEncoder passwordEncoder() { return new BCryptPasswordEncoder(12); }
    @Bean SecurityFilterChain security(HttpSecurity http, AuthService auth,
            @Value("${app.proxy-secret:}") String proxySecret,
            @Value("${app.proxy-required:false}") boolean proxyRequired,
            @Value("${app.cookie-secure:false}") boolean secure,
            @Value("${app.cors-origins:http://localhost:5173}") String origins) throws Exception {
        CookieCsrfTokenRepository csrf = new CookieCsrfTokenRepository();
        csrf.setCookieCustomizer(cookie -> cookie.httpOnly(true).secure(secure).sameSite("Lax").path("/"));
        var cors = new CorsConfiguration();
        cors.setAllowedOrigins(Arrays.stream(origins.split(",")).map(String::trim).toList());
        cors.setAllowedMethods(List.of("GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"));
        cors.setAllowedHeaders(List.of("Content-Type", "X-XSRF-TOKEN", "X-Timezone"));
        cors.setExposedHeaders(List.of("X-Taskflow-User"));
        cors.setAllowCredentials(true);
        var source = new UrlBasedCorsConfigurationSource();
        source.registerCorsConfiguration("/**", cors);
        http.cors(c -> c.configurationSource(source))
            .csrf(c -> c.csrfTokenRepository(csrf).csrfTokenRequestHandler(new CsrfTokenRequestAttributeHandler()))
            .sessionManagement(c -> c.sessionCreationPolicy(SessionCreationPolicy.STATELESS))
            .requestCache(c -> c.disable())
            .formLogin(c -> c.disable()).httpBasic(c -> c.disable()).logout(c -> c.disable())
            .authorizeHttpRequests(c -> c
                .requestMatchers("/api/v1/auth/csrf", "/api/v1/auth/login", "/api/v1/auth/register", "/actuator/health/readiness", "/actuator/health/liveness", "/error").permitAll()
                .anyRequest().authenticated())
            .exceptionHandling(c -> c
                .authenticationEntryPoint((req, res, e) -> {
                    res.setStatus(401); res.setContentType("application/json");
                    res.getWriter().write("{\"message\":\"Sign in required\"}");
                })
                .accessDeniedHandler((req, res, e) -> {
                    res.setStatus(403); res.setContentType("application/json");
                    res.getWriter().write("{\"message\":\"Request verification failed; refresh and try again\"}");
                }))
            .addFilterBefore(new SessionFilter(auth), AnonymousAuthenticationFilter.class)
            .addFilterBefore(new TrustedProxyFilter(proxySecret, proxyRequired), org.springframework.security.web.csrf.CsrfFilter.class);
        return http.build();
    }
}
