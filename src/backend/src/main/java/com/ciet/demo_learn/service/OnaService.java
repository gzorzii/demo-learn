package com.ciet.demo_learn.service;

import com.ciet.demo_learn.enums.EvaluatorSource;
import com.ciet.demo_learn.enums.EvaluatorStatus;
import com.ciet.demo_learn.enums.EvaluatorType;
import com.ciet.demo_learn.model.CycleEvaluator;
import com.ciet.demo_learn.model.CycleSubject;
import com.ciet.demo_learn.model.User;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.ArrayList;
import java.util.List;
import java.util.UUID;

@Service
@Transactional
public class OnaService {

    private static final int ONA_GUEST_TARGET = 3;

    private final UserService userService;
    private final CycleEvaluatorService cycleEvaluatorService;

    public OnaService(UserService userService, CycleEvaluatorService cycleEvaluatorService) {
        this.userService = userService;
        this.cycleEvaluatorService = cycleEvaluatorService;
    }

    public void suggestAndCreateEvaluators(CycleSubject cycleSubject, UUID subjectUserId, UUID pdmId) {
        if (pdmId == null) {
            return;
        }

        int currentGuestCount = cycleEvaluatorService.countGuestsByCycleSubjectId(cycleSubject.getId());
        int slotsAvailable = ONA_GUEST_TARGET - currentGuestCount;
        if (slotsAvailable <= 0) {
            return;
        }

        List<UUID> excludedIds = new ArrayList<>();
        excludedIds.add(subjectUserId);
        excludedIds.add(pdmId);

        List<User> candidates = userService.findActiveByPdmIdExcluding(pdmId, excludedIds);

        List<User> eligible = candidates.stream()
                .filter(u -> !cycleEvaluatorService.existsByEvaluatorUserIdAndCycleSubjectId(u.getId(), cycleSubject.getId()))
                .limit(slotsAvailable)
                .toList();

        for (User candidate : eligible) {
            CycleEvaluator evaluator = new CycleEvaluator();
            evaluator.setCycleSubject(cycleSubject);
            evaluator.setEvaluatorUser(candidate);
            evaluator.setEvaluatorType(EvaluatorType.PEER);
            evaluator.setIsMandatory(false);
            evaluator.setStatus(EvaluatorStatus.PENDING);
            evaluator.setSource(EvaluatorSource.ONA_SUGGESTION);
            evaluator.setAddedBy(null);
            cycleEvaluatorService.save(evaluator);
        }
    }
}
