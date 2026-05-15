package com.ciet.demo_learn.service;

import com.ciet.demo_learn.dto.EvaluatorItemDto;
import com.ciet.demo_learn.dto.EvaluatorListResponse;
import com.ciet.demo_learn.enums.EvaluatorSource;
import com.ciet.demo_learn.enums.EvaluatorStatus;
import com.ciet.demo_learn.enums.EvaluatorType;
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
import java.time.temporal.ChronoUnit;
import java.util.List;
import java.util.UUID;

@Service
@Transactional(readOnly = true)
public class CycleValidationService {

    private static final int GUEST_LIMIT = 10;

    private final CycleSubjectService cycleSubjectService;
    private final CycleEvaluatorService cycleEvaluatorService;
    private final UserService userService;
    private final CycleService cycleService;
    private final NotificationService notificationService;

    public CycleValidationService(
            CycleSubjectService cycleSubjectService,
            CycleEvaluatorService cycleEvaluatorService,
            UserService userService,
            CycleService cycleService,
            NotificationService notificationService) {
        this.cycleSubjectService = cycleSubjectService;
        this.cycleEvaluatorService = cycleEvaluatorService;
        this.userService = userService;
        this.cycleService = cycleService;
        this.notificationService = notificationService;
    }

    public EvaluatorListResponse getEvaluatorsForSubject(UUID cycleSubjectId, UUID requestingUserId) {
        CycleSubject cycleSubject = cycleSubjectService.findByIdAndSubjectUserId(cycleSubjectId, requestingUserId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND));

