package com.ciet.demo_learn.mapper;

import com.ciet.demo_learn.dto.ActiveCycleDto;
import com.ciet.demo_learn.enums.CycleType;
import com.ciet.demo_learn.model.CycleSubject;
import org.mapstruct.Mapper;
import org.mapstruct.Mapping;
import org.mapstruct.Named;

@Mapper(componentModel = "spring")
public interface CycleMapper {

    @Mapping(target = "cycleSubjectId", source = "cs.id")
    @Mapping(target = "cycleId", source = "cs.cycle.id")
    @Mapping(target = "cycleType", source = "cs.cycle.cycleType", qualifiedByName = "cycleTypeToString")
    @Mapping(target = "cycleName", source = "cs.cycle.name")
    @Mapping(target = "currentPhase", source = "cs.status")
    @Mapping(target = "collectionDeadline", source = "collectionDeadline")
    @Mapping(target = "daysRemaining", source = "daysRemaining")
    @Mapping(target = "responseRate", source = "responseRate")
    @Mapping(target = "totalEvaluators", source = "totalEvaluators")
    @Mapping(target = "respondedEvaluators", source = "respondedEvaluators")
    @Mapping(target = "selfEvaluationStatus", source = "selfEvaluationStatus")
    ActiveCycleDto toDto(
            CycleSubject cs,
            String collectionDeadline,
            Integer daysRemaining,
            double responseRate,
            int totalEvaluators,
            int respondedEvaluators,
            String selfEvaluationStatus
    );

    @Named("cycleTypeToString")
    default String cycleTypeToString(CycleType cycleType) {
        return cycleType != null ? cycleType.name() : null;
    }
}