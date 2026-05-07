package com.ciet.demo_learn.domain.notification;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.*;
public interface NotificationRepository extends JpaRepository<Notification, UUID> {
    List<Notification> findAllByUserIdAndReadFalseOrderByCreatedAtDesc(UUID userId);
    long countByUserIdAndReadFalse(UUID userId);
}
