package com.ciet.demo_learn.scheduler;

import com.ciet.demo_learn.enums.CycleStatus;
import com.ciet.demo_learn.model.Cycle;
import com.ciet.demo_learn.model.CycleSubject;
import com.ciet.demo_learn.service.CycleService;
import com.ciet.demo_learn.service.CycleSubjectService;
import com.ciet.demo_learn.service.NotificationService;
import com.ciet.demo_learn.service.OnaService;
import com.ciet.demo_learn.service.UserService;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;
import java.time.temporal.ChronoUnit;
import java.util.List;
import java.util.UUID;

@Component
public class CfValidationExpiryScheduler {

    private static final Logger log = LoggerFactory.getLogger(CfValidationExpiryScheduler.class);

    private final CycleSubjectService cycleSubjectService;
    private final CycleService cycleService;
    private final OnaService onaService;
    private final UserService userService;
    private final NotificationService notificationService;

    public CfValidationExpiryScheduler(
            CycleSubjectService cycleSubjectService,
            CycleService cycleService,
            OnaService onaService,
            UserService userService,
            NotificationService notificationService) {
        this.cycleSubjectService = cycleSubjectService;
        this.cycleService = cycleService;
        this.onaService = onaService;
        this.userService = userService;
        this.notificationService = notificationService;
    }

    @Scheduled(cron = "0 0 * * * *")
    public void expireValidations() {
        log.info("CfValidationExpiryScheduler started");
        List<CycleSubject> expired = cycleSubjectService.findAllExpiredValidations(Instant.now());
        log.info("Found {} expired cycle subjects", expired.size());

        for (CycleSubject cycleSubject : expired) {
            try {
                processExpiredSubject(cycleSubject);
            } catch (Exception e) {
                log.error("Failed to expire cycleSubjectId={}: {}", cycleSubject.getId(), e.getMessage(), e);
            }
        }

        log.info("CfValidationExpiryScheduler finished");
    }

    @Transactional
    public void processExpiredSubject(CycleSubject cycleSubject) {
        UUID subjectUserId = cycleSubject.getSubjectUser().getId();
        UUID pdmId = userService.findPdmIdByUserId(subjectUserId).orElse(null);

        onaService.suggestAndCreateEvaluators(cycleSubject, subjectUserId, pdmId);

        Instant now = Instant.now();
        cycleSubject.setStatus("COLLECTING");
        cycleSubject.setCollectionStartAt(now);
        cycleSubjectService.save(cycleSubject);

        Cycle cycle = cycleSubject.getCycle();
        cycle.setStatus(CycleStatus.COLLECTING);
        cycle.setCollectionStartAt(now);
        cycle.setCollectionDeadline(now.plus(10, ChronoUnit.DAYS));
        cycleService.save(cycle);

        notificationService.notifyEvaluatorsSelected(cycleSubject.getId());

        log.info("Expired cycleSubjectId={} transitioned to COLLECTING", cycleSubject.getId());
    }
}
