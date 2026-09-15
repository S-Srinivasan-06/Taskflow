package com.taskflow.config;
import org.springframework.boot.ApplicationArguments;
import org.springframework.boot.ApplicationRunner;
import org.springframework.boot.actuate.health.*;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Component;
@Component("schema")
public class SchemaHealth implements HealthIndicator, ApplicationRunner {
    private final JdbcTemplate jdbc;
    private final int required;
    public SchemaHealth(JdbcTemplate jdbc, @Value("${app.required-schema-version:0}") int required) {
        this.jdbc = jdbc; this.required = required;
    }
    private boolean ready() {
        return required == 0 || Integer.valueOf(required).equals(jdbc.queryForObject(
            "select version from app.schema_version where id = 1", Integer.class));
    }
    @Override public void run(ApplicationArguments args) {
        if (!ready()) throw new IllegalStateException("Apply the committed Supabase migrations before deploying this backend");
    }
    @Override public Health health() {
        try { return ready() ? Health.up().build() : Health.down().build(); }
        catch (Exception ignored) { return Health.down().build(); }
    }
}
