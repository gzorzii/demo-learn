package com.ciet.demo_learn.service;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;

import java.util.UUID;

@Service
public class NotificationService {

    private static final Logger log = LoggerFactory.getLogger(NotificationService.class);

    public void notifyNewCycle(UUID subjectUserId, UUID cycleId) {
        log.info("New cycle notification: subjectUserId={}, cycleId={}", subjectUserId, cycleId);
    }
}
