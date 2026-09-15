package com.taskflow.security;

import com.fasterxml.jackson.databind.*;
import org.junit.jupiter.api.*;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.test.context.*;
import org.springframework.test.web.servlet.*;
import org.testcontainers.containers.PostgreSQLContainer;
import org.testcontainers.junit.jupiter.*;
import jakarta.servlet.http.Cookie;
import java.nio.file.*;
import java.sql.*;
import java.util.*;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;
import static org.assertj.core.api.Assertions.*;
import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.csrf;

@SpringBootTest @AutoConfigureMockMvc @Testcontainers
class AuthOwnershipIntegrationTest {
    @Container static PostgreSQLContainer<?> db = new PostgreSQLContainer<>("postgres:17-alpine");
    @DynamicPropertySource static void properties(DynamicPropertyRegistry r) throws Exception {
        try (var c = DriverManager.getConnection(db.getJdbcUrl(), db.getUsername(), db.getPassword());
             var statement = c.createStatement()) {
            statement.execute("create role anon; create role authenticated;");
            statement.execute(Files.readString(Path.of("supabase/migrations/20260913143000_create_taskflow_schema.sql")));
            statement.execute(Files.readString(Path.of("supabase/migrations/20260913160000_add_accounts_and_ownership.sql")));
            statement.execute(Files.readString(Path.of("supabase/migrations/20260915120000_harden_runtime.sql")));
        }
        r.add("spring.datasource.url", db::getJdbcUrl);
        r.add("spring.datasource.username", db::getUsername);
        r.add("spring.datasource.password", db::getPassword);
        r.add("spring.jpa.properties.hibernate.default_schema", () -> "app");
        r.add("spring.jpa.hibernate.ddl-auto", () -> "validate");
        r.add("spring.cache.type", () -> "none");
    }
    @Autowired MockMvc mvc;
    @Autowired ObjectMapper json;
    @Autowired UserRepository users;
    @Autowired SessionRepository sessions;
    static final String PASSWORD = "a-test-password-123";
    Cookie register(String name) throws Exception {
        var result = mvc.perform(post("/api/v1/auth/register").with(csrf()).contentType("application/json")
            .content(json.writeValueAsString(Map.of("username",name,"password",PASSWORD,"confirmPassword",PASSWORD))))
            .andExpect(status().isCreated()).andReturn();
        assertThat(result.getResponse().getHeader("Set-Cookie")).contains("HttpOnly").contains("SameSite=Lax");
        return result.getResponse().getCookie(SessionFilter.COOKIE);
    }
    JsonNode task(Cookie cookie) throws Exception {
        return json.readTree(mvc.perform(post("/api/v1/tasks").with(csrf()).cookie(cookie).contentType("application/json")
            .content("{\"title\":\"Owner only\",\"dueAt\":\"2030-01-02T12:00:00Z\"}"))
            .andExpect(status().isCreated()).andReturn().getResponse().getContentAsString());
    }
    @Test void rejectsAnonymousAndCsrfLessRequests() throws Exception {
        mvc.perform(get("/api/v1/tasks")).andExpect(status().isUnauthorized());
        mvc.perform(post("/api/v1/auth/login").contentType("application/json").content("{}")).andExpect(status().isForbidden());
        var c = register("csrfuser");
        mvc.perform(post("/api/v1/tasks").cookie(c).contentType("application/json").content("{\"title\":\"bad\"}"))
            .andExpect(status().isForbidden());
        mvc.perform(get("/api/v1/auth/csrf")).andExpect(status().isOk()).andExpect(jsonPath("$.token").isString());
    }
    @Test void isolatesEveryTaskSurfaceAndRejectsForeignMutations() throws Exception {
        var alice = register("alice"); var bob = register("bob");
        var task = task(alice); var id = task.get("id").asText();
        for (String path : List.of("", "/search", "/up-next"))
            mvc.perform(get("/api/v1/tasks"+path).cookie(bob)).andExpect(status().isOk()).andExpect(jsonPath("$.totalElements").value(0));
        mvc.perform(get("/api/v1/tasks/calendar?year=2030&month=1").cookie(bob))
            .andExpect(status().isOk()).andExpect(content().json("[]"));
        mvc.perform(get("/api/v1/tasks/stats").cookie(bob)).andExpect(status().isOk()).andExpect(jsonPath("$.totalActive").value(0));
        mvc.perform(get("/api/v1/tasks/"+id).cookie(bob)).andExpect(status().isNotFound());
        mvc.perform(put("/api/v1/tasks/"+id).cookie(bob).with(csrf()).contentType("application/json")
            .content("{\"title\":\"stolen\",\"version\":0}")).andExpect(status().isNotFound());
        mvc.perform(patch("/api/v1/tasks/"+id+"/status").cookie(bob).with(csrf()).contentType("application/json")
            .content("{\"status\":\"DONE\",\"version\":0}")).andExpect(status().isNotFound());
        mvc.perform(delete("/api/v1/tasks/"+id+"?version=0").cookie(bob).with(csrf())).andExpect(status().isNotFound());
        mvc.perform(get("/api/v1/tasks/"+id).cookie(alice)).andExpect(status().isOk()).andExpect(jsonPath("$.title").value("Owner only"));
    }
    @Test void validatesSignupAndLoginHashesPasswordsAndRevokesLogout() throws Exception {
        mvc.perform(post("/api/v1/auth/register").with(csrf()).contentType("application/json")
            .content(json.writeValueAsString(Map.of("username","mismatch","password",PASSWORD,"confirmPassword",PASSWORD+"x"))))
            .andExpect(status().isBadRequest());
        var cookie = register("loginuser");
        assertThat(users.findByUsername("loginuser").orElseThrow().getPasswordHash()).startsWith("$2a$").isNotEqualTo(PASSWORD);
        assertThat(sessions.findAll()).noneMatch(s -> s.getTokenHash().equals(cookie.getValue()));
        mvc.perform(post("/api/v1/auth/login").with(csrf()).contentType("application/json")
            .content(json.writeValueAsString(Map.of("username","loginuser","password","wrong-password-long"))))
            .andExpect(status().isUnauthorized());
        mvc.perform(post("/api/v1/auth/logout").with(csrf()).cookie(cookie)).andExpect(status().isNoContent());
        mvc.perform(get("/api/v1/auth/me").cookie(cookie)).andExpect(status().isUnauthorized());
        mvc.perform(post("/api/v1/auth/login").with(csrf()).contentType("application/json")
            .content(json.writeValueAsString(Map.of("username","LOGINUSER","password",PASSWORD))))
            .andExpect(status().isOk()).andExpect(jsonPath("$.username").value("loginuser"));
    }
    @Test void checksVersionsSoftDeleteFiltersAndBadInput() throws Exception {
        var cookie = register("versionuser"); var t = task(cookie); var id = t.get("id").asText();
        mvc.perform(patch("/api/v1/tasks/"+id+"/status").cookie(cookie).with(csrf()).contentType("application/json")
            .content("{\"status\":\"DONE\",\"version\":0}")).andExpect(status().isOk()).andExpect(jsonPath("$.version").value(1));
        mvc.perform(put("/api/v1/tasks/"+id).cookie(cookie).with(csrf()).contentType("application/json")
            .content("{\"title\":\"old\",\"version\":0}")).andExpect(status().isConflict());
        mvc.perform(get("/api/v1/tasks/search?quickFilter=nonsense").cookie(cookie)).andExpect(status().isBadRequest());
        mvc.perform(get("/api/v1/tasks/not-a-uuid").cookie(cookie)).andExpect(status().isBadRequest());
        mvc.perform(get("/api/v1/tasks/calendar?year=2030&month=13").cookie(cookie)).andExpect(status().isBadRequest());
        mvc.perform(delete("/api/v1/tasks/"+id+"?version=1").cookie(cookie).with(csrf())).andExpect(status().isNoContent());
        mvc.perform(get("/api/v1/tasks/"+id).cookie(cookie)).andExpect(status().isNotFound());
    }
}
