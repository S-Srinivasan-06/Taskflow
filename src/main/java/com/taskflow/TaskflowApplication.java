package com.taskflow;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.data.jpa.repository.config.EnableJpaAuditing;

// Entry point for the Taskflow Spring Boot application
@SpringBootApplication
@EnableJpaAuditing(dateTimeProviderRef = "offsetDateTimeProvider") // Activates automatic population of @CreatedDate and @LastModifiedDate fields
public class TaskflowApplication {

	public static void main(String[] args) {
		SpringApplication.run(TaskflowApplication.class, args);
	}

}
