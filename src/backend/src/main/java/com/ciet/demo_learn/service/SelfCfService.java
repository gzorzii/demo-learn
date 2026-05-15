package com.ciet.demo_learn.service;

import com.ciet.demo_learn.enums.CycleStatus;
import com.ciet.demo_learn.enums.CycleType;
import com.ciet.demo_learn.enums.EvaluatorSource;
import com.ciet.demo_learn.enums.EvaluatorStatus;
import com.ciet.demo_learn.enums.EvaluatorType;
import com.ciet.demo_learn.enums.TriggerType;
import com.ciet.demo_learn.exception.CfConflictException;
import com.ciet.demo_learn.model.Cycle;
import com.ciet.demo_learn.model.CycleEvaluator;
import com.ciet.demo_learn.model.CycleSubject;
import com.ciet.demo_learn.model.User;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;
import java.time.LocalDate;
import java.time.temporal.ChronoUnit;
import java.util.UUID;

@Service
@Transactional
public class SelfCfService {

    private final CycleSubjectService cycleSubjectService;
    private final CycleBlackoutService cycleBlackoutService;
    private final CycleService cycleService;
    private final CycleEvaluatorService cycleEvaluatorService;
    private final UserService userService;
    private final OnaService onaService;
    private final NotificationService notificationService;

    public SelfCfService(
            CycleSubjectService cycleSubjectService,
            CycleBlackoutService cycleBlackoutService,
            CycleService cycleService,
            CycleEvaluatorService cycleEvaluatorService,
            UserService userService,
            OnaService onaService,
            NotificationService notificationService) {
        this.cycleSubjectService = cycleSubjectService;
        this.cycleBlackoutService = cycleBlackoutService;
        this.cycleService = cycleService;
        this.cycleEvaluatorService = cycleEvaluatorService;
        this.userService = userService;
        this.onaService = onaService;
        this.notificationService = notificationService;
    }

    public void startSelfCf(UUID userId) {
        if (cycleSubjectService.existsActiveCfBySubjectUserId(userId)) {
            throw new CfConflictException("CF_ALREADY_ACTIVE");
        }

        if (cycleSubjectService.existsActivePrBySubjectUserId(userId)) {
            throw new CfConflictException("PR_ALREADY_ACTIVE");
        }

        Instant now = Instant.now();

        cycleBlackoutService.findActiveBlackoutForUser(userId, now).ifPresent(blackout -> {
            throw new CfConflictException("BLACKOUT_ACTIVE", blackout.getEndsAt());
        });

        Cycle cycle = new Cycle();
        cycle.setCycleType(CycleType.CF);
        cycle.setTriggerType(TriggerType.MANUAL_COLLABORATOR);
        cycle.setStatus(CycleStatus.VALIDATING_EVALUATORS);
        cycle.setYear(LocalDate.now().getYear());
        cycle.setQuarter(null);
        cycle.setIsBlackout(false);
        cycle.setName(null);
        Cycle savedCycle = cycleService.save(cycle);

        User subjectUser = new User();
        subjectUser.setId(userId);

        CycleSubject cycleSubject = new CycleSubject();
        cycleSubject.setCycle(savedCycle);
        cycleSubject.setSubjectUser(subjectUser);
        cycleSubject.setStatus("VALIDATING_EVALUATORS");
        cycleSubject.setValidationDeadline(now.plus(7, ChronoUnit.DAYS));
        CycleSubject savedCycleSubject = cycleSubjectService.save(cycleSubject);

        User evaluatorUser = new User();
        evaluatorUser.setId(userId);

        CycleEvaluator selfEvaluator = new CycleEvaluator();
        selfEvaluator.setCycleSubject(savedCycleSubject);
        selfEvaluator.setEvaluatorUser(evaluatorUser);
        selfEvaluator.setEvaluatorType(EvaluatorType.SELF);
        selfEvaluator.setIsMandatory(true);
        selfEvaluator.setStatus(EvaluatorStatus.PENDING);
        selfEvaluator.setSource(EvaluatorSource.ONA_SUGGESTION);
        cycleEvaluatorService.save(selfEvaluator);

        userService.findPdmIdByUserId(userId).ifPresent(pdmId -> {
            User pdmUser = new User();
            pdmUser.setId(pdmId);

            CycleEvaluator pdmEvaluator = new CycleEvaluator();
            pdmEvaluator.setCycleSubject(savedCycleSubject);
            pdmEvaluator.setEvaluatorUser(pdmUser);
            pdmEvaluator.setEvaluatorType(EvaluatorType.PDM);
            pdmEvaluator.setIsMandatory(true);
            pdmEvaluator.setStatus(EvaluatorStatus.PENDING);
            pdmEvaluator.setSource(EvaluatorSource.ONA_SUGGESTION);
            cycleEvaluatorService.save(pdmEvaluator);

            onaService.suggestAndCreateEvaluators(savedCycleSubject, userId, pdmId);

            notificationService.notifyNewCycle(pdmId, savedCycle.getId());
        });
    }
}