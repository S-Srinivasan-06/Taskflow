package com.taskflow.repository;
import com.taskflow.entity.Task;
import org.springframework.data.jpa.repository.*;
import java.util.*;
public interface TaskRepository extends JpaRepository<Task, UUID>, JpaSpecificationExecutor<Task> {
    Optional<Task> findByIdAndUserIdAndIsDeletedFalse(UUID id, UUID userId);
}