        if (!requestingUserId.equals(cycleSubject.getSubjectUser().getId())) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN);
        }

        validateInValidationPhase(cycleSubject);
        return buildEvaluatorListResponse(cycleSubject);
    }

    public EvaluatorListResponse getEvaluatorsForPdm(UUID cycleSubjectId, UUID subjectUserId, UUID pdmId) {
        if (!userService.existsByIdAndPdmId(subjectUserId, pdmId)) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN);
        }

        CycleSubject cycleSubject = cycleSubjectService.findByIdAndSubjectUserId(cycleSubjectId, subjectUserId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND));

        validateInValidationPhase(cycleSubject);
        return buildEvaluatorListResponse(cycleSubject);
    }

    @Transactional
    public EvaluatorItemDto addEvaluatorBySubject(UUID cycleSubjectId, UUID newEvaluatorUserId, UUID requestingUserId) {
        CycleSubject cycleSubject = cycleSubjectService.findByIdAndSubjectUserId(cycleSubjectId, requestingUserId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND));

        validateInValidationPhase(cycleSubject);
        validateDeadlineNotExpired(cycleSubject);

        User newEvaluator = userService.findById(newEvaluatorUserId)
                .filter(u -> Boolean.TRUE.equals(u.getActive()))
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND));

        validateNotMandatoryEvaluator(newEvaluatorUserId, requestingUserId, cycleSubject);
        validateNotAlreadyInList(newEvaluatorUserId, cycleSubjectId);
        validateGuestLimitNotReached(cycleSubjectId);

        User addedByUser = new User();
        addedByUser.setId(requestingUserId);

        CycleEvaluator evaluator = buildGuestEvaluator(cycleSubject, newEvaluator, EvaluatorSource.MANUAL_SUBJECT, addedByUser);
        CycleEvaluator saved = cycleEvaluatorService.save(evaluator);
        return toDto(saved);
    }

    @Transactional
    public EvaluatorItemDto addEvaluatorByPdm(UUID cycleSubjectId, UUID newEvaluatorUserId, UUID subjectUserId, UUID pdmId) {
        if (!userService.existsByIdAndPdmId(subjectUserId, pdmId)) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN);
        }

        CycleSubject cycleSubject = cycleSubjectService.findByIdAndSubjectUserId(cycleSubjectId, subjectUserId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND));

        validateInValidationPhase(cycleSubject);
        validateDeadlineNotExpired(cycleSubject);

        User newEvaluator = userService.findById(newEvaluatorUserId)
                .filter(u -> Boolean.TRUE.equals(u.getActive()))
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND));

        validateNotMandatoryEvaluator(newEvaluatorUserId, subjectUserId, cycleSubject);
        validateNotAlreadyInList(newEvaluatorUserId, cycleSubjectId);
        validateGuestLimitNotReached(cycleSubjectId);

        User addedByUser = new User();
        addedByUser.setId(pdmId);

        CycleEvaluator evaluator = buildGuestEvaluator(cycleSubject, newEvaluator, EvaluatorSource.MANUAL_PDM, addedByUser);
        CycleEvaluator saved = cycleEvaluatorService.save(evaluator);
        return toDto(saved);
    }

    @Transactional
    public void removeEvaluator(UUID cycleSubjectId, UUID evaluatorId, UUID requestingUserId) {
        CycleSubject cycleSubject = cycleSubjectService.findByIdAndSubjectUserId(cycleSubjectId, requestingUserId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.FORBIDDEN));

        CycleEvaluator evaluator = cycleEvaluatorService.findByIdAndCycleSubjectId(evaluatorId, cycleSubjectId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND));

        validateDeadlineNotExpired(cycleSubject);

        if (Boolean.TRUE.equals(evaluator.getIsMandatory())) {
            throw new CfConflictException("CANNOT_REMOVE_MANDATORY_EVALUATOR");
        }

        evaluator.setDeletedAt(Instant.now());
        cycleEvaluatorService.save(evaluator);
    }

    @Transactional
    public void confirmEvaluators(UUID cycleSubjectId, UUID requestingUserId) {
        CycleSubject cycleSubject = cycleSubjectService.findByIdAndSubjectUserId(cycleSubjectId, requestingUserId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND));

        validateInValidationPhase(cycleSubject);
        validateDeadlineNotExpired(cycleSubject);

        Instant now = Instant.now();
        cycleSubject.setStatus("COLLECTING");
        cycleSubject.setCollectionStartAt(now);
        cycleSubject.setValidatedAt(now);
        cycleSubjectService.save(cycleSubject);

        Cycle cycle = cycleSubject.getCycle();
        cycle.setStatus(com.ciet.demo_learn.enums.CycleStatus.COLLECTING);
        cycle.setCollectionStartAt(now);
        cycle.setCollectionDeadline(now.plus(10, ChronoUnit.DAYS));
        cycleService.save(cycle);

        notificationService.notifyEvaluatorsSelected(cycleSubjectId);
    }

    private EvaluatorListResponse buildEvaluatorListResponse(CycleSubject cycleSubject) {
        UUID cycleSubjectId = cycleSubject.getId();
        List<CycleEvaluator> evaluators = cycleEvaluatorService.findByCycleSubjectId(cycleSubjectId);
        int guestCount = cycleEvaluatorService.countGuestsByCycleSubjectId(cycleSubjectId);

        List<EvaluatorItemDto> dtos = evaluators.stream().map(this::toDto).toList();

        return new EvaluatorListResponse(
                cycleSubjectId,
                cycleSubject.getValidationDeadline(),
                cycleSubject.getValidatedAt(),
                dtos,
                guestCount,
                GUEST_LIMIT
        );
    }

    private EvaluatorItemDto toDto(CycleEvaluator evaluator) {
        User evaluatorUser = evaluator.getEvaluatorUser();
        User addedBy = evaluator.getAddedBy();
        return new EvaluatorItemDto(
                evaluator.getId(),
                evaluatorUser.getId(),
                evaluatorUser.getName(),
                evaluatorUser.getEmail(),
                evaluator.getEvaluatorType().name(),
                Boolean.TRUE.equals(evaluator.getIsMandatory()),
                evaluator.getSource() != null ? evaluator.getSource().name() : null,
                addedBy != null ? addedBy.getId() : null
        );
    }

    private CycleEvaluator buildGuestEvaluator(CycleSubject cycleSubject, User evaluatorUser, EvaluatorSource source, User addedBy) {
        CycleEvaluator evaluator = new CycleEvaluator();
        evaluator.setCycleSubject(cycleSubject);
        evaluator.setEvaluatorUser(evaluatorUser);
        evaluator.setEvaluatorType(EvaluatorType.PEER);
        evaluator.setIsMandatory(false);
        evaluator.setStatus(EvaluatorStatus.PENDING);
        evaluator.setSource(source);
        evaluator.setAddedBy(addedBy);
        return evaluator;
    }

    private void validateInValidationPhase(CycleSubject cycleSubject) {
        if (!"VALIDATING_EVALUATORS".equals(cycleSubject.getStatus())) {
            throw new CfConflictException("NOT_IN_VALIDATION_PHASE");
        }
    }

    private void validateDeadlineNotExpired(CycleSubject cycleSubject) {
        Instant deadline = cycleSubject.getValidationDeadline();
        if (deadline != null && !Instant.now().isBefore(deadline)) {
            throw new CfConflictException("VALIDATION_DEADLINE_EXPIRED");
        }
    }

    private void validateNotMandatoryEvaluator(UUID newEvaluatorUserId, UUID subjectUserId, CycleSubject cycleSubject) {
        if (newEvaluatorUserId.equals(subjectUserId)) {
            throw new CfConflictException("EVALUATOR_ALREADY_MANDATORY");
        }

        UUID pdmId = userService.findPdmIdByUserId(subjectUserId).orElse(null);
        if (pdmId != null && newEvaluatorUserId.equals(pdmId)) {
            throw new CfConflictException("EVALUATOR_ALREADY_MANDATORY");
        }
    }

    private void validateNotAlreadyInList(UUID newEvaluatorUserId, UUID cycleSubjectId) {
        if (cycleEvaluatorService.existsByEvaluatorUserIdAndCycleSubjectId(newEvaluatorUserId, cycleSubjectId)) {
            throw new CfConflictException("EVALUATOR_ALREADY_IN_LIST");
        }
    }

    private void validateGuestLimitNotReached(UUID cycleSubjectId) {
        if (cycleEvaluatorService.countGuestsByCycleSubjectId(cycleSubjectId) >= GUEST_LIMIT) {
            throw new CfConflictException("GUEST_LIMIT_REACHED");
        }
    }
}
