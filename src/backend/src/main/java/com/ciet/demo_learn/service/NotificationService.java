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

    public void notifyEvaluatorsSelected(UUID cycleSubjectId) {
        log.info("Evaluators selected for cycleSubjectId={}", cycleSubjectId);
    }

    public void notifyEvaluationSubmitted(UUID cycleEvaluatorId) {
        log.info("Notificação: avaliação submetida. cycleEvaluatorId={}", cycleEvaluatorId);
    }

    public void notifyPdmEvaluationSubmitted(UUID cycleEvaluatorId) {
        log.info("PDM evaluation submitted: cycleEvaluatorId={}", cycleEvaluatorId);
    }

    public void notifyCfClosedBySubject(UUID cycleSubjectId) {
        log.info("CF encerrado manualmente pela sujeita: cycleSubjectId={}", cycleSubjectId);
    }
}
