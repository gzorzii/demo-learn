package com.ciet.demo_learn.service;

import com.ciet.demo_learn.dto.ActiveCycleSummaryDto;
import com.ciet.demo_learn.dto.EligibilityStatusDto;
import com.ciet.demo_learn.dto.TeamMemberDto;
import com.ciet.demo_learn.dto.TeamMembersResponse;
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

import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

import java.time.Instant;
import java.time.LocalDate;
import java.time.temporal.ChronoUnit;
import java.util.List;
import java.util.UUID;

@Service
@Transactional(readOnly = true)
public class MyTeamService {

    private final UserService userService;
    private final CycleSubjectService cycleSubjectService;
    private final CycleBlackoutService cycleBlackoutService;
    private final CycleService cycleService;
    private final CycleEvaluatorService cycleEvaluatorService;
    private final OnaService onaService;
    private final NotificationService notificationService;

    public MyTeamService(
            UserService userService,
            CycleSubjectService cycleSubjectService,
            CycleBlackoutService cycleBlackoutService,
            CycleService cycleService,
            CycleEvaluatorService cycleEvaluatorService,
            OnaService onaService,
            NotificationService notificationService) {
        this.userService = userService;
        this.cycleSubjectService = cycleSubjectService;
        this.cycleBlackoutService = cycleBlackoutService;
        this.cycleService = cycleService;
        this.cycleEvaluatorService = cycleEvaluatorService;
        this.onaService = onaService;
        this.notificationService = notificationService;
    }

    public TeamMembersResponse getTeamMembers(UUID pdmId) {
        List<User> members = userService.findActiveByPdmId(pdmId);
        List<TeamMemberDto> dtos = members.stream()
                .map(this::toTeamMemberDto)
                .toList();
        return new TeamMembersResponse(dtos);
    }

    @Transactional
    public void startCf(UUID pdmId, UUID subjectUserId) {
        User subject = userService.findById(subjectUserId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND));

        if (!userService.existsByIdAndPdmId(subjectUserId, pdmId)) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN);
        }

        if (cycleSubjectService.existsActiveCfBySubjectUserId(subjectUserId)) {
            throw new CfConflictException("CF_ALREADY_ACTIVE");
        }

        if (cycleSubjectService.existsActivePrBySubjectUserId(subjectUserId)) {
            throw new CfConflictException("PR_ALREADY_ACTIVE");
        }

        if (cycleBlackoutService.existsActiveBlackoutForUser(subjectUserId, Instant.now())) {
            throw new CfConflictException("BLACKOUT_ACTIVE");
        }

        Instant now = Instant.now();

        Cycle cycle = new Cycle();
        cycle.setCycleType(CycleType.CF);
        cycle.setTriggerType(TriggerType.MANUAL_PDM);
        cycle.setStatus(CycleStatus.VALIDATING_EVALUATORS);
        cycle.setYear(LocalDate.now().getYear());
        cycle.setQuarter(null);
        cycle.setIsBlackout(false);
        cycle.setName(null);
        Cycle savedCycle = cycleService.save(cycle);

        CycleSubject cycleSubject = new CycleSubject();
        cycleSubject.setCycle(savedCycle);
        cycleSubject.setSubjectUser(subject);
        cycleSubject.setStatus("VALIDATING_EVALUATORS");
        cycleSubject.setValidationDeadline(now.plus(7, ChronoUnit.DAYS));
        CycleSubject savedCycleSubject = cycleSubjectService.save(cycleSubject);

        User pdmUser = userService.findById(pdmId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND));

        CycleEvaluator selfEvaluator = new CycleEvaluator();
        selfEvaluator.setCycleSubject(savedCycleSubject);
        selfEvaluator.setEvaluatorUser(subject);
        selfEvaluator.setEvaluatorType(EvaluatorType.SELF);
        selfEvaluator.setIsMandatory(true);
        selfEvaluator.setStatus(EvaluatorStatus.PENDING);
        selfEvaluator.setSource(EvaluatorSource.ONA_SUGGESTION);
        cycleEvaluatorService.save(selfEvaluator);

        CycleEvaluator pdmEvaluator = new CycleEvaluator();
        pdmEvaluator.setCycleSubject(savedCycleSubject);
        pdmEvaluator.setEvaluatorUser(pdmUser);
        pdmEvaluator.setEvaluatorType(EvaluatorType.PDM);
        pdmEvaluator.setIsMandatory(true);
        pdmEvaluator.setStatus(EvaluatorStatus.PENDING);
        pdmEvaluator.setSource(EvaluatorSource.ONA_SUGGESTION);
        cycleEvaluatorService.save(pdmEvaluator);

        onaService.suggestAndCreateEvaluators(savedCycleSubject, subjectUserId, pdmId);

        notificationService.notifyNewCycle(subjectUserId, savedCycle.getId());
    }

    private TeamMemberDto toTeamMemberDto(User member) {
        UUID userId = member.getId();

        ActiveCycleSummaryDto activeCycle = cycleSubjectService.findActiveBySubjectUserId(userId)
                .stream()
                .findFirst()
                .map(cs -> new ActiveCycleSummaryDto(
                        cs.getCycle().getCycleType().name(),
                        cs.getStatus(),
                        cs.getId()))
                .orElse(null);

        EligibilityStatusDto eligibility = resolveEligibility(userId);

        return new TeamMemberDto(userId, member.getName(), member.getEmail(), activeCycle, eligibility);
    }

    private EligibilityStatusDto resolveEligibility(UUID userId) {
        if (cycleSubjectService.existsActiveCfBySubjectUserId(userId)) {
            return new EligibilityStatusDto(false, "CF_ALREADY_ACTIVE");
        }
        if (cycleSubjectService.existsActivePrBySubjectUserId(userId)) {
            return new EligibilityStatusDto(false, "PR_ALREADY_ACTIVE");
        }
        if (cycleBlackoutService.existsActiveBlackoutForUser(userId, Instant.now())) {
            return new EligibilityStatusDto(false, "BLACKOUT_ACTIVE");
        }
        return new EligibilityStatusDto(true, null);
    }
}
